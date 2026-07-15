-- 掲載面ごとの匿名商品表示・クリック計測。
-- IP、Cookie、User-Agent、セッションIDは保存しない。

alter table outbound_clicks
  add column if not exists surface text,
  add column if not exists surface_key text,
  add column if not exists position smallint;

alter table outbound_clicks drop constraint if exists outbound_clicks_surface_check;
alter table outbound_clicks add constraint outbound_clicks_surface_check
  check (surface is null or surface in ('home', 'category', 'feature', 'region', 'related', 'product'));

alter table outbound_clicks drop constraint if exists outbound_clicks_surface_key_check;
alter table outbound_clicks add constraint outbound_clicks_surface_key_check
  check (surface_key is null or surface_key ~ '^[a-z0-9][a-z0-9-]{0,63}$');

alter table outbound_clicks drop constraint if exists outbound_clicks_position_check;
alter table outbound_clicks add constraint outbound_clicks_position_check
  check (position is null or position between 1 and 100);

create index if not exists idx_outbound_clicks_surface_clicked_at
  on outbound_clicks (surface, surface_key, clicked_at desc);

create table if not exists product_impressions (
  id bigserial primary key,
  product_id uuid not null references products(id) on delete cascade,
  surface text not null check (surface in ('home', 'category', 'feature', 'region', 'related')),
  surface_key text check (surface_key is null or surface_key ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  position smallint not null check (position between 1 and 100),
  viewed_at timestamptz not null default now()
);

create index if not exists idx_product_impressions_product_viewed_at
  on product_impressions (product_id, viewed_at desc);

create index if not exists idx_product_impressions_surface_viewed_at
  on product_impressions (surface, surface_key, viewed_at desc);

alter table product_impressions enable row level security;
revoke all on product_impressions from anon, authenticated;
revoke all on sequence product_impressions_id_seq from anon, authenticated;

alter table ranking_snapshots
  add column if not exists impressions_28d integer not null default 0
    check (impressions_28d >= 0),
  add column if not exists listing_clicks_28d integer not null default 0
    check (listing_clicks_28d >= 0);

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
  select score
  from judgments
  where product_id = p.id
  order by judged_at desc
  limit 1
) j on true
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
    and surface in ('home', 'category', 'feature', 'region', 'related')
  group by product_id
) lc on lc.product_id = p.id
where p.is_published;

revoke all on product_ranking_inputs from anon, authenticated;

create or replace view collection_performance_28d
with (security_invoker = true) as
with impression_totals as (
  select
    surface,
    surface_key,
    count(*)::integer as impressions_28d
  from product_impressions
  where viewed_at >= now() - interval '28 days'
    and surface in ('feature', 'region')
    and surface_key is not null
  group by surface, surface_key
), click_totals as (
  select
    surface,
    surface_key,
    count(*)::integer as listing_clicks_28d
  from outbound_clicks
  where clicked_at >= now() - interval '28 days'
    and surface in ('feature', 'region')
    and surface_key is not null
  group by surface, surface_key
)
select
  coalesce(i.surface, c.surface) as surface,
  coalesce(i.surface_key, c.surface_key) as surface_key,
  coalesce(i.impressions_28d, 0)::integer as impressions_28d,
  coalesce(c.listing_clicks_28d, 0)::integer as listing_clicks_28d
from impression_totals i
full outer join click_totals c
  on c.surface = i.surface and c.surface_key = i.surface_key;

revoke all on collection_performance_28d from anon, authenticated;
