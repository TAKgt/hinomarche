-- 高評価商品一覧の掲載面を匿名計測へ追加する。
-- 商品ID・表示位置・時刻だけを記録し、個人情報や閲覧者識別子は保存しない。

alter table outbound_clicks drop constraint if exists outbound_clicks_surface_check;
alter table outbound_clicks add constraint outbound_clicks_surface_check
  check (surface is null or surface in ('home', 'category', 'feature', 'region', 'related', 'search', 'popular', 'product'));

alter table product_impressions drop constraint if exists product_impressions_surface_check;
alter table product_impressions add constraint product_impressions_surface_check
  check (surface in ('home', 'category', 'feature', 'region', 'related', 'search', 'popular'));

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
    and surface in ('home', 'category', 'feature', 'region', 'related', 'search', 'popular')
  group by product_id
) lc on lc.product_id = p.id
where p.is_published;

create or replace view surface_position_performance_28d
with (security_invoker = true) as
with impression_totals as (
  select
    surface,
    position,
    count(*)::integer as impressions_28d,
    count(distinct product_id)::integer as products_seen_28d
  from product_impressions
  where viewed_at >= now() - interval '28 days'
  group by surface, position
), click_totals as (
  select
    surface,
    position,
    count(*)::integer as listing_clicks_28d
  from outbound_clicks
  where clicked_at >= now() - interval '28 days'
    and surface in ('home', 'category', 'feature', 'region', 'related', 'search', 'popular')
    and position is not null
  group by surface, position
)
select
  coalesce(i.surface, c.surface) as surface,
  coalesce(i.position, c.position) as position,
  coalesce(i.impressions_28d, 0)::integer as impressions_28d,
  coalesce(c.listing_clicks_28d, 0)::integer as listing_clicks_28d,
  coalesce(i.products_seen_28d, 0)::integer as products_seen_28d
from impression_totals i
full outer join click_totals c
  on c.surface = i.surface and c.position = i.position;

revoke all on product_ranking_inputs, surface_position_performance_28d
  from anon, authenticated;
