-- ----------------------------------------------------------------------------
-- 15. get_site_content() — bundles the public site's load into one call.
--
--     src/content/publicApi.js used to issue 8 separate anonymous GETs on
--     every visit (projects, project_media, site_media, site_settings,
--     capability_decks, capability_items, certifications, social_links).
--     Each one is small, but the browser can only run so many to the same
--     host in parallel, and every one of them pays a fresh TLS + Supabase
--     round trip — on a slow connection those queue up and delay the
--     homepage's largest paint. This function does the same 8 reads inside
--     Postgres and hands them back as one JSON object, so the site now makes
--     a single request instead.
--
--     SECURITY INVOKER (the default — not restated below): this runs with
--     the privileges of whoever calls it (the anon key, same as today), so
--     the existing "public read" row-level-security policies below still
--     decide what comes back. Nothing here can read more than a plain
--     SELECT from the anon key already could.
--
--     site_settings / capability_decks / capability_items / certifications /
--     social_links are wrapped in `to_regclass(...) is not null` + dynamic
--     EXECUTE, because a static query that merely mentions a table which
--     doesn't exist yet fails to plan at all — even inside a branch that
--     never runs. That mirrors the `.catch(() => [])` fallback the old
--     client-side code used for the same five "newer" tables, so a database
--     that hasn't run their migrations yet still returns the rest of the
--     site instead of erroring out. projects / project_media / site_media
--     are the three original tables and are always assumed present.
--
--     Safe to run on an existing database (`create or replace`).
--     Already included at the bottom of schema.sql for fresh installs.
-- ----------------------------------------------------------------------------
create or replace function public.get_site_content()
returns json
language plpgsql
stable
as $$
declare
  site_settings_json    json := '[]'::json;
  capability_decks_json json := '[]'::json;
  capability_items_json json := '[]'::json;
  certifications_json   json := '[]'::json;
  social_links_json     json := '[]'::json;
  result json;
begin
  if to_regclass('public.site_settings') is not null then
    execute 'select coalesce(json_agg(t), ''[]''::json) from public.site_settings t'
      into site_settings_json;
  end if;

  if to_regclass('public.capability_decks') is not null then
    execute 'select coalesce(json_agg(t order by t.sort_order asc), ''[]''::json) from public.capability_decks t'
      into capability_decks_json;
  end if;

  if to_regclass('public.capability_items') is not null then
    execute 'select coalesce(json_agg(t order by t.sort_order asc), ''[]''::json) from public.capability_items t'
      into capability_items_json;
  end if;

  if to_regclass('public.certifications') is not null then
    execute 'select coalesce(json_agg(t order by t.sort_order asc), ''[]''::json) from public.certifications t'
      into certifications_json;
  end if;

  if to_regclass('public.social_links') is not null then
    execute 'select coalesce(json_agg(t order by t.sort_order asc), ''[]''::json) from public.social_links t'
      into social_links_json;
  end if;

  select json_build_object(
    'projects', (
      select coalesce(json_agg(p order by p.sort_order asc, p.created_at asc), '[]'::json)
      from public.projects p
      where p.published = true
    ),
    'project_media', (
      select coalesce(json_agg(m order by m.sort_order asc, m.created_at asc), '[]'::json)
      from public.project_media m
    ),
    'site_media', (
      select coalesce(json_agg(s), '[]'::json)
      from public.site_media s
    ),
    'site_settings', site_settings_json,
    'capability_decks', capability_decks_json,
    'capability_items', capability_items_json,
    'certifications', certifications_json,
    'social_links', social_links_json
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_site_content() from public;
grant execute on function public.get_site_content() to anon, authenticated;
