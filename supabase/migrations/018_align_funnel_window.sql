-- 詳細導線の計測開始前に蓄積された表示・移動を比較対象から外す。
-- 3段階を同じ観測開始時刻に揃え、導入直後の誤判定を防ぐ。

create or replace view product_funnel_performance_28d
with (security_invoker = true) as
with observation_window as (
  select case
    when min(viewed_at) filter (where surface is not null) is null then null
    else greatest(
      now() - interval '28 days',
      min(viewed_at) filter (where surface is not null)
    )
  end as started_at
  from product_page_views
), impression_totals as (
  select pi.product_id, count(*)::integer as impressions_28d
  from product_impressions pi
  cross join observation_window w
  where w.started_at is not null
    and pi.viewed_at >= w.started_at
  group by pi.product_id
), detail_totals as (
  select
    ppv.product_id,
    count(*)::integer as detail_views_28d,
    count(*) filter (where ppv.surface is not null)::integer as listing_detail_views_28d
  from product_page_views ppv
  cross join observation_window w
  where w.started_at is not null
    and ppv.viewed_at >= w.started_at
  group by ppv.product_id
), outbound_totals as (
  select
    oc.product_id,
    count(*) filter (
      where oc.surface in ('home', 'category', 'feature', 'region', 'related', 'search', 'popular', 'recommended')
    )::integer as listing_outbound_clicks_28d,
    count(*) filter (where oc.surface = 'product')::integer as detail_outbound_clicks_28d
  from outbound_clicks oc
  cross join observation_window w
  where w.started_at is not null
    and oc.clicked_at >= w.started_at
  group by oc.product_id
)
select
  p.id as product_id,
  coalesce(i.impressions_28d, 0)::integer as impressions_28d,
  coalesce(d.detail_views_28d, 0)::integer as detail_views_28d,
  coalesce(d.listing_detail_views_28d, 0)::integer as listing_detail_views_28d,
  coalesce(o.listing_outbound_clicks_28d, 0)::integer as listing_outbound_clicks_28d,
  coalesce(o.detail_outbound_clicks_28d, 0)::integer as detail_outbound_clicks_28d,
  w.started_at as window_started_at,
  case
    when w.started_at is null then 0
    else floor(extract(epoch from (now() - w.started_at)) / 86400)::integer
  end as observed_days
from products p
cross join observation_window w
left join impression_totals i on i.product_id = p.id
left join detail_totals d on d.product_id = p.id
left join outbound_totals o on o.product_id = p.id
where p.is_published;

revoke all on product_funnel_performance_28d from anon, authenticated;
