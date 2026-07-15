# ヒノマルシェ 引き継ぎ書(完全版)

最終更新: 2026-07-14 / 前任: Claude Code / 更新: Codex
このドキュメントは、プロジェクトの仕様・現状・制約・残作業のすべてを引き継ぐためのもの。
**コードを書く前に必ず「絶対に守るルール」と「ハマりどころ」を読むこと。**

---

## 1. プロジェクト概要

- **サイト名**: ヒノマルシェ(hinomarche)
- **ドメイン**: hinomarche.com(取得済み・未接続)
- **目的**: 日本とのかかわりが深い商品を中心に集めたアフィリエイトサイト。
  AI(Claude)が商品ごとの「**AI日本度**」(0〜100)を判定根拠つきで表示するのが独自価値
- **収益**: Amazonアソシエイト + 楽天アフィリエイト(もしもアフィリエイト経由)
- **キャッチコピー**: 「日本製品、買って応援。」
- **運営側の意図(サイトには書かない)**: 「日本度は高いが高価」vs「日本度は低いが安い」の
  2軸でユーザーが選ぶサイト。低スコア商品もスコア明示で掲載する

## 2. フォルダの場所

| 内容 | パス |
|---|---|
| **コード本体(このリポジトリ)** | `/Users/tk/Claude/hinomarche/` |
| 設計書(経緯・意思決定ログ) | `/Users/tk/Claude/japan-ec-site/設計書.md` |
| 環境変数(キー入り・Git管理外) | `/Users/tk/Claude/hinomarche/.env.local` |
| 環境変数テンプレート | `/Users/tk/Claude/hinomarche/.env.example` |
| DBスキーマ・マイグレーション | `/Users/tk/Claude/hinomarche/supabase/` |
| セットアップ手順 | `/Users/tk/Claude/hinomarche/README.md` |

## 3. 技術スタック

- **Next.js 16.2.10**(App Router / Turbopack)+ TypeScript + Tailwind CSS v4
  - ⚠️ Next.jsはトレーニングデータより新しい可能性が高い。
    **`node_modules/next/dist/docs/` に同梱ドキュメントがあるので、App Router関連を書く前に必ず参照**
    (例: `params`/`searchParams` は Promise になっており `await` が必要)
- **Supabase**(Postgres): 商品・判定データ。service_roleキーでサーバー側からのみアクセス
- **Claude API**: AI判定。モデルは `claude-haiku-4-5`、構造化出力(JSONスキーマ保証)使用
- デプロイ先(予定): Vercel。`vercel.json` に日次Cron設定済み

## 4. ソースコード全体図

