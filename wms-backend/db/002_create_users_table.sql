create table public.users (
  id text primary key,
  email text,
  full_name text,
  provider text,
  role text not null default 'user',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);