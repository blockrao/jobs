-- WP-001 backup gate: read-only comparison script. Run identically on live and on the scratch restore.
-- Part 1: exact row counts, public tables.
select 'organizations' t, count(*) n from public.organizations
union all select 'postings', count(*) from public.postings
union all select 'recruitments', count(*) from public.recruitments
union all select 'source_documents', count(*) from public.source_documents
union all select 'sources', count(*) from public.sources
union all select 'exams', count(*) from public.exams
union all select 'positions', count(*) from public.positions
union all select 'posts', count(*) from public.posts
union all select 'vacancies', count(*) from public.vacancies
union all select 'posting_updates', count(*) from public.posting_updates
union all select 'posting_categories', count(*) from public.posting_categories
union all select 'posting_articles', count(*) from public.posting_articles
union all select 'articles', count(*) from public.articles
union all select 'categories', count(*) from public.categories
union all select 'commissions', count(*) from public.commissions
union all select 'locations', count(*) from public.locations
union all select 'qualifications', count(*) from public.qualifications
union all select 'eligibilities', count(*) from public.eligibilities
union all select 'selection_processes', count(*) from public.selection_processes
union all select 'article_categories', count(*) from public.article_categories
order by 1;

-- Part 2: content checksums of the core tables (whole-row text, ordered by primary key).
select 'organizations' t, md5(string_agg(x::text, '|' order by x.id::text)) from public.organizations x
union all select 'postings', md5(string_agg(x::text, '|' order by x.id::text)) from public.postings x
union all select 'recruitments', md5(string_agg(x::text, '|' order by x.id::text)) from public.recruitments x
union all select 'source_documents', md5(string_agg(x::text, '|' order by x.id::text)) from public.source_documents x
union all select 'sources', md5(string_agg(x::text, '|' order by x.id::text)) from public.sources x
order by 1;
