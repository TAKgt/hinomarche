-- TOP掲載ロジック強化
-- AI日本度に加えて、検索順位・レビュー・料率などの市場性シグナルを保存し、
-- TOP/一覧の「注目順」に使う。

alter table products
  add column if not exists review_count integer,
  add column if not exists review_average numeric(3,2),
  add column if not exists affiliate_rate numeric(5,2),
  add column if not exists search_rank integer,
  add column if not exists demand_score integer not null default 0 check (demand_score between 0 and 100),
  add column if not exists featured_score integer not null default 0 check (featured_score between 0 and 100),
  add column if not exists last_seen_at timestamptz;

create index if not exists idx_products_featured
  on products (is_published, featured_score desc, demand_score desc, updated_at desc);

update products p
set featured_score = greatest(
  0,
  least(
    100,
    round(
      j.score * 0.65
      + p.demand_score * 0.35
      - case
          when j.score >= 80 then 0
          when j.score >= 50 then 15
          else 35
        end
    )::integer
  )
)
from (
  select distinct on (product_id) product_id, score
  from judgments
  order by product_id, judged_at desc
) j
where j.product_id = p.id;

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
  j.judged_at
from products p
join lateral (
  select score, tier, evidence_type, evidence_text,
         origin_check, company_check, material_check, judged_at
  from judgments
  where product_id = p.id
  order by judged_at desc
  limit 1
) j on true;

grant select on products_with_judgment to anon, authenticated;
