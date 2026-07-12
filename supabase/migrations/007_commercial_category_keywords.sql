-- 売れ筋・季節性を重視したカテゴリ/検索キーワードへの更新
-- AI日本度だけでなく、レビュー・検索順位・季節需要が出やすい棚へ寄せる。

update categories
set search_keywords = '[
  "フライパン 日本製",
  "鉄フライパン 日本製",
  "米びつ 日本製",
  "保存容器 日本製",
  "水切りラック 日本製",
  "レンジフードフィルター 日本製",
  "包丁 日本製",
  "燕三条 調理器具"
]'::jsonb
where slug = 'kitchen';

update categories
set search_keywords = '[
  "日本製タオル ビッグフェイス",
  "今治タオル ギフト",
  "今治タオル バスタオル",
  "泉州タオル バスタオル",
  "タオルケット 日本製",
  "枕 日本製"
]'::jsonb
where slug = 'towel';

update categories
set search_keywords = '[
  "ボールペン 日本製",
  "ノート 日本製",
  "手帳 日本製",
  "万年筆 日本製",
  "美濃和紙 レターセット"
]'::jsonb
where slug = 'stationery';

update categories
set search_keywords = '[
  "米 令和7年産 10kg",
  "無洗米 国産 10kg",
  "うなぎ 国産 お中元",
  "海鮮 ギフト 国産",
  "そうめん 揖保乃糸",
  "梅干し 紀州",
  "緑茶 国産 茶葉",
  "出汁 国産 無添加"
]'::jsonb
where slug = 'food';

update categories
set search_keywords = '[
  "日傘 日本製 完全遮光",
  "扇子 日本製",
  "蚊取り線香 日本製",
  "い草 ラグ 国産",
  "風鈴 日本製",
  "線香 国産",
  "風呂敷 日本製"
]'::jsonb
where slug = 'zakka';

insert into categories (slug, name, search_keywords, is_active)
values
  ('gift', 'ギフト・季節の贈りもの', '[
    "お中元 国産 ギフト",
    "うなぎ 国産 ギフト",
    "そうめん ギフト 日本",
    "ゼリー 国産 ギフト",
    "今治タオル ギフト",
    "日本製 食器 ギフト"
  ]'::jsonb, true),
  ('emergency', '防災・備蓄', '[
    "アルファ米 国産",
    "非常食 国産",
    "保存水 日本製",
    "防災セット 日本製",
    "缶詰 国産",
    "備蓄米 国産"
  ]'::jsonb, true)
on conflict (slug) do update set
  name = excluded.name,
  search_keywords = excluded.search_keywords,
  is_active = excluded.is_active;
