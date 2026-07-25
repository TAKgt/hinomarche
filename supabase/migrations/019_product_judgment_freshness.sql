-- 商品取得・内容更新・AI判定の時刻を分離し、現在の商品内容と一致する判定だけを公開する。
-- 既存行は公開状態を維持したまま移行し、次回取得時にアプリ側でSHA-256を段階的に補完する。

begin;

alter table products
  add column if not exists fetched_at timestamptz,
  add column if not exists content_updated_at timestamptz,
  add column if not exists judgment_input_hash text,
  add column if not exists judgment_status text;

update products
set
  fetched_at = coalesce(fetched_at, last_seen_at, price_updated_at, updated_at, created_at),
  content_updated_at = coalesce(content_updated_at, updated_at, created_at),
  judgment_status = coalesce(
    judgment_status,
    case when is_published then 'current' else 'pending' end
  )
where fetched_at is null
   or content_updated_at is null
   or judgment_status is null;

alter table products
  alter column fetched_at set default now(),
  alter column fetched_at set not null,
  alter column content_updated_at set default now(),
  alter column content_updated_at set not null,
  alter column judgment_status set default 'pending',
  alter column judgment_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_judgment_input_hash_check'
      and conrelid = 'products'::regclass
  ) then
    alter table products
      add constraint products_judgment_input_hash_check
      check (
        judgment_input_hash is null
        or judgment_input_hash ~ '^[0-9a-f]{64}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_judgment_status_check'
      and conrelid = 'products'::regclass
  ) then
    alter table products
      add constraint products_judgment_status_check
      check (judgment_status in ('pending', 'current', 'blocked'));
  end if;
end
$$;

alter table judgments
  add column if not exists input_hash text,
  add column if not exists consistency_status text,
  add column if not exists consistency_issues text[];

update judgments
set
  consistency_status = coalesce(consistency_status, 'passed'),
  consistency_issues = coalesce(consistency_issues, '{}')
where consistency_status is null
   or consistency_issues is null;

alter table judgments
  alter column consistency_status set default 'passed',
  alter column consistency_status set not null,
  alter column consistency_issues set default '{}',
  alter column consistency_issues set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'judgments_input_hash_check'
      and conrelid = 'judgments'::regclass
  ) then
    alter table judgments
      add constraint judgments_input_hash_check
      check (input_hash is null or input_hash ~ '^[0-9a-f]{64}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'judgments_consistency_status_check'
      and conrelid = 'judgments'::regclass
  ) then
    alter table judgments
      add constraint judgments_consistency_status_check
      check (consistency_status in ('passed', 'blocked'));
  end if;
end
$$;

create index if not exists idx_products_judgment_backlog
  on products (judgment_status, created_at)
  where judgment_status = 'pending';

-- productsの物理列順は新規作成DBと段階移行DBで異なるため、列名ベースで安全に再作成する。
-- リポジトリ内にこのビューへ依存する別DBビューはない。
drop view if exists products_with_judgment;

create view products_with_judgment
with (security_invoker = true) as
select
  p.*,
  j.score,
  j.tier,
  j.evidence_type,
  j.evidence_text,
  j.origin_check,
  j.company_check,
  j.material_check,
  j.judged_at,
  j.input_hash as judgment_input_hash_at_judgment,
  j.consistency_status,
  j.consistency_issues
from products p
join lateral (
  select
    score,
    tier,
    evidence_type,
    evidence_text,
    origin_check,
    company_check,
    material_check,
    judged_at,
    input_hash,
    consistency_status,
    consistency_issues
  from judgments
  where product_id = p.id
    and input_hash is not distinct from p.judgment_input_hash
  order by judged_at desc, id desc
  limit 1
) j on j.consistency_status = 'passed';

grant select on products_with_judgment to anon, authenticated;

create or replace view product_ranking_inputs
with (security_invoker = true) as
select
  p.id as product_id,
  j.score as ai_score,
  p.demand_score,
  p.featured_score as current_featured_score,
  p.price_updated_at,
  coalesce(pv.page_views_28d, 0)::integer as page_views_28d,
  coalesce(oc.outbound_clicks_28d, 0)::integer as outbound_clicks_28d,
  coalesce(pi.impressions_28d, 0)::integer as impressions_28d,
  coalesce(lc.listing_clicks_28d, 0)::integer as listing_clicks_28d
from products p
join lateral (
  select score, consistency_status
  from judgments
  where product_id = p.id
    and input_hash is not distinct from p.judgment_input_hash
  order by judged_at desc, id desc
  limit 1
) j on j.consistency_status = 'passed'
left join (
  select product_id, count(*) as page_views_28d
  from product_page_views
  where viewed_at >= now() - interval '28 days'
  group by product_id
) pv on pv.product_id = p.id
left join (
  select product_id, count(*) as outbound_clicks_28d
  from outbound_clicks
  where clicked_at >= now() - interval '28 days'
  group by product_id
) oc on oc.product_id = p.id
left join (
  select product_id, count(*) as impressions_28d
  from product_impressions
  where viewed_at >= now() - interval '28 days'
  group by product_id
) pi on pi.product_id = p.id
left join (
  select product_id, count(*) as listing_clicks_28d
  from outbound_clicks
  where clicked_at >= now() - interval '28 days'
    and surface in (
      'home',
      'category',
      'feature',
      'region',
      'related',
      'search',
      'popular',
      'recommended'
    )
  group by product_id
) lc on lc.product_id = p.id
where p.is_published
  and p.judgment_status = 'current';

revoke all on product_ranking_inputs from anon, authenticated;

drop policy if exists "public read published judgments" on judgments;
create policy "public read published judgments" on judgments for select using (
  exists (
    select 1
    from products
    where products.id = judgments.product_id
      and products.is_published
      and products.judgment_status = 'current'
      and judgments.input_hash is not distinct from products.judgment_input_hash
      and judgments.consistency_status = 'passed'
  )
);

commit;
