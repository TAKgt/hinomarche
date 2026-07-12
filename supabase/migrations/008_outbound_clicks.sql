-- 商品詳細から販売サイトへの匿名クリック集計。
-- IP、User-Agent、Cookie、セッションIDは保存しない。
-- 書き込みはサーバー側のservice_roleに限定する。

create table if not exists outbound_clicks (
  id bigserial primary key,
  product_id uuid not null references products(id) on delete cascade,
  destination text not null check (destination in ('primary', 'cross')),
  merchant text not null check (merchant in ('rakuten', 'amazon')),
  clicked_at timestamptz not null default now()
);

create index if not exists idx_outbound_clicks_clicked_at
  on outbound_clicks (clicked_at desc);

create index if not exists idx_outbound_clicks_product_clicked_at
  on outbound_clicks (product_id, clicked_at desc);

alter table outbound_clicks enable row level security;

revoke all on outbound_clicks from anon, authenticated;
revoke all on sequence outbound_clicks_id_seq from anon, authenticated;
