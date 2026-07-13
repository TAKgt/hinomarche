-- 個人を識別しない商品閲覧計測と、日次shadowランキング。
-- IP、Cookie、User-Agent、セッションIDは保存しない。

create table if not exists product_page_views (
  id bigserial primary key,
  product_id uuid not null references products(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create table if not exists ranking_snapshots (
  id bigserial primary key,
  product_id uuid not null references products(id) on delete cascade,
  calculated_on date not null,
  mode text not null check (mode in ('shadow', 'live')),
  score_version text not null,
  current_score integer not null check (current_score between 0 and 100),
  proposed_score integer not null check (proposed_score between 0 and 100),
  page_views_28d integer not null default 0 check (page_views_28d >= 0),
  outbound_clicks_28d integer not null default 0 check (outbound_clicks_28d >= 0),
  smoothed_ctr numeric(9,6) not null default 0 check (smoothed_ctr >= 0),
  reason text not null,
  created_at timestamptz not null default now(),
  unique (product_id, calculated_on, mode)
);

create index if not exists idx_product_page_views_product_viewed_at
  on product_page_views (product_id, viewed_at desc);

create index if not exists idx_product_page_views_viewed_at
  on product_page_views (viewed_at desc);

create index if not exists idx_ranking_snapshots_date_score
  on ranking_snapshots (calculated_on desc, mode, proposed_score desc);

alter table product_page_views enable row level security;
alter table ranking_snapshots enable row level security;

revoke all on product_page_views, ranking_snapshots from anon, authenticated;
revoke all on sequence product_page_views_id_seq from anon, authenticated;
revoke all on sequence ranking_snapshots_id_seq from anon, authenticated;

create or replace view product_ranking_inputs
with (security_invoker = true) as
select
  p.id as product_id,
  j.score as ai_score,
  p.demand_score,
  p.featured_score as current_featured_score,
  p.price_updated_at,
  coalesce(pv.page_views_28d, 0)::integer as page_views_28d,
  coalesce(oc.outbound_clicks_28d, 0)::integer as outbound_clicks_28d
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
where p.is_published;

revoke all on product_ranking_inputs from anon, authenticated;
