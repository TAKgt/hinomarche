-- 楽天APIの商品別セール・送料無料・ポイントアップ条件を保存する。
-- 既存商品は次回取得時にだけ値が入り、未取得の商品を販促対象として推測しない。
-- あわせて /deals 掲載面の匿名表示・詳細閲覧・販売サイト移動を既存集計へ追加する。

begin;

alter table products
  add column if not exists postage_included boolean not null default false,
  add column if not exists sale_start_at timestamptz,
  add column if not exists sale_end_at timestamptz,
  add column if not exists point_rate integer,
  add column if not exists point_rate_start_at timestamptz,
  add column if not exists point_rate_end_at timestamptz,
  add column if not exists promotion_fetched_at timestamptz;

alter table products drop constraint if exists products_point_rate_check;
alter table products add constraint products_point_rate_check
  check (point_rate is null or point_rate >= 2);

create index if not exists idx_products_active_promotions
  on products (promotion_fetched_at desc)
  where is_published and source = 'rakuten'
    and (postage_included or sale_end_at is not null or point_rate is not null);

alter table outbound_clicks drop constraint if exists outbound_clicks_surface_check;
alter table outbound_clicks add constraint outbound_clicks_surface_check
  check (
    surface is null
    or surface in (
      'home', 'category', 'feature', 'region', 'related', 'search',
      'popular', 'recommended', 'deals', 'product'
    )
  );

alter table product_impressions drop constraint if exists product_impressions_surface_check;
alter table product_impressions add constraint product_impressions_surface_check
  check (
    surface in (
      'home', 'category', 'feature', 'region', 'related', 'search',
      'popular', 'recommended', 'deals'
    )
  );

alter table product_page_views drop constraint if exists product_page_views_placement_check;
alter table product_page_views add constraint product_page_views_placement_check check (
  (surface is null and surface_key is null and position is null)
  or
  (
    position between 1 and 100
    and (
      (
        surface in ('home', 'search', 'popular', 'recommended', 'deals')
        and surface_key is null
      )
      or
      (
        surface in ('category', 'feature', 'region', 'related')
        and surface_key is not null
      )
    )
  )
);

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
      'home', 'category', 'feature', 'region', 'related', 'search',
      'popular', 'recommended', 'deals'
    )
  group by product_id
) lc on lc.product_id = p.id
where p.is_published
  and p.judgment_status = 'current';

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
  select surface, position, count(*)::integer as listing_clicks_28d
  from outbound_clicks
  where clicked_at >= now() - interval '28 days'
    and surface in (
      'home', 'category', 'feature', 'region', 'related', 'search',
      'popular', 'recommended', 'deals'
    )
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
      where oc.surface in (
        'home', 'category', 'feature', 'region', 'related', 'search',
        'popular', 'recommended', 'deals'
      )
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

revoke all on product_ranking_inputs, surface_position_performance_28d,
  product_funnel_performance_28d from anon, authenticated;

commit;

-- ロールバック:
-- drop index if exists idx_products_active_promotions;
-- alter table products
--   drop column if exists promotion_fetched_at,
--   drop column if exists point_rate_end_at,
--   drop column if exists point_rate_start_at,
--   drop column if exists point_rate,
--   drop column if exists sale_end_at,
--   drop column if exists sale_start_at,
--   drop column if exists postage_included;
