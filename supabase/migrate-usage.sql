-- ----------------------------------------------------------------------------
-- 13. Storage / database usage for the admin dashboard.
--     Supabase does not expose the plan quota to the browser (that needs the
--     Management API and a personal token), but what is *used* can be counted
--     here: bytes in the `media` bucket and the size of the database.
--     Admin-only; anonymous callers get an error.
--
--     Safe to run on an existing database. Also included in schema.sql.
-- ----------------------------------------------------------------------------
create or replace function public.usage_stats()
returns json
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  media_bytes bigint;
  media_files bigint;
  db_bytes    bigint;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select coalesce(sum((o.metadata->>'size')::bigint), 0), count(*)
    into media_bytes, media_files
    from storage.objects o
   where o.bucket_id = 'media';

  select pg_database_size(current_database()) into db_bytes;

  return json_build_object(
    'media_bytes', media_bytes,
    'media_files', media_files,
    'db_bytes',    db_bytes
  );
end;
$$;

revoke all on function public.usage_stats() from public;
grant execute on function public.usage_stats() to authenticated;
