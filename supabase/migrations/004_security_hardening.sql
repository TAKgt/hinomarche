-- 公開前セキュリティ強化
-- 1) products_with_judgment ビューでも下位テーブルのRLSを適用する
-- 2) judgments の公開範囲を「公開済み商品の判定」に限定する

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

grant usage on schema public to anon, authenticated;
grant select on categories, products, judgments, products_with_judgment to anon, authenticated;

drop policy if exists "public read judgments" on judgments;
drop policy if exists "public read published judgments" on judgments;

create policy "public read published judgments" on judgments for select using (
  exists (
    select 1
    from products
    where products.id = judgments.product_id
      and products.is_published
  )
);
