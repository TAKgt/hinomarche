# 現状監査・公開前パッケージ・28日計測計画

監査開始: 2026-08-23 JST
最終ローカル検証: 2026-08-24 JST

## 確認済みの事実

### ローカルDBと監査

- 公開商品880件のうち、technical / sitemap対象は171件、対象外は709件だった。
- 公開商品の最終確認30日超は704件だった。直近30日の確認済みは176件、1日換算5.87件で、公開880件を維持するのに必要な29.33件/日には届かない。
- 現在のtechnical対象171件を維持する必要量は5.7件/日で、観測値とほぼ同じである。余裕を持たせた維持候補は140件だった。
- 商品検索titleの60文字超は0件、販売元抜粋の600文字超は0件、`data-nosnippet`欠落は0件だった。
- title重複は1組・2ページだけ残った。匿名の読み取り確認では、元の商品識別子と販売先URLが異なる別商品で、元titleの末尾も異なっていた。一方、確認済みの型番・仕様・容量差は抽出できなかったため、canonical統合も自動改名も行わず警告を維持した。
- 既定の鮮度pilotはDB読み取り2回だけを行い、対象カテゴリ内266件、現在公開121件、technical対象2件、最終確認30日超119件を匿名集計した。商品API、DB書き込み、AI APIは0回だった。

### 公開サイト

- `robots.txt`と`sitemap.xml`はHTTP 200で、robotsにはsitemap指定があった。
- 公開sitemapは227 URLで、内訳は商品171、カテゴリ23、特集17、産地8、ホーム1、その他7だった。
- TOP、燕三条、包丁、今治、日本茶、炊飯器、匿名の代表商品はHTTP 200、H1は各1件、canonicalは自己参照、JSON-LDの構文エラーは0件だった。
- TOPから4つの優先テーマと包丁への通常リンクを確認した。
- 公開商品ページには、ローカル未公開のtitle短縮・販売元600文字抜粋・`data-nosnippet`がまだ反映されていなかった。

### Search Console

比較期間は直近28日と前28日である。

| 指標 | 直近28日 | 前28日 |
|---|---:|---:|
| クリック | 4 | 10 |
| 表示 | 135 | 62 |
| CTR | 3.0% | 16.1% |
| 平均順位 | 22.5 | 29.8 |

優先ページの直近表示は、燕三条39、今治16、日本茶13、包丁12だった。炊飯器は上位表示行から確認できず、少なくともtitle/H1変更を判断できる母数はなかった。個別ページ30表示の基準を超えたのは燕三条だけである。

Search Consoleに登録済みのsitemapは成功状態だったが、検出URLは969、最終読み取りは2026-07-27で、現在公開中の227 URLとは時点が異なる。再送信は行っていない。

### GA4

比較期間は2026-07-26〜2026-08-22と2026-06-28〜2026-07-25である。

| Organic Search | 直近28日 | 前28日 |
|---|---:|---:|
| セッション | 20 | 2 |
| エンゲージのあったセッション | 10 | 1 |
| エンゲージメント率 | 50% | 50% |
| 平均エンゲージメント時間 / セッション | 25秒 | 7秒 |
| イベント | 76 | 7 |
| キーイベント | 0 | 0 |
| 収益 | 0円 | 0円 |

Search ConsoleのクリックとGA4のセッションは定義が異なるため一致を求めない。これらは現在公開中のサイトの観測値で、未公開のローカル変更による効果ではない。

## 推定

- 自然検索の表示機会と平均順位は改善した一方、クリックは減っている。母数が小さく期間内のクエリ構成も変わるため、titleだけを原因とは断定できない。
- 30日鮮度による709件のtechnical除外が、商品URLの検索露出とテーマページからの有効な回遊先を制限している可能性が高い。ただし、鮮度回復だけで順位やクリックが増えるとは断定できない。
- sitemapの検出969は古い状態を含む可能性が高い。成功状態なので、ローカル変更の公開前に再送信する根拠はない。

## 未確認事項

- 楽天APIを1回使った場合の既存一致数、technical復帰候補、入力変更、AI再判定候補、処理時間。
- 楽天APIのアカウント側の現行料金・割当と、AI再判定を将来行う場合の現行料金。公開利用規約には、別途料金を定め得る旨はあるが、1リクエストの金額は示されていなかった。
- Search Console上位行に出なかった炊飯器ページの正確な表示数。
- 燕三条pilot原稿の一次情報4資料の人手確認日。AIによる事前確認は完了しているが、人手確認済みとは扱わない。

## 検索流入ページの判断

- 燕三条: 既存の原稿一式はsource ledger、H1候補、H2構成、本文、編集レビュー、fact auditまで揃っている。編集評価12/12、fact auditは支持あり20・支持なし0だが、一次情報4資料が人手未確認のためローカル下書きのまま保持する。公開ページ本文へ移植しない。
- 今治、日本茶、包丁、炊飯器: 直近28日で30表示未満、または正確な母数を確認できない。CTRだけを理由にtitle・H1を変更しない。既存の比較・目的別導線を維持する。
- 防災、菓子、ペット、波佐見焼などの保留テーマは追加しない。

## 公開前パッケージの分離

### 今回追加した鮮度pilot

