-- Supabase schema for WMS minimal users table
create table if not exists public.users (
  id text primary key,
  email text unique,
  full_name text,
  provider text,
  role text default 'user',
  created_at timestamptz default now()
);

-- Example: insert admin user (use real id from provider)
-- insert into public.users (id, email, full_name, role) values ('google-oauth2|123456', 'admin@example.com', 'Admin', 'admin');