```
src/
  app/
    layout.tsx              ヘッダー(DBからカテゴリ動的表示)+フッター(免責・Amazon必須文言)
    page.tsx                トップ: ヒーロー+高スコア商品12件+カテゴリ一覧
    category/[slug]/page.tsx 一覧: 並び順(日本度/新着/価格)+日本度帯フィルタ(high/mid/low)。
                              固有SEO文、canonical、構造化データ、絞り込みnoindex対応
    product/[id]/page.tsx   詳細: スコア・3要素チェック・根拠・購入ボタン2つ(後述)
    feature/page.tsx        購入目的別SEO特集の一覧
    feature/[slug]/page.tsx 購入目的別のSEO特集(現在15種、商品はDBから自動抽出)
    region/page.tsx         産地・工芸名別SEO特集の一覧
    region/[slug]/page.tsx  産地・工芸名別のSEO特集(現在7種、商品名表記から自動抽出)
    about/page.tsx          サイト趣旨+判定基準の説明
    disclaimer/page.tsx     免責事項(訴訟リスク対策の核。安易に変更しない)
    privacy/page.tsx        プライバシーポリシー(Amazonアソシエイト必須文言入り)
    contact/page.tsx        お問い合わせフォーム(メールアドレスは公開しない)
    api/contact/route.ts    フォーム送信先。service_roleで非公開テーブルに保存
    api/metrics/product-view/route.ts 個人を識別しない商品閲覧計測
    api/metrics/product-impression/route.ts 商品カードの匿名表示計測(最大20件のバッチ)
    admin/ranking/page.tsx  Basic認証必須の非公開ランキング画面(読み取り専用)
    admin/collections/page.tsx 特集・産地の28日成果とshadow候補を比較する非公開画面
    admin/surfaces/page.tsx 掲載面・表示位置ごとの匿名成果を比較する非公開画面
    go/[id]/route.ts        販売サイトへの安全なリダイレクト+匿名クリック集計
    not-found.tsx           404
    sitemap.ts / robots.ts / icon.svg / opengraph-image.tsx  SEO・メタ系(sitemapは1時間再生成)
    api/cron/ingest/route.ts Vercel商品収集Cron入口(Authorization: Bearer CRON_SECRET必須)
    api/cron/ranking/route.ts VercelランキングCron入口(同認証、収集と独立)
  components/
    ProductCard.tsx         商品カード(スコアバッジ+チェック+根拠2行+販売先への直接ボタン)
    ScoreRing.tsx           スコアバッジ: 全面塗りつぶし円。赤=90%以上/オレンジ=50-89/黄=~49。
                            黄のみ文字は墨色(コントラスト確保)。100%で日の丸になる意匠
    CheckMarks.tsx          3要素チェック表示(詳細用/カード用コンパクトの2種)
    ProductViewTracker.tsx  商品詳細の匿名閲覧イベント送信
    ProductImpression.tsx   50%以上を600ms表示した商品カードだけを匿名計測
  lib/
    types.ts                型定義(Product, Judgment, JudgmentChecks, Tier, tierOf)
    db.ts                   データ層。env未設定時はデモモード(src/data/demo-products.json)
                            SHOW_LOW_TIER=false で低スコア商品を非表示にできるトグルあり
    rakuten.ts              楽天API(2026年新仕様)+もしもリンク生成
    amazon.ts               Amazon Creators API(2026年新仕様、OAuth2)
    judge.ts                AI判定(スコア+根拠+3要素チェックをJSONスキーマ強制で取得)
    ingest.ts               収集パイプライン本体(cron/ローカル共用)
    ranking.ts              28日間の閲覧/クリックでshadow候補順位を日次計算
    product-metrics.ts      掲載面・文脈slug・表示位置の検証とURL生成
    request-security.ts     同一サイト操作/一般的なボットの判定(計測ノイズ抑制)
    crosslinks.ts           相互送客リンク(楽天商品→Amazon検索 / Amazon商品→楽天検索)
    category-content.ts     23カテゴリ固有の検索説明文・画面導入文
    format.ts               価格・日付フォーマッタ
scripts/
  ingest.ts                 ローカル収集: npm run ingest
  judge-backlog.ts          商品再検索なしで判定待ちを追加消化
  rejudge.ts                チェック未付与の商品だけ再判定(判定スキーマ変更時に使う)
supabase/
  schema.sql                初期スキーマ(新規プロジェクト用。マイグレーション適用済みの完全版)
  migrations/002_add_checks.sql       3要素チェック列追加(適用済み)
  migrations/003_more_categories.sql  カテゴリ追加(適用済み)
  migrations/004_security_hardening.sql RLS/ビュー強化(適用済み)
  migrations/005_market_ranking.sql   市場需要スコア(適用済み)
  migrations/006_contact_messages.sql お問い合わせ保存(適用済み)
  migrations/007_commercial_category_keywords.sql 商用キーワード/カテゴリ(適用済み)
  migrations/008_outbound_clicks.sql  販売サイト移動計測(適用済み)
  migrations/009_shadow_ranking.sql   閲覧計測/shadow順位(適用済み)
  migrations/010_expand_commercial_categories.sql カテゴリ18種へ拡張(適用済み)
  migrations/011_expand_digital_categories.sql デジタル系5カテゴリ追加(適用済み)
  migrations/012_product_surface_metrics.sql 掲載面別の匿名表示/移動計測(適用済み)
  migrations/013_surface_position_performance.sql 掲載位置別の非公開集計ビュー(適用済み)
```

