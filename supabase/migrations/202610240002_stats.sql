create function public.marketplace_stats() returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object('jobs',count(*),'districts',count(distinct district),'companies',count(distinct company_id)) from public.jobs where status='PUBLISHED' and application_cutoff_at>now() and approved_count<required_workers;
$$;
revoke execute on function public.marketplace_stats() from public;
grant execute on function public.marketplace_stats() to anon,authenticated;
