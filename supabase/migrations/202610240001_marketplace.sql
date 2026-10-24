create extension if not exists postgis with schema extensions;

create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 role text not null default 'WORKER' check (role in ('WORKER','EMPLOYER','ADMIN')),
 display_name text not null default '', city text not null default '', district text not null default '',
 bio text not null default '', skills text[] not null default '{}', availability text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.companies (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references public.profiles on delete cascade,
 name text not null, description text not null default '', contact_email text not null,
 city text not null, district text not null,
 verification_status text not null default 'UNVERIFIED' check(verification_status in ('UNVERIFIED','PENDING','VERIFIED')),
 created_at timestamptz not null default now()
);
create table public.jobs (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies on delete cascade,
 created_by uuid not null references public.profiles on delete cascade,
 title text not null, description text not null, category text not null check(category in ('factory','warehouse','restaurant','hospitality','retail','events','logistics','office','other')),
 required_skills text[] not null default '{}', daily_wage_lkr numeric(12,2) not null check(daily_wage_lkr>0),
 shift_start_at timestamptz not null, shift_end_at timestamptz not null,
 application_cutoff_at timestamptz not null,
 required_workers integer not null check(required_workers between 1 and 10000),
 approved_count integer not null default 0 check(approved_count>=0 and approved_count<=required_workers),
 location_name text not null, city text not null, district text not null,
 latitude double precision not null check(latitude between -90 and 90), longitude double precision not null check(longitude between -180 and 180),
 location_geog extensions.geography(Point,4326) generated always as (extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)::extensions.geography) stored,
 payment_terms text not null default '', status text not null default 'DRAFT' check(status in ('DRAFT','PUBLISHED','CLOSED','COMPLETED')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(shift_end_at>shift_start_at), check(application_cutoff_at<=shift_start_at)
);
create table public.applications (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs on delete cascade,
 worker_id uuid not null references public.profiles on delete cascade,
 status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED','WITHDRAWN')),
 applied_at timestamptz not null default now(), updated_at timestamptz not null default now(), approved_at timestamptz,
 unique(job_id,worker_id)
);
create index jobs_geo_idx on public.jobs using gist(location_geog);
create index jobs_availability_idx on public.jobs(status,application_cutoff_at);
create index jobs_company_idx on public.jobs(company_id);
create index applications_worker_idx on public.applications(worker_id);
create index applications_job_idx on public.applications(job_id);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,role,display_name) values(new.id,case when new.raw_user_meta_data->>'role'='EMPLOYER' then 'EMPLOYER' else 'WORKER' end,left(coalesce(new.raw_user_meta_data->>'display_name',''),100));
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create function public.my_role() returns text language sql stable security definer set search_path='' as $$ select role from public.profiles where id=auth.uid() $$;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or exists(select 1 from public.applications a join public.jobs j on j.id=a.job_id join public.companies c on c.id=j.company_id where a.worker_id=profiles.id and c.owner_id=auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy companies_read on public.companies for select using(true);
create policy companies_insert on public.companies for insert to authenticated with check(owner_id=auth.uid() and public.my_role()='EMPLOYER' and verification_status='UNVERIFIED');
create policy companies_update on public.companies for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy jobs_read on public.jobs for select using(
 (status='PUBLISHED' and application_cutoff_at>now() and approved_count<required_workers)
 or created_by=auth.uid()
 or exists(select 1 from public.applications a where a.job_id=jobs.id and a.worker_id=auth.uid())
);
-- Security-definer helper avoids a jobs/applications policy recursion.
create function public.owns_job(target uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.jobs j join public.companies c on c.id=j.company_id where j.id=target and c.owner_id=auth.uid()) $$;
create policy applications_read on public.applications for select to authenticated using(worker_id=auth.uid() or public.owns_job(job_id));
create policy jobs_insert on public.jobs for insert to authenticated with check(created_by=auth.uid() and exists(select 1 from public.companies c where c.id=company_id and c.owner_id=auth.uid()) and approved_count=0);
create policy jobs_update on public.jobs for update to authenticated using(public.owns_job(id)) with check(public.owns_job(id));

revoke all on public.profiles,public.companies,public.jobs,public.applications from anon,authenticated;
grant select on public.companies,public.jobs to anon,authenticated;
grant select on public.profiles,public.applications to authenticated;
grant update(display_name,city,district,bio,skills,availability,updated_at) on public.profiles to authenticated;
grant insert(owner_id,name,description,contact_email,city,district) on public.companies to authenticated;
grant update(name,description,contact_email,city,district) on public.companies to authenticated;
grant insert(company_id,created_by,title,description,category,required_skills,daily_wage_lkr,shift_start_at,shift_end_at,application_cutoff_at,required_workers,location_name,city,district,latitude,longitude,payment_terms,status) on public.jobs to authenticated;
grant update(title,description,category,required_skills,daily_wage_lkr,shift_start_at,shift_end_at,application_cutoff_at,required_workers,location_name,city,district,latitude,longitude,payment_terms,status,updated_at) on public.jobs to authenticated;

create function public.apply_job(target uuid) returns public.applications language plpgsql security definer set search_path='' as $$
declare j public.jobs; a public.applications;
begin
 if auth.uid() is null or public.my_role()<>'WORKER' then raise exception 'WORKER_REQUIRED'; end if;
 select * into j from public.jobs where id=target for update;
 if not found or j.status<>'PUBLISHED' or j.application_cutoff_at<=now() or j.approved_count>=j.required_workers then raise exception 'JOB_UNAVAILABLE'; end if;
 select * into a from public.applications where job_id=target and worker_id=auth.uid();
 if found then return a; end if;
 insert into public.applications(job_id,worker_id) values(target,auth.uid()) returning * into a;
 return a;
end $$;
create function public.withdraw_application(target uuid) returns public.applications language plpgsql security definer set search_path='' as $$
declare a public.applications; j public.jobs;
begin
 select * into a from public.applications where id=target and worker_id=auth.uid();
 if not found then raise exception 'NOT_ALLOWED'; end if;
 select * into j from public.jobs where id=a.job_id for update;
 select * into a from public.applications where id=target for update;
 if a.status='WITHDRAWN' then return a; end if;
 if a.status<>'PENDING' or j.application_cutoff_at<=now() then raise exception 'WITHDRAWAL_UNAVAILABLE'; end if;
 update public.applications set status='WITHDRAWN',updated_at=now() where id=target returning * into a;
 return a;
end $$;
create function public.decide_application(target uuid,decision text) returns public.applications language plpgsql security definer set search_path='' as $$
declare a public.applications; j public.jobs;
begin
 if decision not in ('APPROVED','REJECTED') then raise exception 'INVALID_DECISION'; end if;
 select * into a from public.applications where id=target;
 if not found or not public.owns_job(a.job_id) then raise exception 'NOT_ALLOWED'; end if;
 select * into j from public.jobs where id=a.job_id for update;
 select * into a from public.applications where id=target for update;
 if a.status=decision then return a; end if;
 if a.status<>'PENDING' then raise exception 'APPLICATION_ALREADY_DECIDED'; end if;
 if j.status<>'PUBLISHED' or j.application_cutoff_at<=now() then raise exception 'JOB_UNAVAILABLE'; end if;
 if decision='APPROVED' then
  if j.approved_count>=j.required_workers then raise exception 'JOB_FULL'; end if;
  update public.jobs set approved_count=approved_count+1,updated_at=now() where id=j.id;
 end if;
 update public.applications set status=decision,updated_at=now(),approved_at=case when decision='APPROVED' then now() else null end where id=target returning * into a;
 return a;
end $$;

create function public.search_available_jobs(filters jsonb default '{}') returns jsonb language sql stable security invoker set search_path='' as $$
with candidates as (
 select j.*,jsonb_build_object('id',c.id,'name',c.name,'verification_status',c.verification_status,'contact_email',c.contact_email) as company,
 case when filters ? 'lat' and filters ? 'lng' then extensions.st_distance(j.location_geog,extensions.st_setsrid(extensions.st_makepoint((filters->>'lng')::float8,(filters->>'lat')::float8),4326)::extensions.geography)/1000 else null end as distance_km
 from public.jobs j join public.companies c on c.id=j.company_id
 where j.status='PUBLISHED' and j.application_cutoff_at>now() and j.approved_count<j.required_workers
 and (coalesce(filters->>'query','')='' or j.title ilike '%'||(filters->>'query')||'%' or j.description ilike '%'||(filters->>'query')||'%')
 and (coalesce(filters->>'category','')='' or j.category=filters->>'category')
 and (coalesce(filters->>'district','')='' or lower(j.district)=lower(filters->>'district'))
 and (coalesce(filters->>'city','')='' or lower(j.city)=lower(filters->>'city'))
 and (coalesce(filters->>'minWage','')='' or j.daily_wage_lkr>=(filters->>'minWage')::numeric)
 and (coalesce(filters->>'date','')='' or (j.shift_start_at at time zone 'Asia/Colombo')::date=(filters->>'date')::date)
), eligible as (
 select * from candidates where distance_km is null or distance_km<=coalesce((filters->>'radiusKm')::float8,10)
), page as (
 select * from eligible order by
 case when filters->>'sort'='wage' then daily_wage_lkr end desc,
 case when coalesce(filters->>'sort','nearest')='nearest' then distance_km end asc nulls last,
 shift_start_at asc,id asc
 limit least(greatest(coalesce((filters->>'limit')::int,12),1),50)
 offset (greatest(coalesce((filters->>'page')::int,1),1)-1)*least(greatest(coalesce((filters->>'limit')::int,12),1),50)
) select jsonb_build_object('jobs',coalesce((select jsonb_agg(to_jsonb(page)-'location_geog') from page),'[]'::jsonb),'total',(select count(*) from eligible))
$$;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.my_role(),public.owns_job(uuid),public.apply_job(uuid),public.withdraw_application(uuid),public.decide_application(uuid,text),public.search_available_jobs(jsonb) from public;
grant execute on function public.my_role(),public.owns_job(uuid),public.apply_job(uuid),public.withdraw_application(uuid),public.decide_application(uuid,text) to authenticated;
grant execute on function public.search_available_jobs(jsonb) to anon,authenticated;
