-- カテゴリ追加: 仕込み済みの2カテゴリを有効化 + 新規2カテゴリを追加
-- SupabaseのSQL Editorに貼り付けて実行。不要なカテゴリは該当行を消すか is_active=false に

-- 1) 仕込み済みカテゴリの有効化(タオル・寝具 / 文具)
update categories set is_active = true where slug in ('towel', 'stationery');

-- 2) 新規カテゴリ: 食品・調味料(産地表記が豊富でリピート購入されやすい)
insert into categories (slug, name, search_keywords) values
  ('food', '食品・調味料', '[
    "醤油 国産 木桶",
    "味噌 国産 天然醸造",
    "緑茶 国産 茶葉",
    "出汁 国産 無添加",
    "米 産地直送",
    "梅干し 紀州"
  ]'::jsonb)
on conflict (slug) do nothing;

-- 3) 新規カテゴリ: 生活雑貨・インテリア(伝統工芸が多い)
insert into categories (slug, name, search_keywords) values
  ('zakka', '生活雑貨・インテリア', '[
    "南部風鈴",
    "い草 ラグ 国産",
    "江戸切子 グラス",
    "木工 日本製 雑貨",
    "風呂敷 日本製"
  ]'::jsonb)
on conflict (slug) do nothing;