## 5. データモデル(Supabase)

- `categories`: slug / name / search_keywords(jsonb配列) / is_active
  - **カテゴリ追加・キーワード変更はSQLだけで完結**(コード変更不要。ヘッダーのナビも自動反映)
  - 011適用後は23カテゴリ。Amazon・楽天の主要売場をヒノマルシェ向けに再構成
- `products`: source('rakuten'|'amazon') + source_item_id でユニーク。affiliate_url, price,
  price_updated_at, is_published など
- `judgments`: 判定履歴(追記型。表示は最新を使う)。score, tier('high'|'mid'|'low'),
  evidence_type, evidence_text, origin_check/company_check/material_check('yes'|'unknown'|'no')
- `products_with_judgment`: 最新判定をJOINしたビュー。**サイト表示は必ずこのビューを読む**
- 商品詳細はGoogleのProduct snippet向け構造化データとBreadcrumbListを出力。AI日本度をレビュ評価として送信しない
- カテゴリ一覧は23カテゴリ固有のtitle/description/導入文を持ち、BreadcrumbListとItemListを出力。
  並び替え・日本度絞り込みURLはcanonicalをカテゴリ基本URLへ向け、`noindex, follow`で重複登録を避ける
- 表示用商品名は先頭の期限付き販促文を除き、64文字以内に整形。DBの原文と販売先リンクは変更しない
- `outbound_clicks`: 商品から販売サイトへの移動数。掲載面・文脈slug・表示位置も記録する。IP/Cookie/User-Agent/セッションIDは保存しない。anon/authenticatedに権限なし
- `product_page_views`: 商品閲覧数。商品IDと時刻のみ。anon/authenticatedに権限なし
- `product_impressions`: 商品カードが50%以上、600ms表示された回数。商品ID・掲載面・文脈slug・表示位置・時刻のみ。anon/authenticatedに権限なし
- 閲覧・外部移動の集計は本番環境の同一オリジン操作だけを記録し、ローカル確認では書き込まない
- `ranking_snapshots`: `commercial-v2` の日次計算結果。掲載表示があれば一覧CTRを使い、クリック数は表示数以下に制限する。現在は `shadow` のみで表示順には未反映
- `surface_position_performance_28d`: 掲載面・表示位置別の28日集計。匿名権限からは読めず、位置補正前の観測専用
- AI判定待ちの商品は、各カテゴリ内で `featured_score` / `demand_score` / `search_rank`
  を優先し、カテゴリを一巡ずつ処理する。売れ筋優先とジャンル偏り防止を両立するため。
- 収集対象カテゴリは日替わり、カテゴリ内の検索語はカテゴリ別の週次ローテーション。
  同じ日付剰余を使って特定の検索語だけが選ばれ続ける偏りを防ぐ。
- RLS有効。匿名キーは公開商品の読みのみ。書き込みはservice_roleキー経由のみ
- 全ページにCSP / COOP等を付与。問い合わせAPIは同一オリジン・JSON形式・16KB以下、
  商品閲覧計測は同一オリジン・JSON 1KB以下、商品表示計測は同一オリジン・JSON 10KB以下かつ20件以下に限定する。

現状データ(2026-07-14時点): **公開商品925件**。同日のshadowランキング839件を生成済み
(ランキングは重点補充前のスナップショット。次回Cronで925件へ更新予定)。
収集とランキングはVercel Hobbyの60秒上限に合わせて独立Cron化済み。
未判定バックログは日次Cronでカテゴリを一巡しつつ需要順に消化する。
ローカルの `judge:backlog` は `INGEST_CREATED_AFTER` を指定すると、その日時以降に
収集した候補だけを対象にできる。新しい売場テーマを優先公開するときに使う。
23カテゴリの検索向け固有説明・canonical・構造化データ対応は実装・ローカル検証済み。
カテゴリ充足度による自動優先を実装し、全23カテゴリを最低12件まで重点補充済み。
購入目的・商品別の特集は15件。`/feature` の一覧、TOP導線、sitemap、構造化データに反映済み。