- `src/lib/index-refresh-pilot.ts`
- `src/lib/index-refresh-pilot.test.ts`
- `scripts/index-refresh-pilot.ts`
- `package.json`のpilotコマンド・テスト追加部分
- `README.md`のpilot説明部分
- `article-work/access-growth-2026-08-23/01-index-refresh-pilot.md`
- 本文書

### 既存の未公開アクセス改善として一緒に公開候補となる差分

- 商品URL・sitemap・canonical・404・構造化データ・画像読み込みの改善と対応テスト
- 商品検索title、description、販売元抜粋、`data-nosnippet`の改善と監査
- カテゴリページ送り、目的別内部リンク、優先テーマ導線と対応テスト
- localhostで匿名計測を書き込まないrequest guardと回帰テスト
- index品質監査、鮮度planner、ローカルSEO監査と作業記録

これらは相互依存する未公開差分があるため、公開時にはファイル単位だけでなく`git diff`のhunk単位でも再確認する。今回追加したpilotだけを先にcommitする場合は、既存変更を含む`package.json`と`README.md`を丸ごとstageしない。

### 今回の公開対象へ自動で含めない既存作業

- `article-work/about-trust-policy-2026-07-28/`
- `article-work/editorial-evidence-policy/`
- `article-work/hinomarche-value-proposition/`
- `article-work/imabari-furusato-guide-2026-07-28/`
- `article-work/japanese-green-tea-guide-2026-07-29/`
- `article-work/product-evidence-gst-b46-2026-08-09/`
- `article-work/rice-cookers-guide-2026-07-29/`
- `article-work/search-intent-features/`
- `article-work/tsubame-sanjo-guide-2026-07-29/`

これらは既存の別作業として保持し、内容の正当性や公開承認を今回の監査で代替しない。

### 常に除外するもの

- `.env.local`、`.env.*`の実値、APIキー、Cookie、認証情報、個人情報
- `.backups/`、`.next/`、`*.tsbuildinfo`、ローカルログ、スクリーンショット、一時ファイル
- 商品ID、商品名、商品URLを列挙する調査出力

## 最終ローカル検証

- `npm run lint`: warning 0、pass
- `npx tsc --noEmit`: pass
- 全テスト: 96 / 96 pass
- `npm run build`: Next.js 16.2.10、45ページの静的生成を含めてpass
- `npm run audit:product-metadata`: 171商品、title 60文字超0、販売元抜粋600文字超0、既知のtitle重複1組・2ページだけwarning
- `npm run audit:local-seo -- --base-url=http://127.0.0.1:3210`: sitemap 227 URLとページ送り8件、合計235ページを巡回。非200、H1、canonical、noindex、metadata欠落、孤立、内部リンク規則、構造化データ、画像、販売元抜粋、404の必須不備は0
- desktop 1280×900とmobile 390×844: TOP、燕三条、匿名の商品ページでH1各1、titleあり、canonical一致、横はみ出し0。商品ページのCTAと販売元抜粋を画像で確認し、抜粋は`data-nosnippet`付きだった
- 外部画像などlocalhost以外のリソースを遮断して表示確認した。計測APIへのlocalhost POSTは2画面幅とも`accepted:false`、`accepted:true`は0件だった
- QA前後の匿名集計は`product_page_views` 48→48、`product_impressions` 608→608で、DB書き込み増分0件だった
- 本番サイト、Search Console、GA4は読み取りだけ。商品API、AI API、commit、push、PR、deploy、Search Console再送信は0件

最初のローカルSEO巡回は、隔離されたコマンド環境から別のlocalhost実行環境へ到達できず失敗した。同じコードをサーバーと同じローカル実行環境で再実行して合格したため、アプリまたは監査ロジックの不具合ではない。

## 公開後の計測計画

公開日は`D0`とし、公開直前28日を固定baselineにする。Search ConsoleとGA4で取得不能な値は`null / warning`とし、0へ置き換えない。

| 時点 | 確認内容 | 判断 |
|---|---|---|
| D1 | 公開URLの200、canonical、robots、sitemap、JSON-LD、H1、CTA、販売元抜粋、横はみ出し、計測異常 | 技術・安全不具合だけを修正し、順位やCTRでは再編集しない |
| D7 | Search Consoleの表示・クリック・平均順位、GA4 Organic Search、priority landing、technical対象、30日超、エラー | 索引・計測の異常を確認する早期点検。効果を断定しない |
| D14 | D7と同じ指標を固定条件で中間記録。燕三条と他テーマを分ける | 誤検索意図または安全問題がなければtitle/H1を動かさない |
| D28 | 公開後28日と直前28日で表示、クリック、CTR、平均順位、Organic Searchを比較 | 各指標を別々に評価し、総合値だけで成功・失敗を決めない |

D28でも個別ページが30表示未満ならCTRをtitle/H1変更の根拠にしない。30表示以上あり、平均順位が同程度なのにクリックが継続して少ない場合だけ検索結果文言を検討する。表示が増えて平均順位が低い場合は、title変更より一次情報、内部リンク、有効な商品URLの鮮度を先に見直す。

商品鮮度pilotを別途実行した場合は、対象カテゴリのtechnical復帰数、30日超の減少、入力変更によるpending数、AI未実行数、rollback有無もD1/D7/D14/D28へ併記する。
