-- 掲載面・表示位置ごとの匿名成果集計。
-- 元データ同様、個人を識別する情報は含めない。

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
    and surface in ('home', 'category', 'feature', 'region', 'related')
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

revoke all on surface_position_performance_28d from anon, authenticated;