## 6. 外部API仕様(2026年の重要変更を含む)

### 楽天(2026年2月に全面刷新済み。ネット上の古い記事に注意)
- エンドポイント: `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601`
  (旧 `app.rakuten.co.jp` は2026-05-14停止済み)
- 認証: `applicationId`(UUID) + `accessKey`(pk_...) を**両方クエリパラメータで**渡す
- **Refererが必須**。Node.jsのfetchではヘッダー直指定が無視されるため
  `referrer: "https://hinomarche.com/"` オプションで渡している(rakuten.ts参照)
- 楽天側のアプリ設定で「APIアクセススコープ→楽天市場API」と「許可されたWebサイト」の登録が必要(設定済み)
- レート: 約1リクエスト/秒に自制(ingest.tsのsleep(1100))

### 楽天の報酬リンク = もしもアフィリエイト経由
- 形式: `https://af.moshimo.com/af/c/click?a_id=<MOSHIMO_A_ID>&p_id=54&pc_id=54&pl_id=616&url=<encodeURIComponent(商品URL)>`
- 楽天アフィリエイト直は使わない(もしもは現金振込+W報酬のため)

### Amazon(旧PA-APIは2026-05-15廃止 → Creators API)
- トークン: `POST https://api.amazon.co.jp/auth/o2/token`(日本=認証情報バージョン3.3)、
  JSONボディ `{grant_type: "client_credentials", client_id, client_secret, scope: "creatorsapi::default"}`
- API: `POST https://creatorsapi.amazon/catalog/v1/searchItems`
  - ヘッダー: `Authorization: Bearer <token>, Version 3.3` / `x-marketplace: www.amazon.co.jp`
  - フィールドはlowerCamelCase(keywords, partnerTag, itemCount, resources)
  - 価格は `offersV2.listings[0].price.money.amount`
- ⚠️ **現在403 AssociateNotEligible**: アカウントが「直近180日で売上3件」要件を満たすまで
  商品検索は使えない。**認証情報は正しい**(トークン発行は成功する)。
  ingest.tsはこの応答を検知してその回のAmazon収集を自動スキップする。
  資格を満たせばコード変更なしで自動的に収集が始まる設計

### Claude API(AI判定)
- `claude-haiku-4-5` + `output_config.format`(json_schema)で構造化出力を強制
- 出力: score(0-100), evidence_type(産地表記|日本メーカー|生産国表記|推定),
  evidence_text(サイトにそのまま表示される), confidence, checks{origin, company, material}
- 判定基準はjudge.tsのSYSTEM_PROMPTに集約。**過大評価しない(情報不足は低め)が大原則**
- コスト: 約0.3〜0.5円/商品。判定は新商品のみ(価格更新にAIは使わない)

## 7. 収集パイプラインの動き

```
毎日03:00 JST台 (Vercel Cron → /api/cron/ingest、ローカルは npm run ingest)
1. 公開数が既定12件未満のカテゴリを少ない順に優先。判定待ちが目標分あれば商品API検索を省略し、
   既存候補を消化する。全カテゴリが目標到達後は1日4件ずつ日替わり巡回し、各1検索語で楽天(+資格回復後Amazon)を検索(30件/キーワード)
2. 新商品はINSERT、既存商品は価格・画像・リンクを更新(price_updated_at更新)
3. 未判定商品(is_published=false)を古い順にINGEST_MAX_NEW件(Vercel既定5、ローカル既定30)AI判定
4. 判定を保存し全tier公開(is_published=true)
```

