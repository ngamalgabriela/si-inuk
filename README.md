# SI-INUK

SI-INUK adalah aplikasi Next.js untuk pengelolaan data Potensi dan Sumber Kesejahteraan Sosial di Kabupaten Manggarai Barat.

Dokumentasi ini menjelaskan alur lengkap dari pembuatan project Supabase sampai login aplikasi dan persiapan integrasi data LKS.

## 1. Prasyarat

Pastikan tersedia:

- Node.js versi LTS
- npm
- akun Supabase
- repository SI-INUK yang sudah tersedia di komputer

Periksa instalasi:

```bash
node --version
npm --version
```

## 2. Install aplikasi

Dari folder project:

```bash
npm install
```

Jangan membuat file environment di dalam folder `src`. Next.js membaca file environment dari root project.

## 3. Buat project Supabase

1. Buka [supabase.com](https://supabase.com/).
2. Login atau buat akun.
3. Pilih **New project**.
4. Pilih organisasi.
5. Isi nama project, misalnya `si-inuk`.
6. Buat password database yang kuat dan simpan di password manager.
7. Pilih region yang sesuai.
8. Klik **Create new project**.
9. Tunggu sampai status project menjadi siap.

## 4. Ambil URL dan key Supabase

Di Supabase Dashboard:

1. Buka **Project Settings**.
2. Buka menu **API** atau **Data API** sesuai tampilan dashboard.
3. Salin **Project URL**.
4. Salin **Publishable key** atau key lama yang disebut **anon public key**.

Buat file `.env.local` di root project. Jangan mengisi file `.env.example` dengan key asli.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PASTE_PUBLISHABLE_OR_ANON_KEY_HERE
```

Catatan keamanan:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` memang boleh dipakai di browser.
- Jangan pernah memasukkan `service_role` key ke `.env.local` untuk aplikasi browser.
- Jangan commit `.env.local` ke GitHub.
- Jika key rahasia terlanjur terbagi, segera rotate key dari Supabase Dashboard.

## 5. Jalankan schema database

Schema SI-INUK tersedia di [supabase/schema.sql](supabase/schema.sql).

1. Buka Supabase Dashboard.
2. Pilih project SI-INUK.
3. Buka **SQL Editor**.
4. Klik **New query**.
5. Salin seluruh isi `supabase/schema.sql`.
6. Tempelkan ke SQL Editor.
7. Klik **Run**.
8. Buka **Table Editor** dan pastikan tabel utama muncul.

Tabel utama yang harus tersedia:

- `profiles`
- `lks`
- `lks_registration_snapshot`
- `lks_documents`
- `lks_status_history`
- `lks_legalitas`
- `lks_sdm`
- `lks_layanan`
- `lks_pm`
- `lks_sarpras`
- `lks_tanda_daftar`
- `wilayah`

Schema juga mengaktifkan Row Level Security atau RLS. Data tidak boleh dianggap aman hanya karena URL dan anon key diketahui; keamanan utamanya berada pada policy RLS.

Instruksi detail SQL, role, dan policy tersedia di [supabase/README.md](supabase/README.md).

## 6. Konfigurasi Supabase Auth

### 6.1 Aktifkan login email

1. Buka **Authentication**.
2. Buka **Providers**.
3. Pilih **Email**.
4. Aktifkan provider Email.
5. Simpan perubahan.

Untuk tahap awal, gunakan login email dan password. Login Google belum dikonfigurasi pada aplikasi maupun project Supabase.

### 6.2 Atur URL aplikasi

Buka **Authentication > URL Configuration**.

Untuk pengembangan lokal, isi:

- **Site URL**: `http://localhost:3000`
- Tambahkan `http://localhost:3000/**` pada **Redirect URLs** bila diperlukan.

Untuk production, tambahkan domain production, misalnya:

```text
https://domain-aplikasi.example.com
https://domain-aplikasi.example.com/**
```

Jangan menghapus URL production saat menambahkan URL lokal.

### 6.3 Email confirmation

Jika **Confirm email** aktif, user harus mengonfirmasi email sebelum dapat login. Untuk pengujian internal, administrator dapat menandai user sebagai confirmed dari halaman user Supabase, sesuai kebijakan project.

## 7. Buat user administrator

1. Buka **Authentication > Users**.
2. Klik **Add user**.
3. Pilih **Create new user**.
4. Masukkan email dan password.
5. Selesaikan pembuatan user.

Trigger database akan membuat baris yang sesuai pada tabel `public.profiles`. Secara default, role awal adalah `operator`.

Untuk menjadikan user sebagai administrator:

1. Buka **SQL Editor**.
2. Jalankan query berikut dengan email yang benar:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where email = 'admin@contoh.go.id';
```

3. Verifikasi hasilnya:

```sql
select id, email, full_name, role
from public.profiles
where email = 'admin@contoh.go.id';
```

Jangan memberikan role `admin` kepada semua akun. Pembuatan user publik juga perlu dikendalikan karena trigger saat ini memberi role default `operator`.

## 8. Jalankan aplikasi

Setelah `.env.local` terisi, restart development server. Environment variable dibaca ketika proses Next.js dimulai.

```bash
npm run dev
```

Buka:

```text
http://localhost:3000/login
```

## 9. Alur login SI-INUK

Alur login saat ini adalah:

1. User membuka halaman yang dilindungi.
2. `proxy.ts` memeriksa session Supabase.
3. Jika belum login, user diarahkan ke `/login`.
4. User mengisi email dan password.
5. Aplikasi memanggil `supabase.auth.signInWithPassword`.
6. Supabase mengembalikan session.
7. Session disimpan melalui cookie SSR.
8. User diarahkan ke halaman tujuan.
9. Pada request berikutnya, `proxy.ts` memperbarui dan memeriksa session.
10. Saat user keluar, aplikasi memanggil `supabase.auth.signOut` lalu mengarahkan user ke halaman login.

Implementasi client dan server berada di [src/lib/supabase/client.ts](src/lib/supabase/client.ts), [src/lib/supabase/server.ts](src/lib/supabase/server.ts), dan [proxy.ts](proxy.ts).

## 10. Tes login

Uji dengan urutan berikut:

1. Pastikan `.env.local` berisi URL dan key yang benar.
2. Pastikan user sudah ada di **Authentication > Users**.
3. Jalankan `npm run dev`.
4. Buka `http://localhost:3000/login`.
5. Masukkan email dan password user.
6. Pastikan user masuk ke dashboard.
7. Buka halaman `/lks`.
8. Klik **Keluar**.
9. Pastikan user kembali ke `/login`.
10. Coba membuka `/lks` setelah logout dan pastikan diarahkan kembali ke login.

Jika login gagal, lihat bagian troubleshooting di [supabase/README.md](supabase/README.md).

## 11. Status integrasi data saat ini

Supabase Auth dan proteksi route sudah tersedia. Namun, data formulir SI-INUK belum seluruhnya membaca dan menulis ke Supabase.

Saat ini:

- login dan session menggunakan Supabase Auth;
- sebagian data formulir masih menggunakan `localStorage`;
- lampiran masih menggunakan IndexedDB browser;
- dashboard belum sepenuhnya membaca tabel Supabase;
- hubungan user dengan LKS masih perlu diselesaikan;
- Supabase Storage belum dikonfigurasi.

Jangan menganggap label UI seperti "Terproteksi RLS" sebagai bukti bahwa seluruh data sudah berasal dari Supabase. Verifikasi query dan policy setelah tahap integrasi data selesai.

## 12. Urutan pengembangan berikutnya

Ikuti urutan ini agar data tidak tercampur atau hilang:

1. Tetapkan hubungan akun dengan LKS.
2. Perbaiki policy RLS berdasarkan role dan kepemilikan.
3. Buat query baca untuk daftar LKS.
4. Buat mapper data identitas dari form ke tabel `lks`.
5. Buat fungsi create/update/upsert dengan error handling.
6. Migrasikan section legalitas, SDM, layanan, PM, sarpras, dan tanda daftar.
7. Buat Supabase Storage bucket dan policy lampiran.
8. Migrasikan lampiran dari IndexedDB ke Storage.
9. Hubungkan status pengajuan dengan `lks.workflow_status` dan `lks_status_history`.
10. Buat proses migrasi draft `localStorage` setelah penyimpanan server berhasil.
11. Uji akses admin, operator, viewer, user tanpa assignment, dan user logout.

## 13. Validasi sebelum commit

Jalankan pemeriksaan lokal:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Periksa bahwa file rahasia tidak masuk Git:

```bash
git status --short
```

`.env.local` harus tetap diabaikan oleh Git.
