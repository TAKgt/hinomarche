-- ヒノマルシェ DBスキーマ
-- Supabaseダッシュボード → SQL Editor にこのファイル全体を貼り付けて実行してください

create table categories (
  id serial primary key,
  slug text unique not null,
  name text not null,
  search_keywords jsonb not null default '[]',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('rakuten', 'amazon')),
  source_item_id text not null,
  title text not null,
  description text,
  maker text,
  brand text,
  image_url text,
  price integer,
  price_updated_at timestamptz,
  affiliate_url text not null,
  item_url text,
  category_slug text not null references categories(slug),
  review_count integer,
  review_average numeric(3,2),
  affiliate_rate numeric(5,2),
  search_rank integer,
  demand_score integer not null default 0 check (demand_score between 0 and 100),
  featured_score integer not null default 0 check (featured_score between 0 and 100),
  last_seen_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_item_id)
);

create table judgments (
  id bigserial primary key,
  product_id uuid not null references products(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  tier text not null check (tier in ('high', 'mid', 'low')),
  evidence_type text not null,
  evidence_text text not null,
  origin_check text check (origin_check in ('yes', 'unknown', 'no')),
  company_check text check (company_check in ('yes', 'unknown', 'no')),
  material_check text check (material_check in ('yes', 'unknown', 'no')),
  confidence text,
  model text,
  judged_at timestamptz not null default now()
);

create table contact_messages (
  id bigserial primary key,
  name text,
  email text,
  topic text not null check (topic in ('correction', 'removal', 'feedback', 'other')),
  message text not null check (char_length(message) between 10 and 3000),
  page_url text,
  status text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  created_at timestamptz not null default now()
);

create index idx_products_category on products (category_slug) where is_published;
create index idx_products_featured on products (is_published, featured_score desc, demand_score desc, updated_at desc);
create index idx_judgments_product on judgments (product_id, judged_at desc);
create index idx_contact_messages_created_at on contact_messages (created_at desc);

-- 最新の判定を結合したビュー(サイト表示はこれを読む)
-- security_invoker=true により、anon/authenticated から見た場合も下位テーブルのRLSを適用する。
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

-- RLS: 匿名キーからは公開商品の読み取りのみ許可(書き込みはservice roleキー経由)
alter table categories enable row level security;
alter table products enable row level security;
alter table judgments enable row level security;
alter table contact_messages enable row level security;

grant usage on schema public to anon, authenticated;
grant select on categories, products, judgments, products_with_judgment to anon, authenticated;
revoke all on contact_messages from anon, authenticated;
revoke all on sequence contact_messages_id_seq from anon, authenticated;

create policy "public read categories" on categories for select using (is_active);
create policy "public read published products" on products for select using (is_published);
create policy "public read published judgments" on judgments for select using (
  exists (
    select 1
    from products
    where products.id = judgments.product_id
      and products.is_published
  )
);

-- 初期カテゴリ: キッチン・調理器具(フェーズ1)
insert into categories (slug, name, search_keywords) values
  ('kitchen', 'キッチン・調理器具', '[
    "包丁 日本製",
    "燕三条 調理器具",
    "南部鉄器",
    "有田焼 食器",
    "波佐見焼 食器",
    "美濃焼 食器",
    "土鍋 日本製",
    "曲げわっぱ 弁当箱"
  ]'::jsonb);

-- フェーズ2で追加予定(is_active=falseで先に入れておく)
insert into categories (slug, name, search_keywords, is_active) values
  ('towel', 'タオル・寝具', '["今治タオル", "泉州タオル"]'::jsonb, false),
  ('stationery', '文具', '["万年筆 日本製", "美濃和紙", "文房具 日本製"]'::jsonb, false);