- 判定しきれない分はバックログとして翌日以降に自動消化される(取りこぼしなし)
- 既知の限界: 検索上位30件から外れた商品の価格は更新されない
  → だから全価格に「YYYY/MM/DD時点」を必ず表示している(対策込みの仕様)
- `scripts/rejudge.ts` は「最新判定にチェックが無い商品」だけを再判定する
  (判定スキーマを変えたときに全件へ反映する用途。二重課金しない作り)

## 8. 環境変数(.env.local / Vercelに同じものを設定)

| 変数 | 内容 |
|---|---|
| SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY | Supabase接続(service_roleはサーバー専用) |
| RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY | 楽天新API(アプリケーションID=UUID / アクセスキー=pk_...) |
| MOSHIMO_A_ID | もしもの楽天用a_id(数字) |
| AMAZON_CREDENTIAL_ID / AMAZON_CREDENTIAL_SECRET | Creators API認証情報 |
| AMAZON_PARTNER_TAG | トラッキングID = **hinomarche-22**(旧yamatoll-22は使わない) |
| ANTHROPIC_API_KEY | AI判定用 |
| CRON_SECRET | Cronエンドポイント認証(VercelがAuthorizationヘッダーに付ける) |
| ANALYTICS_ADMIN_USERNAME / ANALYTICS_ADMIN_PASSWORD | `/admin/ranking` のBasic認証。未設定時は503で閉じる |
| INGEST_MAX_NEW | 1回の収集でAI判定する上限(Vercel既定5、ローカル既定30) |
| INGEST_CATEGORIES_PER_RUN | Vercelの1回の実行で処理するカテゴリ数(既定4) |
| INGEST_MIN_CATEGORY_PRODUCTS | 最低公開商品数(既定12)。不足カテゴリを自動優先 |
| INGEST_KEYWORDS_PER_CATEGORY | 1カテゴリあたりの検索語数(Vercel既定1、ローカル既定2) |
| INGEST_CATEGORY_SLUGS | ローカルで特定カテゴリだけ収集する場合のslug(カンマ区切り) |
| SHOW_LOW_TIER | falseで低スコア商品を非表示(既定true) |

**全部未設定でも動く**: デモモード(サンプル12商品)になる。UI開発はキーなしで可能。

運営ランキングは例外で、`ANALYTICS_ADMIN_PASSWORD` 未設定時は安全側に倒して利用不可。
`src/proxy.ts` が `/admin/:path*` だけを保護し、認証失敗時はDB問い合わせ前に401を返す。
検索登録・キャッシュを禁止し、画面は読み取り専用。公開ナビからリンクしない。

## 9. 絶対に守るルール(法令・規約対応。ユーザーの強い意向)

1. **言い切らない**: 「日本製の商品**だけ**を集めた」等の断定表現はNG(虚偽表示リスク)。
   「日本とのかかわりが深い商品を中心に」のニュアンスを守る
2. **AI判定は必ず「AI推定」であることとセットで表示**し、判定根拠(evidence_text)を添える。
   価格には取得日時を明示
3. **フッターのAmazon必須文言を消さない**:
   「Amazonのアソシエイトとして、ヒノマルシェは適格販売により収入を得ています。」
   (削除するとアソシエイト規約違反で提携解除リスク)
4. **2軸コンセプトはサイト上で語らない**: 「選ぶのはあなた次第」系の文言をユーザーに
   向けて書かない(運営側の意図であって、ユーザーへの説明は不要という方針)
5. 免責事項(/disclaimer)の「法令上責任を負うべき場合を除き」の限定文言は変えない
   (「一切責任を負わない」と言い切ると消費者契約法上かえって無効になりやすい)
6. `.env*` はGit管理外(.gitignoreで除外済み、.env.exampleのみ例外)。キーのハードコード禁止

## 10. デザインシステム

