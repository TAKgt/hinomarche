-- Amazon・楽天の主要売場を参考にしたカテゴリ拡張。
-- 日本との関わりを商品説明から確認しやすく、購入需要も見込める検索語に絞る。

update categories
set name = '日用品・バス・掃除',
    search_keywords = '[
      "洗濯ハンガー 日本製",
      "掃除ブラシ 日本製",
      "風呂椅子 日本製",
      "バス用品 日本製",
      "蚊取り線香 日本製",
      "線香 国産"
    ]'::jsonb
where slug = 'zakka';

insert into categories (slug, name, search_keywords, is_active)
values
  ('tableware', '食器・酒器・カトラリー', '["波佐見焼 食器", "美濃焼 食器", "有田焼 食器", "燕三条 カトラリー 日本製", "江戸切子 グラス"]'::jsonb, true),
  ('sweets', 'スイーツ・和菓子', '["和菓子 詰め合わせ 国産", "カステラ 長崎 ギフト", "羊羹 国産 ギフト", "せんべい 国産米", "ゼリー 国産果実"]'::jsonb, true),
  ('drinks', '水・お茶・飲料', '["緑茶 静岡県産", "日本茶 ティーバッグ 国産", "天然水 国産", "ジュース 国産果実", "甘酒 国産米"]'::jsonb, true),
  ('fashion', 'ファッション・バッグ・小物', '["靴下 日本製", "パジャマ 日本製", "日傘 日本製", "豊岡鞄", "財布 日本製 本革", "ベルト 日本製"]'::jsonb, true),
  ('beauty', '美容・ヘルスケア', '["化粧水 日本製", "シャンプー 日本製", "日焼け止め 日本製", "つげ櫛 日本製", "爪切り 日本製", "健康器具 日本製"]'::jsonb, true),
  ('home', '家具・インテリア・収納', '["家具 日本製", "い草 ラグ 国産", "カーテン 日本製", "収納ボックス 日本製", "座椅子 日本製", "置き時計 日本製"]'::jsonb, true),
  ('kids', 'ベビー・キッズ・おもちゃ', '["木のおもちゃ 日本製", "積み木 日本製", "ベビー食器 日本製", "ガーゼ ベビー 日本製", "ランドセル 日本製"]'::jsonb, true),
  ('electronics', '家電・生活機器', '["炊飯器 日本製", "電気ケトル 日本製", "ドライヤー 日本製", "電動シェーバー 日本製", "ラジオ 日本製"]'::jsonb, true),
  ('outdoor', 'スポーツ・アウトドア', '["水筒 日本製", "アウトドア 食器 日本製", "登山用品 日本製", "釣具 日本製", "スポーツタオル 今治"]'::jsonb, true),
  ('pet', 'ペット用品', '["犬 おやつ 国産 無添加", "猫 おやつ 国産 無添加", "ペット食器 日本製", "犬 ベッド 日本製", "猫砂 国産"]'::jsonb, true),
  ('diy', '工具・DIY・園芸', '["工具 日本製", "ニッパー 日本製", "剪定ばさみ 日本製", "園芸用品 日本製", "燕三条 工具"]'::jsonb, true)
on conflict (slug) do update set
  name = excluded.name,
  search_keywords = excluded.search_keywords,
  is_active = excluded.is_active;

-- 既存商品は再判定せず、商品名から明確に判別できるものだけ専門カテゴリへ移す。
-- 各商品は現行スキーマ上1カテゴリ所属のため、広い旧カテゴリから狭い新カテゴリへ整理する。
update products set category_slug = 'tableware'
where category_slug = 'kitchen'
  and title ~* '(食器|茶碗|湯呑|マグ|グラス|切子|カトラリー|箸|波佐見|美濃焼|有田焼)';

update products set category_slug = 'sweets'
where category_slug in ('food', 'gift')
  and title ~* '(和菓子|カステラ|羊羹|ようかん|せんべい|煎餅|ゼリー|最中|どら焼|まんじゅう)';

update products set category_slug = 'drinks'
where category_slug = 'food'
  and title ~* '(緑茶|日本茶|ほうじ茶|玄米茶|天然水|ミネラルウォーター|ジュース|甘酒)';

update products set category_slug = 'fashion'
where category_slug in ('towel', 'zakka')
  and title ~* '(靴下|パジャマ|日傘|豊岡鞄|バッグ|財布|ベルト)';

update products set category_slug = 'beauty'
where category_slug = 'zakka'
  and title ~* '(化粧水|美容液|シャンプー|日焼け止め|つげ櫛|爪切り|ヘアケア)';

update products set category_slug = 'home'
where category_slug = 'zakka'
  and title ~* '(家具|い草|ラグ|カーテン|収納|座椅子|置き時計|掛け時計)';

update products set category_slug = 'kids'
where category_slug in ('stationery', 'zakka')
  and title ~* '(おもちゃ|積み木|ベビー|ランドセル|知育)';

update products set category_slug = 'electronics'
where category_slug in ('kitchen', 'zakka')
  and title ~* '(炊飯器|電気ケトル|ドライヤー|シェーバー|ラジオ|家電)';

update products set category_slug = 'outdoor'
where category_slug in ('kitchen', 'towel', 'zakka')
  and title ~* '(アウトドア|キャンプ|登山|釣具|スポーツタオル)';

update products set category_slug = 'diy'
where category_slug in ('kitchen', 'zakka')
  and title ~* '(工具|ニッパー|ペンチ|剪定|園芸|ドライバーセット)';
