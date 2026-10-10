# Web Program Kerja & Profil Remaja Masjid Al-Akbar Surabaya

Website resmi katalog program kerja, profil, dan dokumentasi kepengurusan **Remaja Masjid (Remas) Nasional Al-Akbar Surabaya** periode 2026/2027.

Situs ini dibangun dengan arsitektur modern berbasis **Cloudflare Pages + Cloudflare R2 + Supabase PostgreSQL**:
- **Hosting**: Cloudflare Pages (Edge network cepat, gratis, unmetered bandwidth)
- **Database**: Supabase PostgreSQL (Penyimpanan dinamis proker, profil, struktur pengurus, dan sinkronisasi real-time)
- **Penyimpanan Foto**: Cloudflare R2 Storage (Penyimpanan foto dokumentasi tanpa biaya egress bandwidth)
- **CMS / Admin Panel**: Halaman admin terproteksi password untuk menambah/mengedit program kerja dan upload foto kegiatan.

---

## 🚀 Panduan Deployment ke Cloudflare Pages

### 1. Hubungkan ke Cloudflare Pages
1. Masuk ke [Dashboard Cloudflare](https://dash.cloudflare.com/).
2. Masuk ke menu **Workers & Pages** > klik **Create application** > pilih tab **Pages** > **Connect to Git**.
3. Pilih repository GitHub ini (`Program-Kerja-Remas-Al---Akbar`).
4. Atur konfigurasi build:
   - **Framework preset**: `None`
   - **Build command**: *(kosongkan)*
   - **Build output directory**: `.` (titik / root folder)
5. Klik **Save and Deploy**.

---

### 2. Konfigurasi Cloudflare R2 untuk Penyimpanan Foto
1. Di dashboard Cloudflare, buka menu **R2** di sidebar kiri.
2. Klik **Create bucket**, buat bucket dengan nama:
   ```text
   remas-alakbar-dokumentasi
   ```
3. Hubungkan bucket R2 ke Cloudflare Pages:
   - Buka project Pages Anda di Cloudflare.
   - Masuk ke tab **Settings** > **Functions** > scroll ke bagian **R2 bucket bindings**.
   - Klik **Add binding**:
     - **Variable name**: `REMAS_BUCKET`
     - **R2 bucket**: Pilih `remas-alakbar-dokumentasi`
   - Klik **Save**.
4. *(Opsional)* Jika ingin mengaktifkan Public R2 Domain:
   - Pada bucket R2, buka tab **Settings** > aktifkan **Public Development URL** (atau hubungkan Custom Domain).
   - Tambahkan Environment Variable di Pages:
     - `R2_PUBLIC_DOMAIN`: `https://pub-xxxxxx.r2.dev` (atau custom domain CDN Anda)
   - *Catatan: Jika domain publik R2 tidak diaktifkan, gambar tetap otomatis disajikan melalui edge proxy bawaan di `/api/r2/proker/...`.*

---

## 🛠️ Panel Admin

Panel admin dapat diakses di:
```text
https://<domain-anda>/admin.html
```
- **Password Default**: `remas2026`
- **Fitur Admin**:
  - ＋ **Tambah Program Kerja Baru** langsung ke database Supabase
  - ✏️ **Edit Detail Program** (Nama, Divisi, Deskripsi, Tujuan, Sasaran, Jadwal, Link Album Google Drive, Link Video YouTube)
  - 🗑 **Hapus Program Kerja**
  - 📸 **Upload Foto Dokumentasi ke Cloudflare R2** (Otomatis dikompres di browser agar cepat dan hemat kuota)
  - 📝 **Atur Caption & Tanggal Foto**, geser posisi urutan, atau hapus foto.

---

## 💻 Menjalankan Secara Lokal (Development)

1. Clone repository:
   ```bash
   git clone https://github.com/roudhobr/Program-Kerja-Remas-Al---Akbar.git
   cd Program-Kerja-Remas-Al---Akbar
   ```

2. Install dependensi:
   ```bash
   npm install
   ```

3. Jalankan Cloudflare Pages secara lokal menggunakan Wrangler:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:8788`.