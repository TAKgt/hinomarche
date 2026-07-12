# 公開前セキュリティ確認メモ

最終更新: 2026-07-12

## 必須

- Supabase SQL Editorで `supabase/migrations/004_security_hardening.sql` を適用する
- Supabase DashboardのSecurity Advisorを確認し、重大な警告を解消する
- Supabase Database SettingsでSSL Enforcementを有効にする
- Supabase / Vercel / GitHubアカウントでMFAを有効にする
- Vercel Environment Variablesに `.env.local` 相当を登録する
- 本番では `SUPABASE_ANON_KEY` を設定し、公開ページの読み取りをRLS経由にする
- `NEXT_PUBLIC_SITE_URL=https://hinomarche.com` を設定する
- `CRON_SECRET` は十分長いランダム値にし、Vercel以外へ共有しない

## 推奨

- Supabase Network Restrictionsを有効にできるプラン・運用か確認する
- サイト専用メールを作成し、`NEXT_PUBLIC_CONTACT_EMAIL` を設定する
- Vercelデプロイ後に `/api/cron/ingest` が認証なしで401になることを確認する
- Vercelデプロイ後にレスポンスヘッダーを確認する
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`

## RLSの期待値

- `categories`: `is_active = true` の行だけ公開
- `products`: `is_published = true` の行だけ公開
- `judgments`: 公開済み商品の判定だけ公開
- `products_with_judgment`: `security_invoker = true` により、下位テーブルのRLSを適用

## ローカル検査

```bash
npm run lint
npx tsc --noEmit
```

`next build` は `next/font/google` がGoogle Fontsへ接続するため、ネットワーク可能な環境またはVercel上で確認する。
