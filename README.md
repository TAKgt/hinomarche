# ヒノマルシェ (hinomarche.com)

日本とのかかわりが深い商品を中心に集めたセレクト型アフィリエイトサイト。
楽天市場・AmazonのAPIから商品を自動収集し、Claude AIが「日本関連度」を判定根拠つきでスコア化して掲載する。
低スコア商品もスコアを明示して掲載し、「日本度は高いが価格も高い」「日本度は低いが手頃」の
2軸でユーザーが選べるのがコンセプト(※これは運営側の意図。サイト上でユーザーに向けて
「選ぶのはあなた」等と説明する文言は載せない方針)。
低スコア商品の表示は `SHOW_LOW_TIER=false` でいつでもオフにできる。
TOPページとカテゴリの既定順は、AI日本度に加えて検索順位・レビュー・料率などの市場性シグナルを加味した
「注目順」で表示する。
商品詳細はProduct/BreadcrumbList構造化データを出力し、購入目的・商品別の15特集を
`/feature/*` で公開する。特集一覧は `/feature`、産地・工芸名別の一覧は `/region`、各7特集は `/region/*` で公開する。
特集商品は公開済みDBから条件に合うものを自動抽出する。
全ページにCSP等のセキュリティヘッダーを付与し、問い合わせ・計測JSONは同一オリジン確認と本文サイズ制限を行う。

※ コピーライティング注意: 「日本製の商品**だけ**を集めた」のような断定表現は使わない。
実際の生産国はAI推定であり、断定すると虚偽表示になるリスクがある。

- 設計書: `~/Claude/japan-ec-site/設計書.md`
- スタック: Next.js (App Router) + Tailwind v4 + Supabase + Claude Haiku

## いますぐ動かす(デモモード)

APIキーが一切なくても、サンプル商品12件で動作確認できます。

```bash
npm install
npm run dev
# http://localhost:3000
```

環境変数が未設定のときは自動的にデモモード(`src/data/demo-products.json` を表示)になります。

## 本番セットアップ手順

### 1. 環境変数を用意

```bash
cp .env.example .env.local
```

`.env.example` の各項目のコメントに、キーの入手先を書いてあります。

| キー | 入手先 |
|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | supabase.com → Project Settings → API。公開読み取りはanon、収集・書き込みはservice_role |
| `RAKUTEN_APP_ID` | webservice.rakuten.co.jp → アプリID発行(楽天会員なら即時) |
| `MOSHIMO_A_ID` | もしも管理画面 → 楽天市場プロモーション → どこでもリンクのa_id |
| `AMAZON_CREDENTIAL_ID` / `AMAZON_CREDENTIAL_SECRET` / `AMAZON_PARTNER_TAG` | アソシエイト管理画面 → ツール → Creators API(旧PA-APIは2026年5月廃止) |
| `ANTHROPIC_API_KEY` | platform.claude.com → API Keys |
| `CRON_SECRET` | ランダムな長い文字列を自分で生成(例: `openssl rand -hex 32`) |
| `ANALYTICS_ADMIN_PASSWORD` | `/admin/ranking`専用。32バイト以上のランダム値をVercelだけに設定 |
| `NEXT_PUBLIC_SITE_URL` | 本番URL。通常は `https://www.hinomarche.com` |

### 2. Supabaseにテーブルを作る

Supabaseダッシュボード → SQL Editor に `supabase/schema.sql` の中身を貼り付けて実行。
23カテゴリまで自動で入ります。

既存DBに公開前セキュリティ強化だけを適用する場合は、SQL Editorで
`supabase/migrations/004_security_hardening.sql` を実行してください。
`products_with_judgment` ビューにRLSを効かせ、未公開商品の判定履歴が匿名キーから見えないようにします。
サイトマップは1時間ごとに再生成され、Cronで追加公開した商品も次の更新で反映されます。

TOP/カテゴリの「注目順」を有効にするには、続けて
`supabase/migrations/005_market_ranking.sql` も実行してください。

お問い合わせ保存先と匿名の販売サイト移動数を記録する場合は、続けて
`supabase/migrations/006_contact_messages.sql` と
`supabase/migrations/008_outbound_clicks.sql` を実行してください。
匿名の商品閲覧数とshadowランキングを使う場合は、続けて
`supabase/migrations/009_shadow_ranking.sql` を実行します。
商品カードの表示数、掲載面、表示位置を匿名で比較する場合は
`supabase/migrations/012_product_surface_metrics.sql` も実行します。
商品検索結果の表示位置も同じ匿名集計に含める場合は
`supabase/migrations/014_product_search_surface.sql` も実行します。検索語自体は保存しません。
計測テーブルにIPアドレス、Cookie、User-Agent等は保存しません。

### 3. 商品を収集する

```bash
npm run ingest
```

収集済みの判定待ち商品だけを追加で30件公開する場合。公開数が12件未満のカテゴリを自動優先します:

```bash
npm run judge:backlog
```

直近に収集した候補だけをカテゴリ指定で判定する場合は、`INGEST_CATEGORY_SLUGS` と
`INGEST_CREATED_AFTER`(ISO 8601)を一時指定します。既存の判定待ち商品は変更しません。

