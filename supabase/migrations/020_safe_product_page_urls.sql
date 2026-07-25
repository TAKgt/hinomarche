-- 再判定中の商品URLを200で維持するため、商品詳細に必要な公開列だけを1件取得する。
-- pending/blocked/staleでは判定列を必ずnullにし、古い・矛盾したAI判定を公開しない。
-- 019_product_judgment_freshness.sql 適用後に実行する。既存データの更新・削除は行わない。

begin;

create or replace function public.get_public_product_page(p_product_id uuid)
returns table (
  id uuid,
  source text,
  source_item_id text,
  title text,
  description text,
  maker text,
  brand text,
  image_url text,
  price integer,
  fetched_at timestamptz,
  content_updated_at timestamptz,
  price_updated_at timestamptz,
  affiliate_url text,
  category_slug text,
  review_count integer,
  review_average numeric,
  affiliate_rate numeric,
  search_rank integer,
  demand_score integer,
  featured_score integer,
  is_published boolean,
  judgment_status text,
  judgment_input_hash text,
  score integer,
  tier text,
  evidence_type text,
  evidence_text text,
  origin_check text,
  company_check text,
  material_check text,
  judged_at timestamptz,
  judgment_input_hash_at_judgment text,
  consistency_status text,
  consistency_issues text[]
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    p.id,
    p.source,
    case when j.score is not null then p.source_item_id else '' end,
    p.title,
    case when j.score is not null then p.description else null end,
    p.maker,
    p.brand,
    p.image_url,
    case when j.score is not null then p.price else null end,
    p.fetched_at,
    p.content_updated_at,
    p.price_updated_at,
    case when j.score is not null then p.affiliate_url else '' end,
    p.category_slug,
    case when j.score is not null then p.review_count else null end,
    case when j.score is not null then p.review_average else null end,
    case when j.score is not null then p.affiliate_rate else null end,
    case when j.score is not null then p.search_rank else null end,
    p.demand_score,
    p.featured_score,
    p.is_published,
    p.judgment_status,
    p.judgment_input_hash,
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
  from public.products p
  left join lateral (
    select
      judgment.score,
      judgment.tier,
      judgment.evidence_type,
      judgment.evidence_text,
      judgment.origin_check,
      judgment.company_check,
      judgment.material_check,
      judgment.judged_at,
      judgment.input_hash,
      judgment.consistency_status,
      judgment.consistency_issues
    from public.judgments judgment
    where judgment.product_id = p.id
      and p.is_published
      and p.judgment_status = 'current'
      and judgment.input_hash is not distinct from p.judgment_input_hash
      and judgment.consistency_status = 'passed'
    order by judgment.judged_at desc, judgment.id desc
    limit 1
  ) j on true
  where p.id = p_product_id;
$$;

revoke all on function public.get_public_product_page(uuid) from public;
grant execute on function public.get_public_product_page(uuid)
  to anon, authenticated, service_role;

commit;

-- ロールバック:
-- drop function if exists public.get_public_product_page(uuid);
