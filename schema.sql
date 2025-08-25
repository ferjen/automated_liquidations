-- Supabase SQL for receipts table
create table if not exists public.receipts (
	id uuid primary key default gen_random_uuid(),
	created_at timestamp with time zone default now(),
	business_name text,
	location text,
	tin text,
	vat numeric,
	vat_excl numeric,
	vat_incl numeric,
	pwd_discount_label text,
	pwd_discount_amount numeric
);

alter table public.receipts enable row level security;
create policy "Allow anon insert" on public.receipts for insert
  to anon with check (true);


