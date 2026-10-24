alter table public.companies
  add column address text not null default ''
  check (char_length(address) <= 500);

grant insert(address), update(address) on public.companies to authenticated;

notify pgrst, 'reload schema';
