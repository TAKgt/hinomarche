# 内部リンクとProduct snippetの検証

## 結論

- 重要テンプレートは、TOP → feature / region / category → product、およびproduct → category / feature / regionの通常リンクでつながっている。燕三条ページでは公開HTMLから24種類の商品詳細パスを確認した。
- 絞り込み・並び替えURLのcanonicalと`noindex,follow`方針は変更していない。
- Product snippetはSearch Consoleで有効1、無効0。`availability`、`aggregateRating`、`review`は改善項目だが、現在のデータで裏付けられない値を加えない。
- ヒノマルシェは商品を自社販売しないため、販売者としての配送条件・返品ポリシーを構造化データへ作らない。

## 内部リンク

### ソースで確認した経路

| 起点 | 通常リンクの到達先 | 実装 |
|---|---|---|
| TOP | 全category、全region、feature一覧と主要feature | `next/link` |
| 燕三条region | TOP、region一覧、関連する包丁feature、商品詳細、他region | `next/link` / `ProductCard` |
| feature詳細 | TOP、feature一覧、関連region、商品詳細、他feature | `next/link` / `ProductCard` |
| category詳細 | TOP、関連feature・region、商品詳細、ページ送り | `next/link` / `ProductCard` |
| current商品詳細 | TOP、category、該当feature・region、関連商品 | `next/link` / `ProductCard` |
| pending / blocked商品詳細 | TOP、category | `next/link`。古いAI判定とaffiliate CTAは表示しない |

`ProductCard`の商品画像・商品名領域は`/product/...`への通常リンクであり、JavaScriptイベントだけに依存しない。販売先への`/go/...`はaffiliate計測用の外部移動であり、内部の商品詳細リンクとは分けている。

### 公開状態

- TOP、燕三条region、公開sitemap、robotsはHTTP 200。
- 燕三条regionには24種類の商品詳細パスがある。
- 公開sitemapの商品167件はDBのtechnical対象167件と一致する。
- `robots.txt`は商品詳細を拒否せず、`/go/`、`/api/`、`/admin/`だけを拒否する。
- Search Consoleの未登録12件はcanonical代替9、noindex 2、robots 1で、「検出 - インデックス未登録」は0。

この範囲では、pilotまたはtechnical対象商品へ通常リンクがないという問題は確認できなかった。商品順や大量の導線は変更しない。

## Product snippet

### 現在のマークアップ

- current商品ページだけが`Product`と`BreadcrumbList`を出す。
- 画面に価格がある場合だけ`Offer`を出し、`price`と`priceCurrency: JPY`を含める。
- AI日本度は`review`または`aggregateRating`として送らない。
- pending / blocked / stale商品はcurrent商品の表示へ入らず、Product JSON-LDを出さない。

GoogleのProduct snippet公式仕様では、`Product.name`と、`review`・`aggregateRating`・`offers`のいずれかが必須である。`Offer`では`price`が必須、`availability`は推奨項目である。

- 公式: https://developers.google.com/search/docs/appearance/structured-data/product-snippet
- 公式: https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- 公式: https://developers.google.com/search/docs/appearance/structured-data/sd-policies

### 追加しない項目

| Search Consoleの改善項目 | 判断 |
|---|---|
| `offers.availability` | 現在は在庫状態を表す専用データがない。30日以内の取得や価格表示は`InStock`の証明ではないため追加しない |
| `aggregateRating` / `review` | 画面の販売先レビューやAI日本度を自サイトのレビューとして構造化しない |
| 配送条件 | ヒノマルシェは販売者ではなく、販売先ごとの現在条件も保持していないため追加しない |
| 返品ポリシー | ヒノマルシェ自身の販売条件ではないため追加しない |
| グローバルID | 信頼できるGTIN等を現在保持していないため推測しない |

### 回帰テスト

`src/lib/structured-data.test.ts`を追加し、次を固定した。

1. Product snippetに画面表示と一致する商品名、価格、通貨がある。
2. 在庫、配送、返品、レビューを取得していないときは補わない。
3. 価格を表示できない商品には`Offer`を出さない。

`npm run test:index-quality`へこのテストを接続し、地域見出しの回帰テストを含む22件すべてが通過した。TypeScript検査も通過した。

## 表示確認の結果

- local build後、desktopと390pxでリンクの実クリック、キーボードfocus、JSON-LD、横はみ出しを確認した。詳細は`04-verification.md`へ記録した。
- 公開後にGoogleが再クロールする時期と、Product snippet表示回数の変化は現在不明。Search Consoleの再クロール申請は行わない。
