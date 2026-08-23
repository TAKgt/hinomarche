# 最終検証記録

検証日: 2026-08-19 JST

対象: ローカル変更のみ。本番公開、外部更新、DB書き込み、AI再判定は行っていない。

## 自動検証

| コマンド | 結果 |
|---|---|
| `npm run lint` | pass |
| `npx tsc --noEmit` | pass |
| `npm run test:judge` | 6 / 6 pass |
| `npm run test:freshness` | 11 / 11 pass |
| `npm run test:index-quality` | 33 / 33 pass |
| `npm run test:editorial-priority` | 5 / 5 pass |
| `npm run test:editorial-evidence` | 12 / 12 pass |
| `npm run test:promotions` | 7 / 7 pass |
| `headline_lint.py --strict`（pilot最終稿） | warning 0、pass |
| `npm run build` | pass。Next.js 16.2.10で45ページの静的生成を完了 |
| `git diff --check` | pass |

関連テストは合計74件が通過した。依存関係の追加・変更はない。`.env.local`は変更していない。表示確認だけに使った一時HTMLと読み取り専用redirect helperは削除し、ローカル確認用サーバーも停止した。

## desktop / 390px表示確認

| 対象 | desktop | 390px | 安全・導線の確認 |
|---|---|---|---|
| TOP | 1334pxで横はみ出しなし。H1とH2順を確認 | viewport、client、scroll幅はいずれも390px。横はみ出しなし | category 46、feature 11、商品16、region 7の通常リンクを確認。Tab移動したリンクで`:focus-visible`が有効 |
| 燕三条pilot | 横はみ出しなし。関連featureへの通常リンクを実クリックし遷移 | 横はみ出しなし。H1と6つのH2を確認 | H1文字列はmetadata用titleと同一。語中で分割せず、商品詳細24種類へ通常リンクで到達。AI推定表示、affiliate説明、公式出典リンクを確認 |
| current商品 | 横はみ出しなし。H1 1件、H2 3件 | 横はみ出しなし。H1 1件、H2 3件 | Product / Offer JSON-LD、表示価格、JPY、価格取得日、AI推定表示、免責、affiliate文言、sponsoredリンク、category・region導線を確認 |
| pending商品 | 横はみ出しなし。H1 1件、H2 1件 | 横はみ出しなし。H1 1件、H2 1件 | `noindex,follow`。古いAI判定、価格CTA、sponsoredリンク、Product JSON-LDを表示しない。TOP・categoryへの通常リンクあり |
| blocked商品 | 横はみ出しなし。H1 1件、H2 1件 | 横はみ出しなし。H1 1件、H2 1件 | `noindex,follow`。古いAI判定、価格CTA、sponsoredリンク、Product JSON-LDを表示しない。TOP・categoryへの通常リンクあり |

燕三条のH1は、文字列やmetadataを変えず、意味のまとまりを`inline-block`にして狭い幅で商品種別の語中改行を防いだ。desktopと390pxの双方で見出しがコンテナ内に収まることを確認した。

## 追加施策の検証

- ローカルサイトマップ223 URLとカテゴリのページ送り8 URL、合計231ページを巡回した。非200、HTML欠落、H1不備、canonical欠落・不一致、意図しないnoindex、孤立ページはいずれも0件だった。
- サイトマップは223 URLを出力し、実際の更新日時がある商品167件だけに`lastmod`を付与した。`changefreq`と`priority`は出力していない。
- 既存の特集を目的別導線として再利用できる7カテゴリへ導線を追加した。既存の購入目的導線があるカテゴリには重複表示しない。
- 商品一覧では最初の2画像だけを`eager`かつ`high`とし、3枚目以降は`lazy`を維持した。desktopと390pxの実画面で属性と横はみ出しなしを確認した。
- 商品詳細のdescriptionは既存の商品情報とAI推定ラベルだけから構成し、実画面で150文字以内、canonicalあり、H1が1件であることを確認した。
- 390pxでカテゴリ名の語中改行を防ぐため、見出しへ日本語フレーズ単位の改行とbalanced wrappingを適用した。

## 変更の目的と期待できる効果

1. 公開商品の監査へ一次情報台帳の集計を接続し、個別商品情報を出さずにtechnical品質とeditorial品質を分けて把握できるようにした。
2. 30日以内の観測確認数から、安全余裕を取った維持集合を計算するread-only dry-runを追加した。現状は全公開880件に1日29.33件、technical対象167件に1日5.57件が必要で、観測proxyは1日5.73件。安全枠137件なら1日4.57件となる。Cron完走率と検索上位30件への再出現率は未検証なので、理論値を処理能力とは断定しない。
3. Search Consoleで表示が確認できた燕三条を1テーマだけ選び、公式一次情報に限定したpilot最終稿、見出し比較、編集レビュー、事実監査まで完成させた。公開前の人手確認状態は維持している。
4. Product snippetは、画面にある商品名・価格・通貨だけを検証対象にした。在庫、配送、返品、レビューを推測で補わない回帰テストを追加した。
5. 公開後28日のSearch Console / GA4測定条件を固定し、ローカル合格をアクセス増加と取り違えない判定手順を用意した。

## 残るリスクと承認事項

- pilotの公式資料4件はAI事前確認までで、人手確認済みではない。運営者確認と確認日の記録が終わるまで公開不可。
- 観測proxyは過去30日の確認済み件数であり、日次Cronの完走、外部商品APIの一致件数、公開実績商品の更新優先を本番で証明するものではない。
- 小規模preview、DB更新、AI再判定、Cron変更は別承認が必要。AI再判定を5件/日行う場合のプロジェクト内概算は1日約1.5〜2.5円、30日約45〜75円で、実行前に現行単価と対象件数を再確認する。
- commit、push、deploy、本番確認、Search Console操作は未実施。公開する場合は、利用者が差分と一次情報を確認した後に個別承認する。
- 効果は公開後28日の実測で判断する。今回の変更だけで検索流入が増えたとは扱わない。
