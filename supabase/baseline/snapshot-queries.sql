-- MIG-001 baseline: the read-only queries that produced this snapshot.
-- Each returns the exact text stored in the named file plus its md5, so the
-- snapshot can be re-verified against any database at any time.
-- Reference only. This file is never applied as a migration.

-- 01_columns.txt
with t as (select string_agg(c.table_name || '.' || c.column_name || ' ' || case when c.data_type='USER-DEFINED' then c.udt_name when c.data_type='character varying' then 'varchar(' || coalesce(c.character_maximum_length::text,'') || ')' when c.data_type='ARRAY' then c.udt_name else c.data_type end || case when c.is_nullable='NO' then ' not null' else '' end || coalesce(' default ' || c.column_default, ''), E'\n' order by c.table_name, c.ordinal_position) || E'\n' as body
from information_schema.columns c join pg_tables pt on pt.schemaname='public' and pt.tablename=c.table_name where c.table_schema='public')
select md5(body) as md5, length(body) as len, body from t;

-- 02_objects.txt
with parts as (
 select 1 o, '# constraints' l union all
 select 2, conrelid::regclass::text || ' ' || conname || ' ' || pg_get_constraintdef(oid) from pg_constraint where connamespace='public'::regnamespace and conrelid<>0
 union all select 3, '# indexes' union all
 select 4, indexdef from pg_indexes where schemaname='public'
 union all select 5, '# sequences' union all
 select 6, s.sequencename || ' ' || s.data_type::text || ' owned_by=' || coalesce((select d.refobjid::regclass::text || '.' || a.attname from pg_depend d join pg_attribute a on a.attrelid=d.refobjid and a.attnum=d.refobjsubid where d.objid=(('public.'||s.sequencename)::regclass) and d.deptype='a' limit 1),'-') from pg_sequences s where s.schemaname='public'
 union all select 7, '# enums' union all
 select 8, t.typname || ' = ' || string_agg(e.enumlabel, ',' order by e.enumsortorder) from pg_type t join pg_enum e on e.enumtypid=t.oid where t.typnamespace='public'::regnamespace group by t.typname
 union all select 9, '# extensions' union all
 select 10, extname || ' ' || extversion || ' schema=' || extnamespace::regnamespace::text from pg_extension
 union all select 11, '# triggers' union all
 select 12, pg_get_triggerdef(oid) from pg_trigger where not tgisinternal and tgrelid in (select oid from pg_class where relnamespace='public'::regnamespace)
 union all select 13, '# row_level_security (table rls force policies owner)' union all
 select 14, c.relname || ' rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity || ' policies=' || (select count(*) from pg_policy p where p.polrelid=c.oid) || ' owner=' || pg_get_userbyid(c.relowner) from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r'
 union all select 15, '# grants (object kind acl)' union all
 select 16, c.relname || ' ' || c.relkind::text || ' ' || coalesce(array_to_string(c.relacl,' '),'-') from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('r','v','S')
 union all select 17, '# function grants' union all
 select 18, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') secdef=' || p.prosecdef || ' ' || coalesce(array_to_string(p.proacl,' '),'-') from pg_proc p where p.pronamespace='public'::regnamespace
 union all select 19, '# default privileges' union all
 select 20, pg_get_userbyid(d.defaclrole) || ' ' || coalesce(d.defaclnamespace::regnamespace::text,'*') || ' ' || d.defaclobjtype::text || ' ' || array_to_string(d.defaclacl,' ') from pg_default_acl d where d.defaclnamespace='public'::regnamespace or d.defaclnamespace=0
 union all select 21, '# schema acl' union all
 select 22, array_to_string(nspacl,' ') from pg_namespace where nspname='public'
 union all select 23, '# applied migration history (version name md5-of-statements)' union all
 select 24, version || ' ' || name || ' ' || md5(array_to_string(statements, E'\n')) from supabase_migrations.schema_migrations
), t as (select string_agg(l, E'\n' order by o, l) || E'\n' as body from parts)
select md5(body) md5, length(body) len, body from t;

-- views/<name>.sql
select viewname, md5(definition || E'\n') md5, definition from pg_views where schemaname='public' order by viewname;

-- functions/<name>.sql
select p.proname, p.pronargs, md5(pg_get_functiondef(p.oid)) md5, pg_get_functiondef(p.oid) def
from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f' order by p.proname, p.pronargs;
