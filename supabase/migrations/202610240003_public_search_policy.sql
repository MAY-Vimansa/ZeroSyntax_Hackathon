-- A public policy must not directly read a private table as the anonymous caller.
create function public.has_application(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.applications where job_id=target and worker_id=auth.uid());
$$;
revoke execute on function public.has_application(uuid) from public;
grant execute on function public.has_application(uuid) to anon,authenticated;
drop policy jobs_read on public.jobs;
create policy jobs_read on public.jobs for select using(
 (status='PUBLISHED' and application_cutoff_at>now() and approved_count<required_workers)
 or created_by=auth.uid() or public.has_application(id)
);
