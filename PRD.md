# Product Requirement Document (PRD)

## QueueExpress - Sistem Antrean Digital untuk UMKM Lokal

| Metadata | Nilai |
| --- | --- |
| Nama Produk | QueueExpress (nama dagang: **AntriLokal**) |
| Versi Dokumen | 1.0 |
| Status | Draft |
| Terakhir Diperbarui | 2026-10-05 |

---

## Daftar Isi

1. [Executive Summary](#1-executive-summary)
2. [Target Users & User Personas](#2-target-users--user-personas)
3. [Key Features & Functional Requirements](#3-key-features--functional-requirements)
4. [Technical Architecture & Tech Stack](#4-technical-architecture--tech-stack)
5. [Database Schema Draft (Prisma Model)](#5-database-schema-draft-prisma-model)
6. [Implementation Milestones](#6-implementation-milestones)

---

## 1. Executive Summary

**QueueExpress** adalah sistem antrean digital *real-time* berbasis *web-first* (tanpa perlu mengunduh aplikasi) yang dirancang untuk tempat usaha lokal non-IT seperti barbershop, tempat cuci kendaraan, klinik, bengkel, hingga rumah makan.

Sistem ini memangkas waktu tunggu fisik pelanggan dengan menyediakan:

- **Tiket antrean digital** langsung di browser HP melalui **QR Code**.
- **Dashboard operator** yang intuitif untuk pemilik toko.
- **TV Display Board** interaktif dengan tampilan berbasis animasi modern.

### Masalah yang Diselesaikan

| Masalah Saat Ini | Dampak | Solusi QueueExpress |
| --- | --- | --- |
| Pelanggan mengantre fisik di lokasi | Waktu terbuang, tidak dapat melakukan aktivitas lain | Tiket digital + monitoring antrean dari HP |
| Ketidakpastian kapan giliran giliran tiba | Ketidakpuasan pelanggan | Live status card dengan estimasi waktu tunggu |
| Process manual (papan tulis, buku) | Sulit dipantau, rawan human error | Dashboard operator *real-time* via WebSocket |
| Informasi antrean tidak terlihat di ruang tunggu | Pelanggan tidak tahu gilirannya, suasana membosankan | TV Display Board + audio announcement |

---

## 2. Target Users & User Personas

### 2.1 Pelanggan Toko (Non-IT / Public)

| Aspek | Deskripsi |
| --- | --- |
| **Karakteristik** | Ingin kepastian waktu, tidak mau mengunduh aplikasi baru, dan enggan mengantre berjam-jam di lokasi |
| **Ekspektasi** | Cukup *scan QR code*, dapat nomor, lalu bisa menunggu santai di tempat lain sambil memantau sisa antrean dari HP |
| **Kebutuhan Utama** | Kemudahan akses, transparansi antrean, notifikasi real-time |
| **Kendala Teknis** | Smartphone entry-level, koneksi tidak stabil, tidak terbiasa dengan aplikasi |

### 2.2 Pemilik Usaha / Kasir / Operator

| Aspek | Deskripsi |
| --- | --- |
| **Karakteristik** | Menginginkan alur kerja yang praktis, tidak rumit, dan tidak mengganggu proses transaksi harian |
| **Ekspektasi** | Tombol kontrol panggil/selesai berukuran besar, responsif di HP/tablet, dan laporan statistik harian yang jelas |
| **Kebutuhan Utama** | Kontrol satu ketukan, tidak perlu belajar sistem rumit, data harian berguna |
| **Kendala Teknis** | Tidak paham teknologi, perangkat bervariasi (HP & tablet), koneksi lokasi tidak stabil |

### 2.3 Audiens Umum / Ruang Tunggu Toko

| Aspek | Deskripsi |
| --- | --- |
| **Karakteristik** | Pelanggan yang sedang berada di lokasi ruang tunggu |
| **Ekspektasi** | Layar TV/monitor informasi antrean yang estetik, jelas dari kejauhan, dan disertai efek suara saat ada panggilan |

---

## 3. Key Features & Functional Requirements

### A. Customer Flow (Mobile Web)

#### A.1 Scan & Ticket Generation
- Pelanggan memindai **QR Code unik toko**.
- Pelanggan langsung mendapatkan tiket antrean berbasis web **tanpa login**.
- Tiket diproses pada URL yang bisa dibagikan/di-bookmark.

#### A.2 Live Status Card
Menampilkan:
- Nomor tiket pengguna.
- Nomor yang sedang dilayani.
- Estimasi waktu tunggu.
- Jumlah antrean di depan.

#### A.3 Smart Alert Status
- Warna tampilan **berubah otomatis** pada tiga kondisi:
  1. **Menunggu** - status normal.
  2. **Sisa 1 Antrean (mode bersiap)** - status "siap".
  3. **Nomor Anda Dipanggil** - disertai efek getar (*vibration*) dan notifikasi visual.
- Perubahan status diterima secara *real-time* tanpa perlu *refresh* manual.

---

### B. Operator Dashboard (Tablet / Mobile Web)

#### B.1 One-Tap Queue Controls
Tombol aksi besar (thumb-friendly) dengan fungsi:

| Tombol | Fungsi |
| --- | --- |
| **Panggil Selanjutnya** | Mengubah status nomor berikutnya menjadi `CALLED` |
| **Panggil Ulang** | Mengirim pemicu audio/visual ulang ke TV dan HP pelanggan |
| **Selesai** | Menandai layanan selesai (`COMPLETED`) dan menghapus dari antrean aktif |
| **Lewati / Batal** | Menandai pelanggan yang tidak hadir (`SKIPPED`) |

#### B.2 Multi-Service Selection
- Kemampuan memisahkan antrean berdasarkan **jenis layanan**.
- Contoh: **Cukur Kilat** vs **Cukur + Cuci**.
- Setiap layanan memiliki estimasi durasi sendiri (`estMinutes`).

#### B.3 Statistik Harian (Daily Metrics)
Menampilkan:
- Total antrean dilayani hari ini.
- Rata-rata waktu tunggu per pelanggan.
- Antrean tersisa.

---

### C. Live TV Display Board (Public Screen)

#### C.1 Futuristic / Sleek Screen Interface
- Layar khusus untuk dipasang di monitor/TV toko.
- Nama rute: `/display/[storeSlug]`.
- Prinsip desain: **jelas dari jarak jauh**, estetik, animasi halus.

#### C.2 Audio Announcement Engine
- Efek suara **bel (*chime*)** atau **suara sintesis**.
- Berbunyi otomatis saat nomor dipanggil.

#### C.3 Recent Activity Log
- Menampilkan nomor yang sedang dilayani.
- Menampilkan **3-5 nomor antrean berikutnya** dalam antrean.
- *Scrolling* / marquee berhalus untuk daftar nomor berikutnya.

---

### D. Public Showcase / Demo Mode (Portfolio Special)

#### D.1 Simulasi Dual-Screen
- Halaman demonstrasi **publik** (untuk portofolio / tampilannya).
- Pengunjung web bisa menyimulasikan peran sebagai **Operator** (sisi kiri).
- Pengunjung bisa menyimulasikan peran sebagai **Pelanggan** (sisi kanan).
- Sisi-kiri dan sisi-kanan ditampilkan **berdampingan** untuk menguji **sinkronisasi *real-time***.

---

## 4. Technical Architecture & Tech Stack

### 4.1 Overview Arsitektur

```
[Customer (Mobile Web)]        [Operator (Tablet)]         [TV Display]
        |                            |                           |
        |    Scan QR / WebSocket     |      WebSocket            |
        +----------------------------+----------------------------+
                                     |
                              [Next.js Frontend]
                                     |
                              [NestJS Backend API]
                                     |
                       [PostgreSQL (Supabase) + Prisma ORM]
                                     |
                              [WebSockets (Socket.io)]
```

### 4.2 Tech Stack

| Layer | Technology |
| --- | --- |
| Monorepo Architecture | **Turborepo / Bun Workspace** |
| Frontend App (`apps/web`) | **Next.js**, **Tailwind CSS**, **Framer Motion**, **Lucide Icons** |
| Backend API (`apps/api`) | **NestJS** |
| Database & ORM | **PostgreSQL (Supabase)** + **Prisma ORM** |
| Real-time Engine | **WebSockets (Socket.io)** |
| Hosting & Deployment | **Vercel** (Frontend) + **Railway** (Backend API) |

### 4.3 Struktur Monorepo (Plan)

```
queueexpress/
apps/
  web/          # Next.js (Customer, Operator, Display, Demo)
  api/          # NestJS (CRUD + Socket.io Gateway)
packages/
  db/           # Prisma schema + client
  shared/       # Shared types (DTO, enum, events)
turbo.json
```

### 4.4 Rencana Rute Frontend

| Route | Keterangan |
| --- | --- |
| `/queue/[ticketId]` | Customer Mobile Ticket View |
| `/operator` | Operator Control Dashboard |
| `/display/[storeSlug]` | TV Display Screen View |
| `/demo` | Public Dual-Screen Demo Mode |
| `/` | Landing / scan QR entry |

---

## 5. Database Schema Draft (Prisma Model)

### 5.1 Enum Status Antrean

`QueueStatus` mendefinisikan status siklus hidup tiket:

| Status | Deskripsi |
| --- | --- |
| `WAITING` | Menunggu giliran dipanggil |
| `CALLED` | Sudah dipanggil, belum mulai dilayani |
| `PROCESSING` | Sedang dilayani |
| `COMPLETED` | Selesai dilayani |
| `SKIPPED` | Dilewati / pelanggan tidak hadir |
| `CANCELLED` | Dibatalkan |

### 5.2 Skema Prisma

```prisma
enum QueueStatus {
  WAITING
  CALLED
  PROCESSING
  COMPLETED
  SKIPPED
  CANCELLED
}

model Store {
  id          String     @id @default(uuid())
  name        String
  slug        String     @unique
  address     String?
  qrCodeUrl   String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  services    Service[]
  queues      Queue[]
}

model Service {
  id          String   @id @default(uuid())
  storeId     String
  store       Store    @relation(fields: [storeId], references: [id])
  name        String
  estMinutes  Int      @default(15)
  queues      Queue[]
}

model Queue {
  id          String      @id @default(uuid())
  storeId     String
  store       Store       @relation(fields: [storeId], references: [id])
  serviceId   String
  service     Service     @relation(fields: [serviceId], references: [id])
  ticketNum   String
  customerName String?
  status      QueueStatus @default(WAITING)
  createdAt   DateTime    @default(now())
  calledAt    DateTime?
  completedAt DateTime?
}
```

### 5.3 Catatan Tambahan (untuk diskusi)

- `PROCESSING` saat ini belum terangkai di **One-Tap Queue Controls** - pertimbangkan alur `CALLED` -> `PROCESSING` manual atau otomatis saat `Selesai` diklik.
- Direkomendasikan menambah **unique constraint** pada kombinasi `(storeId, ticketNum)` untuk mencegah nomor duplikat.
- Untuk **statistik harian**, pertimbangkan field atau tabel terpisah (misalnya `QueueEvent`) untuk menyimpan riwayat tanpa menambah beban pada tabel `Queue`.

---

## 6. Implementation Milestones

### Phase 1: Architecture & Backend API Setup (NestJS + Prisma)
- Setup schema database (`Store`, `Service`, `Queue`).
- Buat endpoint API CRUD & logika penomoran antrean.

### Phase 2: Real-time Communication Layer (Socket.io)
- Konfigurasi WebSocket Gateway di NestJS.
- Tautkan event `queue:created`, `queue:called`, `queue:completed`.

### Phase 3: Frontend Interface Development (Next.js)
- Buat Customer Mobile Ticket View (`/queue/[ticketId]`).
- Buat Operator Control Dashboard (`/operator`).
- Buat Display Screen TV View (`/display/[storeSlug]`).

### Phase 4: Animation, Audio & Polish
- Integrasi animasi Framer Motion & sound effects di TV Display.
- Tambahkan fitur Public Interactive Demo Mode.
- Tes koneksi otomatis WebSocket & deployment Vercel/Railway.

---

## 7. Success Metrics *(Draft)*

| Metrik | Definisi | Target |
| --- | --- | --- |
| Rata-rata waktu tunggu | Rata-rata durasi dari tiket dibuat hingga dipanggil | < 5 menit rata-rata |
| Adoption QR | % pelanggan yang mengambil tiket digital vs antrean fisik | > 70% |
| Kesesuaian UX | Skor kepuasan operator (skala 1-5) | >= 4.5 |
| Retensi Demo | Kunjungan mingguan ke halaman demo | > 100 kunjungan |

---