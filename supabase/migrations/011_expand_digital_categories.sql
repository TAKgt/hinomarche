-- デジタル・精密機器系の売れ筋と、日本製周辺商品の関連導線を強化する。

update categories
set name = '家電・生活家電',
    search_keywords = '[
      "炊飯器 日本製",
      "電気ケトル 日本製",
      "ドライヤー 日本製",
      "電動シェーバー 日本製",
      "ハンディファン 日本メーカー",
      "乾電池 日本メーカー"
    ]'::jsonb
where slug = 'electronics';

insert into categories (slug, name, search_keywords, is_active)
values
  ('smartphone', 'スマホ・タブレット・周辺機器', '[
    "iPhone 本体",
    "iPhone ケース 日本製",
    "スマホケース 栃木レザー 日本製",
    "スマホスタンド 日本製",
    "充電器 日本メーカー",
    "USB ケーブル 日本メーカー",
    "保護フィルム 日本製"
  ]'::jsonb, true),
  ('computer', 'パソコン・デジタル周辺機器', '[
    "ノートパソコン 日本メーカー",
    "キーボード 日本メーカー",
    "マウス 日本メーカー",
    "PCスタンド 日本製",
    "USBメモリ 日本メーカー",
    "モニターアーム 日本メーカー"
  ]'::jsonb, true),
  ('audio-camera', 'オーディオ・カメラ', '[
    "イヤホン 日本メーカー",
    "ヘッドホン 日本メーカー",
    "スピーカー 日本メーカー",
    "カメラストラップ 日本製",
    "カメラバッグ 日本製",
    "レンズクリーナー 日本メーカー"
  ]'::jsonb, true),
  ('watch', '腕時計・精密機器', '[
    "腕時計 日本製",
    "セイコー 腕時計 日本製",
    "シチズン 腕時計 日本製",
    "腕時計 ベルト 日本製",
    "スマートウォッチ 日本メーカー",
    "精密工具 日本製"
  ]'::jsonb, true),
  ('automotive', 'カー・バイク用品', '[
    "車載充電器 日本メーカー",
    "ドライブレコーダー 日本メーカー",
    "洗車用品 日本製",
    "サンシェード 車 日本製",
    "カーナビ 日本メーカー",
    "バイク用品 日本製"
  ]'::jsonb, true)
on conflict (slug) do update set
  name = excluded.name,
  search_keywords = excluded.search_keywords,
  is_active = excluded.is_active;

-- 既存の広いカテゴリから、商品名で明確に判別できるものだけ専門カテゴリへ移す。
update products set category_slug = 'smartphone'
where category_slug in ('electronics', 'fashion', 'zakka')
  and title ~* '(iPhone|スマホ|タブレット|携帯充電|スマホ充電|保護フィルム|Lightning|ライトニング)';

update products set category_slug = 'computer'
where category_slug in ('electronics', 'zakka')
  and title ~* '(パソコン|ノートPC|キーボード|マウス|USBメモリ|モニター|プリンター|PCスタンド)';

update products set category_slug = 'audio-camera'
where category_slug in ('electronics', 'fashion', 'zakka')
  and title ~* '(イヤホン|ヘッドホン|スピーカー|カメラ|レンズ|オーディオ)';

update products set category_slug = 'watch'
where category_slug in ('electronics', 'home', 'fashion', 'diy')
  and title ~* '(腕時計|スマートウォッチ|時計ベルト|ウォッチバンド|精密機器)';

update products set category_slug = 'automotive'
where category_slug in ('electronics', 'outdoor', 'zakka', 'diy')
  and title ~* '(車載|ドライブレコーダー|洗車|カーナビ|カー用品|バイク用品|自動車)';
