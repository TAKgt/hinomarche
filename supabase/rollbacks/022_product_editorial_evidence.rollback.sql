-- 022_product_editorial_evidence.sql の手動ロールバック。
-- product_evidenceの保存内容を削除するため、必要な根拠をエクスポートしてから実行する。
-- 自動実行しない。

begin;

drop function if exists public.get_public_product_evidence(uuid);

drop trigger if exists products_hide_stale_evidence on public.products;
drop function if exists public.hide_stale_product_evidence();

drop trigger if exists product_evidence_publication_guard
  on public.product_evidence;
drop function if exists public.enforce_product_evidence_publication();

drop table if exists public.product_evidence;

commit;
