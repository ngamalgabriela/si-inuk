# Panduan Supabase SI-INUK

Dokumen ini menjelaskan konfigurasi Supabase untuk SI-INUK. Schema utama berada di [schema.sql](schema.sql).

## A. Persiapan project

1. Buat project baru di Supabase.
2. Simpan database password di tempat yang aman.
3. Catat **Project URL** dan **Publishable key** atau **anon public key** dari **Project Settings > API**.
4. Masukkan kedua nilai tersebut ke `.env.local` di root aplikasi:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PASTE_ANON_OR_PUBLISHABLE_KEY
```

Jangan menggunakan `service_role` key pada client browser dan jangan commit `.env.local`.

## B. Menjalankan schema

1. Buka **SQL Editor**.
2. Buat query baru.
3. Salin seluruh isi [schema.sql](schema.sql).
4. Jalankan query.
5. Buka **Table Editor**.
6. Pastikan tabel dan enum SI-INUK sudah dibuat.

Schema membuat antara lain:

- enum role: `admin`, `operator`, `viewer`;
- enum status workflow LKS;
- tabel `profiles` dan tabel data LKS;
- tabel snapshot, dokumen, dan riwayat status;
- trigger pembuatan profile setelah user Auth dibuat;
- trigger `updated_at`;
- RLS dan policy awal.

Script ini ditujukan untuk project baru. Walaupun beberapa statement memakai `if not exists`, perubahan struktur pada project yang sudah berisi data harus dibuat sebagai migration terpisah. Jangan menghapus atau menjalankan ulang script produksi tanpa meninjau dampaknya.

## C. Verifikasi schema

Jalankan query berikut di SQL Editor:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Verifikasi enum dan RLS:

```sql
select n.nspname as schema_name, t.typname as type_name
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typname in ('app_role', 'lks_workflow_status', 'registration_section');
```

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'lks', 'lks_documents', 'lks_tanda_daftar');
```

Kolom `rowsecurity` harus bernilai `true` untuk tabel yang dilindungi.

## D. Konfigurasi Auth

Di **Authentication > Providers**:

1. Aktifkan provider **Email**.
2. Tentukan apakah konfirmasi email wajib.
3. Simpan perubahan.

Di **Authentication > URL Configuration**:

- Site URL lokal: `http://localhost:3000`
- Redirect URL lokal: `http://localhost:3000/**`

Tambahkan URL production saat aplikasi dideploy.

## E. Membuat user dan role

Buat user melalui **Authentication > Users > Add user**. Trigger `on_auth_user_created` membuat profile secara otomatis.

Cek profile:

```sql
select id, email, full_name, role, created_at
from public.profiles
order by created_at desc;
```

