-- Allow logging XML correction actions (xml_fix) in validation_logs.
-- Keep the canonical check-constraint name:
--   validation_logs_validation_mode_check

update public.validation_logs
set validation_mode = lower(validation_mode)
where validation_mode is not null;

update public.validation_logs
set validation_mode = 'manual'
where validation_mode is null
   or btrim(validation_mode) = ''
   or validation_mode not in ('manual', 'xml', 'xml_fix');

do $$
declare
  rec record;
begin
  -- Drop any legacy CHECK constraints bound to the validation_mode column.
  for rec in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join unnest(c.conkey) as k(attnum) on true
    join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
    where n.nspname = 'public'
      and t.relname = 'validation_logs'
      and c.contype = 'c'
      and a.attname = 'validation_mode'
  loop
    execute format(
      'alter table public.validation_logs drop constraint if exists %I',
      rec.conname
    );
  end loop;
end
$$;

alter table public.validation_logs
  add constraint validation_logs_validation_mode_check
  check (validation_mode in ('manual', 'xml', 'xml_fix'));
