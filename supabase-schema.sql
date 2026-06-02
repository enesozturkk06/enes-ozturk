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
  package_type text not null default 'sampiyon',
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

-- Takvim slotları
create table if not exists time_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time text not null,
  end_time text not null,
  is_open boolean default true,
  created_at timestamptz default now(),
  unique(date, start_time)
);

-- Randevular
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  student_name text not null,
  student_code text not null,
  student_phone text,
  date date not null,
  start_time text not null,
  end_time text not null,
  status text default 'onaylandi',
  cancelled_at date,
  completed_at date,
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

-- Paketler (ders paketleri)
create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lesson_count int not null,
  price decimal not null,
  duration_days int default 45,
  description text,
  is_active boolean default true,
  highlight boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ─── RLS ─────────────────────────────────────────────────────────
alter table students enable row level security;
alter table appointments enable row level security;
alter table lesson_records enable row level security;
alter table notifications enable row level security;
alter table payments enable row level security;
alter table time_slots enable row level security;
alter table packages enable row level security;

-- SELECT (herkes okuyabilir — anon key yeterli)
create policy "select_students"      on students      for select using (true);
create policy "select_appointments"  on appointments  for select using (true);
create policy "select_lesson_records" on lesson_records for select using (true);
create policy "select_notifications" on notifications  for select using (true);
create policy "select_payments"      on payments      for select using (true);
create policy "select_time_slots"    on time_slots    for select using (true);
create policy "select_packages"      on packages      for select using (true);

-- INSERT
create policy "insert_students"      on students      for insert with check (true);
create policy "insert_appointments"  on appointments  for insert with check (true);
create policy "insert_lesson_records" on lesson_records for insert with check (true);
create policy "insert_payments"      on payments      for insert with check (true);
create policy "insert_time_slots"    on time_slots    for insert with check (true);
create policy "insert_packages"      on packages      for insert with check (true);
create policy "insert_notifications" on notifications  for insert with check (true);

-- UPDATE
create policy "update_students"      on students      for update using (true);
create policy "update_appointments"  on appointments  for update using (true);
create policy "update_notifications" on notifications  for update using (true);
create policy "update_time_slots"    on time_slots    for update using (true);
create policy "update_packages"      on packages      for update using (true);
create policy "update_lesson_records" on lesson_records for update using (true);

-- DELETE
create policy "delete_students"      on students      for delete using (true);
create policy "delete_appointments"  on appointments  for delete using (true);
create policy "delete_payments"      on payments      for delete using (true);
create policy "delete_time_slots"    on time_slots    for delete using (true);
create policy "delete_packages"      on packages      for delete using (true);
create policy "delete_lesson_records" on lesson_records for delete using (true);

-- ─── Örnek paket verisi ───────────────────────────────────────────
insert into packages (name, lesson_count, price, duration_days, description, is_active, highlight, sort_order)
values
  ('Başlangıç', 8,  1490, 45, 'Temel teknikler, duruş ve kondisyon', true, false, 1),
  ('Gelişim',   10, 1790, 60, 'Kombine çalışmalar, serbest çalışma girişi', true, true, 2),
  ('Şampiyon',  12, 2190, 75, 'İleri seviye teknik, müsabaka hazırlığı', true, false, 3)
on conflict do nothing;
