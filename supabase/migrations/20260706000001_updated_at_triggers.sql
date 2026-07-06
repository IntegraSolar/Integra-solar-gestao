-- Migration: auto-update updated_at via trigger
-- Apply in Supabase Dashboard → SQL Editor, or via supabase db push

-- Shared trigger function
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Helper macro: create trigger only if not already present
do $$
declare
  tbl text;
  tables text[] := array[
    'clients',
    'leads',
    'proposals',
    'client_contracts',
    'client_installments',
    'client_projects',
    'client_purchases',
    'client_commissions',
    'client_deliveries',
    'client_obras',
    'client_obra_deliveries',
    'client_pos_obra',
    'pipeline_stages',
    'tasks',
    'org_config',
    'organizations',
    'profiles'
  ];
begin
  foreach tbl in array tables loop
    -- Only add trigger if the table has an updated_at column
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = tbl
        and column_name = 'updated_at'
    ) then
      execute format(
        'drop trigger if exists trg_%s_updated_at on public.%I;
         create trigger trg_%s_updated_at
           before update on public.%I
           for each row execute function public.set_updated_at();',
        tbl, tbl, tbl, tbl
      );
    end if;
  end loop;
end;
$$;