- パレット(globals.cssのCSS変数): washi(生成り#f6f2e9)/sumi(墨#221f1a)/
  hinomaru(緋#bc002d)/kin(金#b08d3e)/line(罫線#d9d2c0)。和紙質感のノイズ背景
- フォント: しっぽり明朝(見出し `.font-mincho`)+Zen角ゴシック(本文)。next/font/google
- スコアバッジ(ScoreRing): **全面塗りつぶし円**。赤(#bc002d)=90%以上/オレンジ(#d76e1e)=50-89/
  黄(#e8c04a)=~49。文字は赤・オレンジ=白、黄=墨。「100%で日の丸」がコンセプト
- 3要素チェック: ○(緋)=確認あり/△(金)=記載なし/✕(灰)=海外・該当せず
- モバイル: ヘッダーはロゴ行+ナビ行の2段(ナビ横スクロール)。フィルタはラベル上+チップ横スクロール
- モバイル商品カード: 2列を維持し、画像・商品名3行・価格・販売先レビュー・AI根拠3行・購入ボタンを優先。
  AIスコアは画像右下に重ね、3要素チェックは一覧では隠して商品詳細だけに表示する
- ユーザーのデザイン好み: 現状の高級和風は暫定OK。**本来はもっと大衆的・カジュアル志向**。
  将来リデザインの可能性あり

## 11. 相互送客ボタン(商品ページ)

- 主ボタン: 掲載元モールの商品ページ(affiliate_url)
- 副ボタン: 他モールの**商品名検索結果**へ(crosslinks.ts)。
  楽天商品→`amazon.co.jp/s?k=<クエリ>&tag=hinomarche-22`、Amazon商品→楽天検索(もしもラップ)
  - クエリは商品名から【販促文言】を除去して先頭5語
  - 「同一商品とは限りません」の注記必須(誤認防止)
  - Amazon検索リンクの成約は売上実績になり、API資格(売上3件)の獲得導線を兼ねる
- TOP・カテゴリ・特集・産地・関連商品の各カードにも掲載元モールへの直接ボタンを表示。
  `/go/[id]?target=primary` を通すため、URL検証と匿名クリック集計は商品詳細と共通

## 12. 残作業(優先順)

1. **Vercelデプロイ + hinomarche.com接続**(最後の公開ステップ)
   - GitHub push → Vercelインポート → 環境変数登録 → ドメイン接続
   - CRON_SECRETをVercelに設定するとCronが認証付きで動く
   - Vercel Hobbyは関数最大60秒。収集はカテゴリ分割、ランキングは独立Cronで実行
2. Supabase SQL Editorで `supabase/migrations/006_contact_messages.sql` を適用
3. Amazon売上3件 → Creators API資格獲得(自動でAmazon商品収集開始)
4. AI判定プロンプトのブラッシュアップ(ユーザー意向。特に根拠文の品質)
5. 産地特集ページ(/region/燕三条 など)= SEOの本命(設計書に構想あり)
6. 検討中の未決事項: スコア帯フィルタの「高(80%〜)」とバッジ色の「赤(90%〜)」の境界不一致を
   揃えるか(ユーザー未回答)

## 13. ハマりどころ(実際に踏んだ罠)

- **`.env.local`をユーザーがTextEditで編集すると古い内容で上書き事故が多発した**。
  変更はプログラム(sed等)で行い、ユーザーには手編集させないのが安全
- ネット上の楽天API/Amazon APIの記事は**2026年の刷新前の情報が大半**。この文書の§6が正
- Next.jsの`params`/`searchParams`はPromise(awaitが必要)。同梱docsを参照
- devサーバーは環境変数を起動時にしか読まない。.env.local変更後は再起動
- 楽天APIのRefererはfetchの`referrer`オプションで(ヘッダー直指定は無視される)
- Amazonの検索結果は`json.searchResult.items`、商品URLフィールドは`detailPageURL`(URLが大文字)
- tsxでのインラインスクリプトはトップレベルawait不可(CJS)。`import(...).then()`パターンを使う
- ローカルでの長時間バッチはMacのスリープで止まる。`caffeinate`併用か電源接続を案内する
