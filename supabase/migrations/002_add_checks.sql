-- AI日本度判定の内訳3要素チェック(生産地・企業・素材)を追加
-- SupabaseのSQL Editorにこのファイル全体を貼り付けて実行してください

alter table judgments
  add column if not exists origin_check text check (origin_check in ('yes', 'unknown', 'no')),
  add column if not exists company_check text check (company_check in ('yes', 'unknown', 'no')),
  add column if not exists material_check text check (material_check in ('yes', 'unknown', 'no'));

-- ビューを作り直して新カラムを含める
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