カテゴリの検索キーワードで楽天・Amazonを検索 → 新商品をAI判定 → 判定済み商品を自動公開(低スコアも公開)。
1回の実行で判定するのは、ローカルは新規30件、Vercelは新規5件まで
(`INGEST_MAX_NEW`で変更可)。公開数が `INGEST_MIN_CATEGORY_PRODUCTS`(既定12件)未満の
カテゴリがある間は、公開数の少ない棚を優先します。判定待ち候補が目標数まで揃っている
カテゴリは商品APIを再検索せず、既存候補を需要順にAI判定して公開します。
全カテゴリが目標に達すると、Vercelでは1日4カテゴリの日替わり巡回へ戻ります。
カテゴリ内の検索語は週ごとに順送りし、カテゴリ巡回と周期が重なって同じ検索語へ
偏り続けないようにしています。
ローカルでは各カテゴリの検索語を1回2件ずつ巡回します
(`INGEST_KEYWORDS_PER_CATEGORY`で変更可)。カテゴリ増加後もAPI費用とCron時間が
急増しないための上限です。
ローカルで特定カテゴリだけ収集する場合は、実行時に
`INGEST_CATEGORY_SLUGS=smartphone,computer`のように指定できます。
`npm run dev` で実データが表示されるようになります。

### 4. Vercelにデプロイ

1. GitHubにpush → vercel.com でImport
2. 環境変数(`.env.local` と同じもの)をVercelのプロジェクト設定に登録
   - `SUPABASE_ANON_KEY` と `NEXT_PUBLIC_SITE_URL=https://www.hinomarche.com` も忘れずに設定
3. `vercel.json` のCron設定により、毎日 03:00 JST台に `/api/cron/ingest`、
   05:00 JST台に `/api/cron/ranking` が自動実行される
   (VercelがCRON_SECRETを`Authorization`ヘッダーに付けて叩く)
4. Settings > Domains で `hinomarche.com` を追加し、ドメイン側のネームサーバー/DNSを案内どおり設定

ランキング用Cronは `commercial-v2` の候補順位を収集と独立して計算し、
`ranking_snapshots` に `shadow` として保存します。shadow期間中はサイトの表示順を変更しません。

### 5. 非公開の運営ランキング

`/admin/ranking` では、直近28日の商品カード表示・掲載面からの販売サイト移動・CTRとshadow候補順位を確認できます。
`/admin/collections` では、各特集・産地の掲載面ごとの表示・移動実績を比較できます。
`/admin/surfaces` では、掲載面・表示位置ごとのCTRを比較し、位置による有利不利を確認できます。
`/admin/funnel` では、商品別のカード表示・詳細閲覧・販売サイト移動を比較できます。
新しい個人情報やCookieは収集せず、既存の匿名集計のみを使います。
30反応・3移動以上のコレクションだけにshadow候補を出し、公開順は自動変更しません。
公開サイトからのリンクはなく、`ANALYTICS_ADMIN_PASSWORD` が未設定なら503で閉じます。
Basic認証のユーザー名は既定で `hinomarche` です
(`ANALYTICS_ADMIN_USERNAME` で変更可)。検索エンジン登録とブラウザキャッシュは禁止しています。
この画面は読み取り専用で、表示順位や商品データを変更しません。

※ Vercel無料(Hobby)プランは各Cronが1日1回・実行時刻は指定時間内で最大59分の幅があり、
関数実行は最大60秒です。
収集が時間内に終わらない場合は `INGEST_MAX_NEW` を小さくするか、ローカルで `npm run ingest` を回してください。

## カテゴリの増やし方(コード変更不要)

SupabaseのSQL Editorで categories を操作するだけ:

```sql
-- フェーズ2カテゴリを有効化
update categories set is_active = true where slug in ('towel', 'stationery');

-- 検索キーワードを追加
update categories
set search_keywords = search_keywords || '["山中漆器"]'::jsonb
where slug = 'kitchen';
```

次回の収集(Cronまたは `npm run ingest`)から反映されます。

## 構成

```
src/
  app/                  ページ(トップ / category / product / about / api/cron/ingest)
  components/           ProductCard, ScoreRing(日の丸スコアゲージ)
  lib/
    db.ts               データ層(Supabase / デモモード自動切替)
    rakuten.ts          楽天市場API + もしもリンク生成
    amazon.ts           Amazon Creators API(2026年仕様、OAuth2)
    judge.ts            Claude Haiku 日本関連度判定(構造化出力)
    ingest.ts           収集パイプライン
  data/demo-products.json  デモ商品
scripts/ingest.ts       ローカル収集: npm run ingest
supabase/schema.sql     DBスキーマ(SQL Editorで実行)
vercel.json             日次Cron設定
```

## 法令対応で守っていること(変更時に注意)

- スコアには必ず「**AI推定**」と明記し、判定根拠を添える(景品表示法・優良誤認の回避)
- 「日本製」と断定表記するのは evidence_type が産地表記のときだけ
- 価格には取得日時を表示(モール規約の価格鮮度ルール)
- 全ページフッターにアフィリエイト参加の明示(ステマ規制対応)
- 低スコア商品も掲載するが、スコアと根拠(例: 「生産国: 中国と明記」)を必ず表示する
