# クリーンURL・構造化データ・404回復導線の実装記録

実装日: 2026-08-19 JST

検索流入、クロール効率、商品詳細の初期表示、404からの復帰を改善するため、ローカル実装と回帰確認を行った。commit、push、deploy、本番確認、外部アカウント操作、商品再取得、AI再判定、依存関係変更、`.env.local`変更は行っていない。アクセス増加は未実測であり、公開後にSearch ConsoleやGA4等で期間比較する必要がある。

## 1. 商品詳細URLの正規化と匿名計測

- 商品カード、比較、ギフト導線の商品詳細リンクを`/product/{id}`のHTTP URLへ統一した。
- 掲載面、文脈、位置は`surface`、`context`、`position`としてURLフラグメントへ移し、HTTP queryには含めない。
- ProductViewTrackerはフラグメントを既存と同じ許可面・文字種・位置範囲で検証し、匿名計測へ渡した後に`history.replaceState`で除去する。
- 旧query形式も後方互換で読み取り、計測用3項目だけをURLから除去する。無関係なqueryと通常アンカーは保持する。
- 通常のリンク要素を維持しているため、新しいタブやJavaScript無効時でも商品詳細へ移動できる。
- `/go`のアフィリエイト遷移とqueryは変更していない。
- 本番モードのローカルQAでも計測DBへ書き込まないよう、localhost、127.0.0.1、::1を計測対象外にした。公開ホストの同一オリジン計測は維持した。

## 2. 絞り込みURLのクロール制御

- `sort`、`tier`、`price`、`reviews`を1つでも含む内部リンクへ`nofollow`を付ける純粋関数を追加した。
- 絞り込み状態を保持する前後ページは`prev/next`と`nofollow`を併記する。
- queryなしの基本カテゴリと、`?page=N`だけの通常ページ送りはfollowのまま維持した。
- GETフォーム、キーボード操作、自己canonical、範囲外404、既存の`noindex,follow`は変更していない。
- robots.txtにはqueryのDisallowを追加していない。

## 3. Product構造化データ

- Product JSON-LDのdescriptionを`buildProductMetaDescription()`と共通化し、metadataと同じ150文字以内の表示事実だけを使用する。
- 維持した項目はProduct、name、description、url、image、画面表示しているbrandまたはmaker、表示価格、JPY、BreadcrumbList。
- 画面に表示していなかった`sku`を削除した。
- `aggregateRating`、`review`、`availability`、`shippingDetails`、返品条件、価格有効期限は追加していない。
- AI日本度や販売先レビューを自サイトのRating、Reviewとして出力していない。

## 4. 商品画像と404回復導線

- index可能な商品詳細の主画像1枚だけを`loading="eager"`、`fetchPriority="high"`、`decoding="async"`にした。
- 関連商品画像はすべて`loading="lazy"`のまま維持した。
- 404の既存文言、HTTP 404、noindexを維持し、商品検索、ジャンル、特集、高評価商品、産地・工芸、トップへの固定導線を追加した。
- 404はDB問い合わせを追加せず、検索入力と復帰リンクのキーボードフォーカスを視認可能にした。

## 5. ローカルSEO監査

`npm run audit:local-seo -- --base-url=http://127.0.0.1:3210`は、localhost系HTTP以外を拒否したまま、次の匿名集計を追加した。

- index可能ページのtitle・description欠落
- ページ送りを除いたtitle・description重複警告
- 商品詳細への計測query付きリンク
- 絞り込みリンクのnofollow欠落
- 商品ページのProduct・BreadcrumbListとJSON-LD解析
- 商品主画像のeager/high/asyncと関連画像のlazy
- 固定の存在しないURLのHTTP 404、H1、noindex、検索、復帰導線

最終集計:

| 項目 | 結果 |
|---|---:|
| sitemap URL | 223 |
| 追加確認した通常ページ送り | 8 |
| 取得HTML | 231 |
| ローカルHTTPリクエスト | 233 |
| 非200 / HTML欠落 | 0 / 0 |
| H1 / canonical / noindex不備 | 0 / 0 / 0 |
| title / description欠落 | 0 / 0 |
| 商品詳細への計測queryリンク | 0 |
| 絞り込みリンクのnofollow欠落 | 0 |
| Product / BreadcrumbList欠落 | 0 / 0 |
| 主画像欠落・複数・優先度不備 | 0 / 0 / 0 |
| 関連画像lazy不備 | 0 / 668 |
| 404総合検査 | pass |
| 外部HTTP / 外部送信 / 監査中DB書き込み | 0 / 0 / 0 |

warningは既知の商品title重複1グループ、2ページだけで、商品名の自動変更は行っていない。description重複は0グループだった。

追加の読み取り専用index品質集計では、23カテゴリすべてに掲載商品があり、掲載商品は合計880件、現在の技術index対象は167件だった。カテゴリページ送りの自己canonical、絞り込みの`noindex,follow`、検索結果の`noindex,follow`、ホームのWebSite JSON-LD 1件、robots.txtの既存Disallowだけが維持されていることもコードとテストで再確認した。

## 6. テスト・ビルド・実画面確認

- `npm run lint`: pass
- `npx tsc --noEmit`: pass
- 全テスト: 90 / 90 pass
- `npm run build`: pass（Next.js 16.2.10、静的ページ45件）
- `npm run audit:product-metadata`: pass（対象167件、description最大150文字）
- desktop 1280px: 商品・カテゴリ・404でH1 1件、canonical、画像属性、回復導線、横はみ出しなしを確認
- 390×844: 商品・カテゴリ・404で横はみ出しなし。主画像1枚だけeager/high、関連4画像はlazy。404は検索フォーム、復帰リンク5件、noindex、フォーカス表示を確認
- 商品カードの通常クリック後、新フラグメントと旧queryの両方が表示URLから消えることを確認

## 7. 外部変更に関する記録

外部公開、外部アカウント設定、商品データ、判定データへの変更は行っていない。一方、最初のブラウザQA時に、既存実装が`next start`のloopback閲覧を本番計測対象として扱い、匿名の`product_page_views`を1行記録したことを読み取り集計で確認した。商品ID・商品名・URLは取得・記録していない。当初は追加DB変更を避けて削除せず、以後のloopback計測を無効にするガードと回帰テストを追加した。`product_impressions`の追加は0行だった。

ガード追加後のローカルQA時間帯を再度読み取り集計し、`product_page_views`、`product_impressions`とも追加0行であることを確認した。

その後、利用者からこの匿名閲覧1行だけを削除する明示許可を受けた。時刻・閲覧面・表示位置で候補が厳密に1件であることを読み取り確認してから、その行だけを主キー指定で削除した。削除件数は1件で、削除後は最初のQA時間帯全体について`product_page_views`、`product_impressions`とも0件であることを再確認した。他のDB行は変更していない。

したがって、最初のQAでは1回の意図しない記録と1回の許可済み限定削除が発生したが、最終的な関連テーブルの状態はQA前へ復元されている。ガード実装後のローカル巡回は外部HTTP、外部送信、DB書き込みすべて0件で完了している。
