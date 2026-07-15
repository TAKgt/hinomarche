-- 商品カードから詳細ページへの匿名導線を記録する。
-- 閲覧者識別子や検索語は保存せず、掲載面・文脈slug・表示位置だけを追加する。

alter table product_page_views add column if not exists surface text;
alter table product_page_views add column if not exists surface_key text;
alter table product_page_views add column if not exists position smallint;

alter table product_page_views drop constraint if exists product_page_views_surface_key_check;
alter table product_page_views add constraint product_page_views_surface_key_check
  check (surface_key is null or surface_key ~ '^[a-z0-9][a-z0-9-]{0,63}$');

alter table product_page_views drop constraint if exists product_page_views_placement_check;
alter table product_page_views add constraint product_page_views_placement_check check (
  (surface is null and surface_key is null and position is null)
  or
  (
    position between 1 and 100
    and (
      (surface in ('home', 'search', 'popular', 'recommended') and surface_key is null)
      or
      (surface in ('category', 'feature', 'region', 'related') and surface_key is not null)
    )
  )
);

create index if not exists idx_product_page_views_surface_viewed_at
  on product_page_views (surface, surface_key, viewed_at desc);

create or replace view product_funnel_performance_28d
with (security_invoker = true) as
with impression_totals as (
  select product_id, count(*)::integer as impressions_28d
  from product_impressions
  where viewed_at >= now() - interval '28 days'
  group by product_id
), detail_totals as (
  select
    product_id,
    count(*)::integer as detail_views_28d,
    count(*) filter (where surface is not null)::integer as listing_detail_views_28d
  from product_page_views
  where viewed_at >= now() - interval '28 days'
  group by product_id
), outbound_totals as (
  select
    product_id,
    count(*) filter (
      where surface in ('home', 'category', 'feature', 'region', 'related', 'search', 'popular', 'recommended')
    )::integer as listing_outbound_clicks_28d,
    count(*) filter (where surface = 'product')::integer as detail_outbound_clicks_28d
  from outbound_clicks
  where clicked_at >= now() - interval '28 days'
  group by product_id
)
select
  p.id as product_id,
  coalesce(i.impressions_28d, 0)::integer as impressions_28d,
  coalesce(d.detail_views_28d, 0)::integer as detail_views_28d,
  coalesce(d.listing_detail_views_28d, 0)::integer as listing_detail_views_28d,
  coalesce(o.listing_outbound_clicks_28d, 0)::integer as listing_outbound_clicks_28d,
  coalesce(o.detail_outbound_clicks_28d, 0)::integer as detail_outbound_clicks_28d
from products p
left join impression_totals i on i.product_id = p.id
left join detail_totals d on d.product_id = p.id
left join outbound_totals o on o.product_id = p.id
where p.is_published;

revoke all on product_funnel_performance_28d from anon, authenticated;
