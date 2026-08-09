\set ON_ERROR_STOP on

begin;

do $test$
begin
  if has_table_privilege('anon', 'public.product_evidence', 'select') then
    raise exception 'anon must not have direct select access';
  end if;
  if not has_function_privilege(
    'anon',
    'public.get_public_product_evidence(uuid)',
    'execute'
  ) then
    raise exception 'anon must be able to execute the public evidence RPC';
  end if;
end
$test$;

insert into public.products (
  id,
  is_published,
  judgment_status,
  judgment_input_hash
) values (
  '00000000-0000-4000-8000-000000000001',
  true,
  'current',
  repeat('a', 64)
);

insert into public.judgments (
  product_id,
  input_hash,
  consistency_status,
  judged_at
) values (
  '00000000-0000-4000-8000-000000000001',
  repeat('a', 64),
  'passed',
  '2026-08-09T01:00:00Z'
);

insert into public.product_evidence (
  product_id,
  claim_type,
  claim_text,
  source_excerpt,
  source_url,
  source_name,
  source_kind,
  retrieved_at,
  review_status,
  human_checked_at,
  product_input_hash,
  evidence_hash,
  has_independent_comparison,
  is_public
) values (
  '00000000-0000-4000-8000-000000000001',
  'manufacturing_origin',
  'メーカー公式ページに製造地の記載がある',
  '製造地に関する必要最小限の原文',
  'https://manufacturer.example/products/item',
  'メーカー公式サイト',
  'manufacturer',
  '2026-08-09T01:30:00Z',
  'human_source_checked',
  '2026-08-09T02:00:00Z',
  repeat('a', 64),
  repeat('b', 64),
  true,
  true
);

do $test$
begin
  if (
    select count(*)
    from public.get_public_product_evidence(
      '00000000-0000-4000-8000-000000000001'
    )
  ) <> 1 then
    raise exception 'valid human checked evidence must be returned';
  end if;
end
$test$;

do $test$
declare
  rejected boolean := false;
begin
  begin
    insert into public.product_evidence (
      product_id, claim_type, claim_text, source_excerpt, source_url,
      source_name, source_kind, retrieved_at, review_status,
      human_checked_at, product_input_hash, evidence_hash, is_public
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'company',
      '販売元の商品説明に会社名がある',
      '販売元の商品説明',
      'https://seller.example/item',
      '販売元',
      'seller',
      '2026-08-09T01:30:00Z',
      'human_source_checked',
      '2026-08-09T02:00:00Z',
      repeat('a', 64),
      repeat('c', 64),
      true
    );
  exception
    when check_violation then rejected := true;
  end;
  if not rejected then
    raise exception 'seller evidence must not be public';
  end if;
end
$test$;

do $test$
declare
  rejected boolean := false;
begin
  begin
    insert into public.product_evidence (
      product_id, claim_type, claim_text, source_url, source_kind,
      review_status, product_input_hash, evidence_hash, is_public
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'other',
      'ローカルURLを根拠として保存しない',
      'https://127.0.0.1/private',
      'other',
      'ai_inferred',
      repeat('a', 64),
      repeat('d', 64),
      false
    );
  exception
    when check_violation then rejected := true;
  end;
  if not rejected then
    raise exception 'private URL must be rejected';
  end if;
end
$test$;

update public.products
set judgment_status = 'pending', is_published = false
where id = '00000000-0000-4000-8000-000000000001';

do $test$
begin
  if exists (
    select 1
    from public.product_evidence
    where product_id = '00000000-0000-4000-8000-000000000001'
      and is_public
  ) then
    raise exception 'pending product evidence must be hidden automatically';
  end if;
  if exists (
    select 1
    from public.get_public_product_evidence(
      '00000000-0000-4000-8000-000000000001'
    )
  ) then
    raise exception 'pending product RPC must return no evidence';
  end if;
end
$test$;

update public.products
set judgment_status = 'current', is_published = true
where id = '00000000-0000-4000-8000-000000000001';

update public.product_evidence
set is_public = true
where product_id = '00000000-0000-4000-8000-000000000001';

update public.products
set judgment_input_hash = repeat('e', 64)
where id = '00000000-0000-4000-8000-000000000001';

do $test$
declare
  rejected boolean := false;
begin
  if exists (
    select 1
    from public.product_evidence
    where product_id = '00000000-0000-4000-8000-000000000001'
      and is_public
  ) then
    raise exception 'hash changed evidence must be hidden automatically';
  end if;

  begin
    update public.product_evidence
    set is_public = true
    where product_id = '00000000-0000-4000-8000-000000000001';
  exception
    when raise_exception then
      rejected := position(
        '現在の商品内容と一致する根拠だけを公開できます' in sqlerrm
      ) > 0;
  end;

  if not rejected then
    raise exception 'hash mismatch evidence must not be republished';
  end if;
end
$test$;

rollback;
