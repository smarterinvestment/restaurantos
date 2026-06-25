-- RestaurantOS — esquema MVP (Supabase / Postgres)
-- Ejecuta en el SQL editor de tu proyecto Supabase.
-- Modelo simple: 1 usuario = 1 restaurante (multi-tenant por user_id). RLS activado.

-- ============ CUENTAS DE CAJA ============
create table if not exists cash_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Caja principal',
  starting_balance numeric(14,2) not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

-- ============ PROVEEDORES ============
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- ============ FACTURAS (cuentas por pagar) ============
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  supplier_id uuid references suppliers (id) on delete set null,
  invoice_number text,
  issue_date date,
  due_date date,
  currency text not null default 'USD',
  subtotal numeric(14,2),
  tax numeric(14,2),
  total_amount numeric(14,2) not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'paid', 'void')),
  image_url text,                 -- ruta en Supabase Storage
  raw_extraction jsonb,           -- JSON crudo devuelto por Claude Vision
  created_at timestamptz not null default now()
);

-- ============ LÍNEAS DE FACTURA ============
create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  description text,
  quantity numeric(12,3),
  unit_price numeric(14,2),
  line_total numeric(14,2)
);

-- ============ MOVIMIENTOS DE CAJA ============
create table if not exists cash_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  occurred_at date not null default current_date,
  description text,
  category text,
  source text not null default 'manual' check (source in ('manual', 'invoice')),
  invoice_id uuid references invoices (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoices_due on invoices (user_id, status, due_date);
create index if not exists idx_movements_user on cash_movements (user_id, occurred_at);

-- ============ ROW LEVEL SECURITY ============
alter table cash_accounts  enable row level security;
alter table suppliers      enable row level security;
alter table invoices       enable row level security;
alter table invoice_items  enable row level security;
alter table cash_movements enable row level security;

-- Políticas: cada usuario solo ve/escribe lo suyo.
create policy "own cash_accounts"  on cash_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own suppliers"      on suppliers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own invoices"       on invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own cash_movements" on cash_movements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- invoice_items se asegura a través de su factura padre
create policy "own invoice_items"  on invoice_items
  for all using (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
  ) with check (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
  );

-- ============ STORAGE ============
-- Crea un bucket privado 'invoices' desde el dashboard de Supabase (Storage > New bucket).
-- Las imágenes de factura se suben ahí; guarda la ruta en invoices.image_url.
