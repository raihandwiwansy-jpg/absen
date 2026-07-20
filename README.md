# 🎺 Sistem Absensi Marching Band

Aplikasi web absensi otomatis berbasis pengenalan wajah untuk anggota marching band. Seluruh proses deteksi dan pengenalan wajah berjalan di browser (client-side) menggunakan `@vladmandic/human` — tanpa API berbayar atau cloud.

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

### Absensi (Halaman Utama `/`)
1. Buka `http://localhost:3000`
2. Klik tombol **"Mulai Absen"**
3. Izinkan akses kamera
4. Arahkan wajah ke kamera
5. Sistem akan otomatis mendeteksi dan mencocokkan wajah
6. Notifikasi muncul jika wajah dikenali

### Admin Dashboard (`/dashboard`)
1. Klik **"Login Admin"** di navbar atau buka `/login`
2. Masuk dengan username `admin` dan password `admin123`
3. **Kelola Anggota** → Tambah anggota baru dengan capture 5 foto wajah interaktif yang memberi instruksi bertahap:
   - *Sample 1: Tatap Lurus ke Depan*
   - *Sample 2: Tersenyum Natural*
   - *Sample 3: Menoleh Sedikit ke Kiri (~15°)*
   - *Sample 4: Menoleh Sedikit ke Kanan (~15°)*
   - *Sample 5: Sedikit Menunduk / Angkat Dagu*
4. **Data Absensi** → Lihat rekap kehadiran lengkap beserta tanggal dan **Jam tepat saat scan (WIB)** serta fitur filter fleksibel

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
├── page.tsx              # Halaman absen utama
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
└── face-matcher.ts       # Cosine similarity matching

public/models/            # Model AI (blazeface + faceres)
prisma/
├── schema.prisma
├── seed.ts               # Seed admin default
└── dev.db                # Database SQLite
```

---

## ⚙️ Konfigurasi & Optimasi Performa

### 🛡️ Pencegahan Duplikasi Wajah (1 Wajah = 1 Akun)
Sistem memiliki pengamanan ganda (*frontend & backend API*) menggunakan *Cosine Similarity*. Saat admin mendaftarkan atau mengedit sampel wajah anggota, sistem mengecek terhadap **seluruh embedding wajah eksisting di database**. Jika terdeteksi kemiripan (`≥ 0.60`) dengan anggota lain yang sudah ada, sistem menolak penyimpanan dan memunculkan peringatan merah di UI.

### ⚡ Optimasi untuk Device Berspesifikasi Rendah (Low-End Devices)
Sistem telah dioptimalkan agar ringan dijalankan pada laptop/PC atau smartphone spesifikasi terbatas:
- **Throttle Detection FPS (`FaceDetector.tsx`)**: Pemrosesan *frame inference AI* dibatasi maksimal **10 FPS** (~100ms interval) sehingga beban GPU & RAM turun drastis hingga 80% tanpa mengorbankan kehalusan video (30/60 fps).
- **Single-Face Focus (`maxDetected: 1`)**: Pemindaian difokuskan hanya pada 1 wajah utama di depan kamera untuk mempercepat kalkulasi tensor WebGL.
- **Camera Frame Rate & Resolution Constraints**: Kamera meminta batas optimal `480x480` dengan frame rate hemat (`24-30 fps`).

### Face Recognition Threshold
Edit di `components/FaceDetector.tsx` & `lib/face-matcher.ts`:
```typescript
const SIMILARITY_THRESHOLD = 0.60; // Naikkan untuk lebih ketat, turunkan untuk lebih longgar
```

### Cooldown Antar Absen
Di `app/page.tsx`:
```typescript
cooldownMs={7000} // 7 detik cooldown per orang
```

### Stabilitas Deteksi
```typescript
const STABILITY_FRAMES = 8; // Frame stabil sebelum matching
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

---

## 🤖 Model AI yang Digunakan

- **blazeface** (~600KB) — Face detector
- **faceres** (~7MB) — Face recognition (128-dim embedding)

Model diload dari `public/models/` yang sudah disalin saat `npm run setup`.