Promosikan satu user menjadi admin:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where email = 'admin@contoh.go.id';
```

Role yang tersedia:

- `admin`: administrasi user dan data sesuai policy.
- `operator`: pengelolaan operasional data sesuai policy.
- `viewer`: akses baca yang akan dipakai setelah policy viewer diselesaikan.

Penting: role default pada trigger saat ini adalah `operator`. Jika pendaftaran user dibuka untuk umum, jangan menganggap semua user baru aman sebagai operator. Ubah proses provisioning atau role secara manual sebelum deployment publik.

## F. RLS dan batasan saat ini

RLS aktif pada tabel utama. Policy saat ini memberikan akses penuh data LKS kepada `admin` dan `operator`, berdasarkan fungsi `is_admin_or_operator()`.

Sebelum aplikasi dipakai banyak user, masih perlu dilakukan:

1. Menambahkan hubungan user dengan satu atau beberapa LKS.
2. Membatasi query berdasarkan hubungan tersebut.
3. Menambahkan policy baca untuk `viewer`.
4. Membatasi perubahan status berdasarkan role.
5. Menguji akses user yang tidak memiliki assignment.

Jangan mengandalkan pemeriksaan role di UI saja. Policy database harus menjadi lapisan pengaman utama.

## G. Data dan transaksi

Data formulir SI-INUK belum seluruhnya terhubung ke database. Bentuk payload UI juga belum selalu sama dengan bentuk tabel relasional.

Untuk setiap section, gunakan alur berikut:

1. Ambil session user.
2. Validasi payload di server atau pada boundary database.
3. Buat atau ambil `lks.id`.
4. Simpan tabel induk.
5. Simpan tabel child dengan foreign key.
6. Simpan snapshot atau history jika diperlukan.
7. Kembalikan error yang dapat dibaca UI.

Untuk operasi yang menyentuh beberapa tabel, gunakan RPC atau endpoint server yang dapat menjaga konsistensi. Jangan menganggap beberapa request browser sebagai satu transaksi.

## H. Storage lampiran

Schema menyimpan metadata file pada pasangan:

- `file_name`;
- `storage_path`;
- `mime_type`;
- `file_size`.

Bucket dan policy Storage belum dibuat oleh `schema.sql`. Sebelum upload diaktifkan:

1. Tentukan nama bucket privat.
2. Tentukan format path, misalnya `lks/{lks_id}/{document_type}/{file_name}`.
3. Batasi ukuran dan MIME type.
4. Buat policy upload berdasarkan user dan assignment LKS.
5. Gunakan signed URL untuk download file privat.
6. Simpan metadata database hanya setelah upload berhasil.
7. Hapus object Storage jika insert metadata gagal.

## I. Testing Auth dari aplikasi

Setelah `.env.local` terisi:

```bash
npm run dev
```

Buka `http://localhost:3000/login`, lalu:

1. login dengan user yang dibuat di Supabase;
2. pastikan redirect ke dashboard;
3. buka `/lks`;
4. klik logout;
5. coba buka `/lks` lagi;
6. pastikan user diarahkan ke `/login`.

Implementasi autentikasi memakai:

- `src/lib/supabase/client.ts` untuk komponen client;
- `src/lib/supabase/server.ts` untuk komponen server;
- `proxy.ts` untuk refresh session dan proteksi route;
- `src/app/login/page.tsx` untuk `signInWithPassword`.

## J. Troubleshooting

### Login selalu gagal

Periksa:

- URL dan key tidak masih berupa placeholder;
- `.env.local` berada di root project;
- development server sudah direstart setelah `.env.local` diubah;
- email dan password benar;
- user sudah dibuat di Authentication > Users;
- user sudah confirmed jika email confirmation aktif.

### Muncul error URL Supabase tidak valid

Nilai `NEXT_PUBLIC_SUPABASE_URL` masih kosong atau salah format. Gunakan URL project lengkap, misalnya `https://project-ref.supabase.co`.

### User berhasil login tetapi query database gagal

Periksa:

- schema sudah dijalankan;
- session benar-benar aktif;
- profile user sudah dibuat;
- role user sesuai policy;
- RLS policy mengizinkan operasi tersebut;
- tabel dan kolom query sesuai schema.

### Profile tidak dibuat setelah user dibuat

Periksa trigger:

```sql
select tgname
from pg_trigger
where tgname = 'on_auth_user_created';
```

Kemudian cek error pada **Logs > Postgres Logs** dan pastikan fungsi `public.handle_new_user()` tersedia.

### Data tidak terlihat walaupun tabel berisi data

Ini biasanya disebabkan RLS. Uji menggunakan user Auth yang aktif, bukan anon SQL role, lalu periksa policy tabel terkait. Jangan mematikan RLS sebagai solusi permanen.

## K. Checklist sebelum production

- [ ] `.env.local` tidak masuk Git.
- [ ] Production URL sudah ditambahkan ke Auth URL Configuration.
- [ ] Tidak ada `service_role` key di browser atau repository.
- [ ] Email confirmation dan reset password sudah diputuskan.
- [ ] Role provisioning sudah aman.
- [ ] Relasi user-LKS sudah dibuat.
- [ ] Policy RLS diuji untuk setiap role.
- [ ] Storage bucket dan policy lampiran sudah dibuat.
- [ ] Backup database tersedia.
- [ ] Migration schema tersimpan di repository.
- [ ] Query gagal, timeout, dan error upload ditangani aplikasi.
