# 🎺 Sistem Absensi Simphony

Aplikasi web absensi otomatis berbasis pengenalan wajah untuk anggota Simphony. Seluruh proses deteksi dan pengenalan wajah berjalan di browser (client-side) menggunakan `@vladmandic/human` — tanpa API berbayar atau cloud.

---

## 🚀 Fitur Utama

- **Real-time Face Recognition**: Proses pengenalan wajah seketika menggunakan webcam/kamera HP.
- **Anti-Cheat Kode Harian**: Anggota wajib memasukkan 5 digit kode harian yang hanya bisa didapatkan dari pelatih/admin di tempat, guna menghindari "absen dari rumah".
- **Auto-Sync (No Refresh)**: Tampilan daftar absensi admin dan kamera scanner akan tersinkronisasi otomatis (*silent polling*) tanpa perlu me-reload halaman.
- **Satu Wajah = Satu Akun**: Pencegahan pendaftaran ganda menggunakan Cosine Similarity.
- **Dukungan HP Spesifikasi Rendah**: Algoritma AI sudah dibatasi beban FPS-nya agar mulus dijalankan di HP biasa tanpa overhead RAM berlebih.

---

## 🚀 Cara Setup (dari Awal)

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database + Admin + Model AI

Jalankan satu perintah ini:

```bash
npm run setup
```

Perintah ini akan:
- Membuat database SQLite (`prisma/dev.db`)
- Membuat akun admin default
- Menyalin model AI ke `public/models/`

### 3. Jalankan Aplikasi

```bash
npm run dev
```

Buka `http://localhost:3000`

---

## 🔐 Kredensial Admin Default

```
Username : admin
Password : admin123
```

> ⚠️ **Ganti password setelah login pertama di production!**

---

## 📱 Alur Penggunaan

### Admin Dashboard (`/dashboard`)
1. Buka `/login`, masuk dengan `admin` & `admin123`.
2. Di pojok atas panel admin, Anda akan melihat **"Kode Hari Ini: XXXXX"**. Bagikan 5 digit kode ini ke anggota yang hadir.
3. **Kelola Anggota** → Tambah anggota baru dengan capture 5 foto wajah interaktif (kamera otomatis membaca berbagai posisi wajah).
4. **Data Absensi** → Tabel rekap kehadiran akan *auto-refresh* setiap kali ada data baru.

### Absensi (Halaman Utama `/`)
1. Buka `http://localhost:3000`
2. Masukkan **Kode Absen Harian (5 digit)** yang didapatkan dari Admin.
3. Klik tombol **"Mulai Absen"** (kamera akan menyala jika kode disubmit).
4. Arahkan wajah ke kamera. Wajah akan dikalkulasi dalam 3 frame cepat.
5. Notifikasi muncul jika wajah dikenali dan kamera otomatis berhenti (maksimal 1 absen per orang per hari).

---

## 🛠️ Tech Stack

| Teknologi | Fungsi |
|---|---|
| Next.js 16 (App Router) | Framework web |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| `@vladmandic/human` | Face detection & recognition (WebGL) |
| SQLite + Prisma v7 | Database |
| `better-sqlite3` | SQLite driver adapter |
| bcryptjs | Hash password |

---

## 📂 Struktur Folder Penting

```
app/
├── page.tsx              # Halaman absen utama (Scanner)
├── login/                # Halaman login admin
└── dashboard/
    ├── anggota/          # Kelola anggota
    └── absensi/          # Rekap kehadiran

components/
├── CameraFrame.tsx       # Frame kamera + scanner animation
├── FaceDetector.tsx      # Wrapper @vladmandic/human
├── Navbar.tsx
└── Toast.tsx

lib/
├── prisma.ts             # Prisma client singleton
├── auth.ts               # Session cookie utilities
├── daily-code.ts         # Generator kode absen harian
└── face-matcher.ts       # Cosine similarity matching

public/models/            # Model AI (blazeface + faceres)
prisma/
├── schema.prisma
├── seed.ts               # Seed admin default
└── dev.db                # Database SQLite
```

---

## ⚙️ Konfigurasi & Optimasi Performa

### ⚡ Optimasi untuk Device Berspesifikasi Rendah (Low-End Devices)
Sistem telah dioptimalkan agar ringan dijalankan pada smartphone spesifikasi terbatas:
- **Throttle Detection FPS**: Pemrosesan *frame inference AI* dibatasi maksimal **10 FPS** (~100ms interval) sehingga beban GPU turun drastis.
- **Fast Match Stability**: Kami menurunkan syarat frame stabil ke **3 Frame** (dari sebelumnya 8) agar proses absen terasa instan namun tetap akurat.

### Face Recognition Threshold
Edit di `components/FaceDetector.tsx` & `lib/face-matcher.ts`:
```typescript
const SIMILARITY_THRESHOLD = 0.60; // Naikkan untuk lebih ketat
```

### Cooldown Antar Absen
Di `app/page.tsx`:
```typescript
cooldownMs={7000} // 7 detik cooldown per orang jika absen berkelanjutan
```

### Stabilitas Deteksi
```typescript
const STABILITY_FRAMES = 3; // Frame stabil sebelum matching (Sangat cepat)
```

---

## 🔧 Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run db:push      # Push schema ke database
npm run db:seed      # Seed admin default
npm run setup        # Setup lengkap (db + seed + models)
```
