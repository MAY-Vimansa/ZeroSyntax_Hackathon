-- Administration is provisioned by trusted operators, never signup metadata.
create table public.admin_audit_log (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references public.profiles(id),
 action text not null check(action in ('VERIFY_COMPANY','UNVERIFY_COMPANY','CLOSE_JOB')),
 target_id uuid not null,
 target_name text not null,
 previous_status text not null,
 next_status text not null,
 note text not null check(length(note) between 10 and 500),
 created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
create policy admin_audit_read on public.admin_audit_log for select to authenticated
 using(public.my_role()='ADMIN');

create or replace function public.admin_dashboard(period_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; since_at timestamptz;
begin
 if auth.uid() is null or public.my_role() is distinct from 'ADMIN' then raise exception 'NOT_ALLOWED'; end if;
 if period_days is null or period_days not in (7,30) then raise exception 'INVALID_PERIOD'; end if;
 since_at := ((now() at time zone 'Asia/Colombo')::date - (period_days-1))::timestamp at time zone 'Asia/Colombo';
 select jsonb_build_object(
  'generated_at',now(), 'period_days',period_days,
  'totals',jsonb_build_object(
   'workers',(select count(*) from public.profiles where role='WORKER'),
   'new_workers',(select count(*) from public.profiles where role='WORKER' and created_at>=since_at),
   'employers',(select count(*) from public.profiles where role='EMPLOYER'),
   'new_employers',(select count(*) from public.profiles where role='EMPLOYER' and created_at>=since_at),
   'companies',(select count(*) from public.companies),
   'unverified_companies',(select count(*) from public.companies where verification_status<>'VERIFIED'),
   'active_jobs',(select count(*) from public.jobs where status='PUBLISHED' and application_cutoff_at>now() and approved_count<required_workers),
   'jobs',(select count(*) from public.jobs),
   'applications',(select count(*) from public.applications),
   'period_applications',(select count(*) from public.applications where applied_at>=since_at),
   'pending_applications',(select count(*) from public.applications where status='PENDING'),
   'approved_applications',(select count(*) from public.applications where status='APPROVED')
  ),
  'trend',coalesce((select jsonb_agg(jsonb_build_object(
   'day',d::date,
   'workers',(select count(*) from public.profiles p where p.role='WORKER' and (p.created_at at time zone 'Asia/Colombo')::date=d::date),
   'employers',(select count(*) from public.profiles p where p.role='EMPLOYER' and (p.created_at at time zone 'Asia/Colombo')::date=d::date),
   'applications',(select count(*) from public.applications a where (a.applied_at at time zone 'Asia/Colombo')::date=d::date)
  ) order by d) from generate_series((now() at time zone 'Asia/Colombo')::date-(period_days-1),(now() at time zone 'Asia/Colombo')::date,interval '1 day') d),'[]'::jsonb),
  'application_statuses',(select jsonb_build_object(
   'PENDING',count(*) filter(where status='PENDING'),
   'APPROVED',count(*) filter(where status='APPROVED'),
   'REJECTED',count(*) filter(where status='REJECTED'),
   'WITHDRAWN',count(*) filter(where status='WITHDRAWN')
  ) from public.applications where applied_at>=since_at),
  'users',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id) from (
   select id,display_name,role,city,district,skills,availability,bio,created_at from public.profiles order by created_at desc,id limit 200
  ) p),'[]'::jsonb),
  'companies',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc,c.id) from (
   select c.*,p.display_name as owner_name from public.companies c join public.profiles p on p.id=c.owner_id order by c.created_at desc,c.id limit 200
  ) c),'[]'::jsonb),
  'jobs',coalesce((select jsonb_agg(to_jsonb(j) order by j.created_at desc,j.id) from (
   select j.id,j.title,j.city,j.district,j.category,j.daily_wage_lkr,j.shift_start_at,j.shift_end_at,j.application_cutoff_at,j.required_workers,j.approved_count,j.status,j.created_at,c.name as company_name
   from public.jobs j join public.companies c on c.id=j.company_id order by j.created_at desc,j.id limit 200
  ) j),'[]'::jsonb),
  'applications',coalesce((select jsonb_agg(to_jsonb(a) order by a.applied_at desc,a.id) from (
   select a.id,a.status,a.applied_at,p.display_name as worker_name,j.title as job_title,c.name as company_name
   from public.applications a join public.profiles p on p.id=a.worker_id join public.jobs j on j.id=a.job_id join public.companies c on c.id=j.company_id order by a.applied_at desc,a.id limit 200
  ) a),'[]'::jsonb),
  'activity',coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at desc,l.id) from (
   select l.*,p.display_name as actor_name from public.admin_audit_log l join public.profiles p on p.id=l.actor_id order by l.created_at desc,l.id limit 200
  ) l),'[]'::jsonb)
 ) into result;
 return result;
end $$;

create or replace function public.admin_moderate(target uuid, operation text, expected_status text, review_note text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old_status text; new_status text; item_name text;
begin
 if auth.uid() is null or public.my_role() is distinct from 'ADMIN' then raise exception 'NOT_ALLOWED'; end if;
 if review_note is null or length(trim(review_note)) not between 10 and 500 then raise exception 'INVALID_NOTE'; end if;
 if operation in ('VERIFY_COMPANY','UNVERIFY_COMPANY') then
  select verification_status,name into old_status,item_name from public.companies where id=target for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  new_status := case when operation='VERIFY_COMPANY' then 'VERIFIED' else 'UNVERIFIED' end;
  if old_status is distinct from expected_status or old_status=new_status then raise exception 'STATE_CHANGED'; end if;
  update public.companies set verification_status=new_status where id=target;
 elsif operation='CLOSE_JOB' then
  select status,title into old_status,item_name from public.jobs where id=target for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if old_status is distinct from expected_status or old_status<>'PUBLISHED' then raise exception 'STATE_CHANGED'; end if;
  new_status := 'CLOSED';
  update public.jobs set status=new_status,updated_at=now() where id=target;
 else raise exception 'INVALID_OPERATION';
 end if;
 insert into public.admin_audit_log(actor_id,action,target_id,target_name,previous_status,next_status,note)
 values(auth.uid(),operation,target,item_name,old_status,new_status,trim(review_note));
 return jsonb_build_object('status',new_status);
end $$;
revoke all on function public.admin_dashboard(integer),public.admin_moderate(uuid,text,text,text) from public,anon;
grant execute on function public.admin_dashboard(integer),public.admin_moderate(uuid,text,text,text) to authenticated;
