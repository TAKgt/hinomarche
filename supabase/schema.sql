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

create table outbound_clicks (
  id bigserial primary key,
  product_id uuid not null references products(id) on delete cascade,
  destination text not null check (destination in ('primary', 'cross')),
  merchant text not null check (merchant in ('rakuten', 'amazon')),
  clicked_at timestamptz not null default now()
);

create table product_page_views (
  id bigserial primary key,
  product_id uuid not null references products(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create table ranking_snapshots (
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

create index idx_products_category on products (category_slug) where is_published;
create index idx_products_featured on products (is_published, featured_score desc, demand_score desc, updated_at desc);
create index idx_judgments_product on judgments (product_id, judged_at desc);
create index idx_contact_messages_created_at on contact_messages (created_at desc);
create index idx_outbound_clicks_clicked_at on outbound_clicks (clicked_at desc);
create index idx_outbound_clicks_product_clicked_at on outbound_clicks (product_id, clicked_at desc);
create index idx_product_page_views_product_viewed_at on product_page_views (product_id, viewed_at desc);
create index idx_product_page_views_viewed_at on product_page_views (viewed_at desc);
create index idx_ranking_snapshots_date_score on ranking_snapshots (calculated_on desc, mode, proposed_score desc);

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

create view product_ranking_inputs
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

-- RLS: 匿名キーからは公開商品の読み取りのみ許可(書き込みはservice roleキー経由)
alter table categories enable row level security;
alter table products enable row level security;
alter table judgments enable row level security;
alter table contact_messages enable row level security;
alter table outbound_clicks enable row level security;
alter table product_page_views enable row level security;
alter table ranking_snapshots enable row level security;

grant usage on schema public to anon, authenticated;
grant select on categories, products, judgments, products_with_judgment to anon, authenticated;
revoke all on contact_messages from anon, authenticated;
revoke all on sequence contact_messages_id_seq from anon, authenticated;
revoke all on outbound_clicks from anon, authenticated;
revoke all on sequence outbound_clicks_id_seq from anon, authenticated;
revoke all on product_page_views, ranking_snapshots from anon, authenticated;
revoke all on sequence product_page_views_id_seq from anon, authenticated;
revoke all on sequence ranking_snapshots_id_seq from anon, authenticated;
revoke all on product_ranking_inputs from anon, authenticated;

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
    "フライパン 日本製",
    "鉄フライパン 日本製",
    "米びつ 日本製",
    "保存容器 日本製",
    "水切りラック 日本製",
    "レンジフードフィルター 日本製",
    "包丁 日本製",
    "燕三条 調理器具"
  ]'::jsonb);

-- 基本カテゴリ
insert into categories (slug, name, search_keywords, is_active) values
  ('towel', 'タオル・寝具', '["日本製タオル ビッグフェイス", "今治タオル ギフト", "今治タオル バスタオル", "泉州タオル バスタオル", "タオルケット 日本製", "枕 日本製"]'::jsonb, true),
  ('stationery', '文具', '["ボールペン 日本製", "ノート 日本製", "手帳 日本製", "万年筆 日本製", "美濃和紙 レターセット"]'::jsonb, true),
  ('food', '食品・調味料', '["米 令和7年産 10kg", "無洗米 国産 10kg", "うなぎ 国産 お中元", "海鮮 ギフト 国産", "そうめん 揖保乃糸", "梅干し 紀州", "緑茶 国産 茶葉", "出汁 国産 無添加"]'::jsonb, true),
  ('zakka', '日用品・バス・掃除', '["洗濯ハンガー 日本製", "掃除ブラシ 日本製", "風呂椅子 日本製", "バス用品 日本製", "蚊取り線香 日本製", "線香 国産"]'::jsonb, true),
  ('gift', 'ギフト・季節の贈りもの', '["お中元 国産 ギフト", "うなぎ 国産 ギフト", "そうめん ギフト 日本", "ゼリー 国産 ギフト", "今治タオル ギフト", "日本製 食器 ギフト"]'::jsonb, true),
  ('emergency', '防災・備蓄', '["アルファ米 国産", "非常食 国産", "保存水 日本製", "防災セット 日本製", "缶詰 国産", "備蓄米 国産"]'::jsonb, true);

-- 商用カテゴリ拡張(既存環境では migrations/010 を適用)
insert into categories (slug, name, search_keywords, is_active) values
  ('tableware', '食器・酒器・カトラリー', '["波佐見焼 食器", "美濃焼 食器", "有田焼 食器", "燕三条 カトラリー 日本製", "江戸切子 グラス"]'::jsonb, true),
  ('sweets', 'スイーツ・和菓子', '["和菓子 詰め合わせ 国産", "カステラ 長崎 ギフト", "羊羹 国産 ギフト", "せんべい 国産米", "ゼリー 国産果実"]'::jsonb, true),
  ('drinks', '水・お茶・飲料', '["緑茶 静岡県産", "日本茶 ティーバッグ 国産", "天然水 国産", "ジュース 国産果実", "甘酒 国産米"]'::jsonb, true),
  ('fashion', 'ファッション・バッグ・小物', '["靴下 日本製", "パジャマ 日本製", "日傘 日本製", "豊岡鞄", "財布 日本製 本革", "ベルト 日本製"]'::jsonb, true),
  ('beauty', '美容・ヘルスケア', '["化粧水 日本製", "シャンプー 日本製", "日焼け止め 日本製", "つげ櫛 日本製", "爪切り 日本製", "健康器具 日本製"]'::jsonb, true),
  ('home', '家具・インテリア・収納', '["家具 日本製", "い草 ラグ 国産", "カーテン 日本製", "収納ボックス 日本製", "座椅子 日本製", "置き時計 日本製"]'::jsonb, true),
  ('kids', 'ベビー・キッズ・おもちゃ', '["木のおもちゃ 日本製", "積み木 日本製", "ベビー食器 日本製", "ガーゼ ベビー 日本製", "ランドセル 日本製"]'::jsonb, true),
  ('electronics', '家電・生活家電', '["炊飯器 日本製", "電気ケトル 日本製", "ドライヤー 日本製", "電動シェーバー 日本製", "ハンディファン 日本メーカー", "乾電池 日本メーカー"]'::jsonb, true),
  ('outdoor', 'スポーツ・アウトドア', '["水筒 日本製", "アウトドア 食器 日本製", "登山用品 日本製", "釣具 日本製", "スポーツタオル 今治"]'::jsonb, true),
  ('pet', 'ペット用品', '["犬 おやつ 国産 無添加", "猫 おやつ 国産 無添加", "ペット食器 日本製", "犬 ベッド 日本製", "猫砂 国産"]'::jsonb, true),
  ('diy', '工具・DIY・園芸', '["工具 日本製", "ニッパー 日本製", "剪定ばさみ 日本製", "園芸用品 日本製", "燕三条 工具"]'::jsonb, true);

-- デジタル・精密機器カテゴリ(既存環境では migrations/011 を適用)
insert into categories (slug, name, search_keywords, is_active) values
  ('smartphone', 'スマホ・タブレット・周辺機器', '["iPhone 本体", "iPhone ケース 日本製", "スマホケース 栃木レザー 日本製", "スマホスタンド 日本製", "充電器 日本メーカー", "USB ケーブル 日本メーカー", "保護フィルム 日本製"]'::jsonb, true),
  ('computer', 'パソコン・デジタル周辺機器', '["ノートパソコン 日本メーカー", "キーボード 日本メーカー", "マウス 日本メーカー", "PCスタンド 日本製", "USBメモリ 日本メーカー", "モニターアーム 日本メーカー"]'::jsonb, true),
  ('audio-camera', 'オーディオ・カメラ', '["イヤホン 日本メーカー", "ヘッドホン 日本メーカー", "スピーカー 日本メーカー", "カメラストラップ 日本製", "カメラバッグ 日本製", "レンズクリーナー 日本メーカー"]'::jsonb, true),
  ('watch', '腕時計・精密機器', '["腕時計 日本製", "セイコー 腕時計 日本製", "シチズン 腕時計 日本製", "腕時計 ベルト 日本製", "スマートウォッチ 日本メーカー", "精密工具 日本製"]'::jsonb, true),
  ('automotive', 'カー・バイク用品', '["車載充電器 日本メーカー", "ドライブレコーダー 日本メーカー", "洗車用品 日本製", "サンシェード 車 日本製", "カーナビ 日本メーカー", "バイク用品 日本製"]'::jsonb, true);
