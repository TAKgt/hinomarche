-- お問い合わせフォーム保存先
-- anon/authenticated には権限・ポリシーを付与しない。
-- サイト側の /api/contact が service_role で insert する。

create table if not exists contact_messages (
  id bigserial primary key,
  name text,
  email text,
  topic text not null check (topic in ('correction', 'removal', 'feedback', 'other')),
  message text not null check (char_length(message) between 10 and 3000),
  page_url text,
  status text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_messages_created_at
  on contact_messages (created_at desc);

alter table contact_messages enable row level security;

revoke all on contact_messages from anon, authenticated;
revoke all on sequence contact_messages_id_seq from anon, authenticated;
