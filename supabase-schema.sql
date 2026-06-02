-- Antrenör Enes Öztürk - Kickboks Yönetim Sistemi
-- Supabase SQL Editor'de çalıştırın

-- Öğrenciler
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  full_name text not null,
  phone text not null,
  email text,
  level text default 'baslangic',
  package_type text not null,
  total_lessons int default 0,
  remaining_lessons int default 0,
  completed_lessons int default 0,
  payment_status text default 'beklemede',
  amount_paid decimal default 0,
  amount_due decimal default 0,
  package_start_date date,
  package_end_date date,
  notes text,
  is_active boolean default true,
  weight int,
  age int,
  created_at timestamptz default now()
);

-- Müsaitlik slotları
create table if not exists time_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  is_available boolean default true,
  is_blocked boolean default false,
  block_reason text,
  created_at timestamptz default now()
);

-- Randevular
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  student_name text not null,
  student_code text not null,
  student_phone text,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'onaylandi',
  cancelled_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- Ders kayıtları
create table if not exists lesson_records (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id),
  student_id uuid references students(id) on delete cascade,
  date date not null,
  conditioning int default 5,
  punch int default 5,
  kick int default 5,
  defense int default 5,
  combination int default 5,
  sparring int default 5,
  overall int default 5,
  trainer_notes text,
  duration_minutes int default 60,
  created_at timestamptz default now()
);

-- Bildirimler
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'info',
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Ödemeler
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  student_name text not null,
  amount decimal not null,
  paid_at date not null,
  method text default 'nakit',
  notes text,
  created_at timestamptz default now()
);

-- Kapalı günler
create table if not exists blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text,
  created_at timestamptz default now()
);

-- RLS (Row Level Security)
alter table students enable row level security;
alter table appointments enable row level security;
alter table lesson_records enable row level security;
alter table notifications enable row level security;
alter table payments enable row level security;

-- Tüm authenticated kullanıcılar okuyabilir (anon key ile)
create policy "Public read students" on students for select using (true);
create policy "Public read appointments" on appointments for select using (true);
create policy "Public read lesson_records" on lesson_records for select using (true);
create policy "Public read notifications" on notifications for select using (true);
create policy "Public read time_slots" on time_slots for select using (true);
create policy "Public read payments" on payments for select using (true);

-- Insert/update/delete - service role key ile yapılır
-- (veya authenticated kullanıcılar için ayrı politikalar eklenebilir)
create policy "Insert appointments" on appointments for insert with check (true);
create policy "Update appointments" on appointments for update using (true);
create policy "Insert lesson_records" on lesson_records for insert with check (true);
create policy "Insert payments" on payments for insert with check (true);
create policy "Update students" on students for update using (true);
create policy "Insert students" on students for insert with check (true);
create policy "Update notifications" on notifications for update using (true);

-- Örnek veri
insert into students (code, full_name, phone, level, package_type, total_lessons, remaining_lessons, completed_lessons, payment_status, amount_paid, amount_due, package_start_date, package_end_date, is_active)
values
  ('ENES001', 'Ahmet Kaya', '05321234567', 'orta', 'sampiyon', 16, 8, 8, 'odendi', 2490, 0, '2026-05-01', '2026-06-30', true),
  ('ENES002', 'Defne Yıldız', '05421234567', 'baslangic', 'savasci', 8, 3, 5, 'odendi', 1490, 0, '2026-05-15', '2026-06-29', true),
  ('ENES003', 'Murat Demir', '05521234567', 'ileri', 'efsane', 32, 20, 12, 'kismi', 2000, 1990, '2026-04-01', '2026-06-30', true)
on conflict (code) do nothing;
