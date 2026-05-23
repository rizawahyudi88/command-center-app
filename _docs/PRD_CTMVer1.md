# PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Nama Sistem:** AI Agent Generator Naskah Dinas & Command Center Operasional
**Versi:** 5.0 (Comprehensive Build Specification)
**Arsitektur:** Zero-Cost Serverless (Next.js, Supabase, Google Drive, Gemini API)
**Project Manager / Architect:** Riza Fazrul Wahyudi, S.Kom

---

## 1. Ringkasan Eksekutif & Tujuan Sistem
Sistem ini merupakan pusat komando digital yang mengintegrasikan pendelegasian tugas operasional lapangan dengan otomatisasi tata naskah dinas. Bertujuan untuk menekan waktu birokrasi, sistem memandu proses dari instruksi awal, eksekusi lapangan, hingga generasi otomatis draf naskah resmi (seperti Nota Dinas, Surat Telegram, Laporan Hasil Kegiatan) menggunakan Kecerdasan Buatan. Seluruh *output* dokumen dijamin 100% presisi secara format (Native MS Word) tanpa *formatting drift*.

---

## 2. Arsitektur Infrastruktur (Zero-Cost Stack)
Sistem ini menggunakan pendekatan *Serverless* untuk memastikan performa tinggi dengan biaya *hosting* Rp 0.

*   **Frontend & Application Framework:** Next.js (App Router) memanfaatkan React Server Components (RSC) untuk pemuatan halaman super cepat. Di-*hosting* di **Vercel** (Free Tier).
*   **Database & Authentication:** **Supabase** (PostgreSQL) mengatur otentikasi berbasis *Role-Based Access Control* (RBAC) dan menyimpan skema relasional operasional.
*   **Document Generation Engine:** API Routes pada Next.js (Node.js *runtime*) menjalankan `docxtemplater`. Membaca file `.docx` mentah, menyuntikkan data JSON, dan merender dokumen baru.
*   **File Repository:** **Google Drive API** (menggunakan *Service Account*). Bertindak sebagai *bucket* statis untuk *Template Master*, aset foto giat, dan arsip PDF final.
*   **AI Copilot:** **Google Gemini API** terintegrasi untuk menstrukturkan *bullet points* laporan mentah dari lapangan menjadi narasi Laporan Hasil Kegiatan (LHK) yang formal dan baku.

---

## 3. Spesifikasi Skema Database (Supabase / PostgreSQL)

### Tabel `users`
*   `id` (UUID, Primary Key)
*   `nama_lengkap` (Varchar)
*   `nrp_nip` (Varchar, Unique)
*   `jabatan` (Varchar)
*   `role` (Enum: `ADMIN`, `PIMPINAN`, `OPERATOR_STAF`)

### Tabel `tasks` (Modul Operasional & Administrasi)
*   `id` (UUID, Primary Key)
*   `judul_tugas` (Varchar)
*   `tipe_tugas` (Enum: `ADMINISTRASI`, `OPERASIONAL`)
*   `deskripsi_instruksi` (Text)
*   `assigned_to` (UUID, Foreign Key ke `users`)
*   `created_by` (UUID, Foreign Key ke `users`)
*   `status` (Enum: `ASSIGNED`, `IN_PROGRESS`, `REPORTING`, `COMPLETED`)

### Tabel `documents` (Modul Naskah Dinas)
*   `id` (UUID, Primary Key)
*   `task_id` (UUID, Foreign Key ke `tasks`)
*   `jenis_naskah` (Enum: `NOTA_DINAS`, `SURAT_TELEGRAM`, `LHK`, dll)
*   `status` (Enum: `DRAFTING`, `WAITING_REVIEW`, `REVISION_REQ`, `FINALIZED`)
*   `current_version` (Integer, Default: 1)
*   `drive_file_id` (Varchar - ID referensi ke Google Drive)

### Tabel `audit_logs` (Tracking & History)
*   `id` (UUID, Primary Key)
*   `document_id` (UUID, Foreign Key ke `documents`)
*   `user_id` (UUID, Foreign Key ke `users`)
*   `action` (Varchar)
*   `catatan_revisi` (Text, Nullable)

---

## 4. Alur Kerja (Workflow & State Machine)

### A. Alur Tugas Operasional (Giat Lapangan)
1.  **[ASSIGNED]** Pimpinan membuat *Task* di *dashboard*. Notifikasi dikirim ke staf.
2.  **[IN_PROGRESS]** Staf menerima dan mengeksekusi tugas di lapangan.
3.  **[REPORTING]** Selesai giat, staf mengisi *form* Next.js (titik kordinat, foto, teks hasil). Teks dikirim ke Gemini API untuk dirangkai menjadi LHK formal.
4.  **[TRIGGER DRAFTING]** Sistem otomatis memotong kompas membuat entri di tabel `documents` dengan status `DRAFTING`.

### B. Alur Pengawasan Naskah Dinas (Approval Chain)
1.  **[DRAFTING]** Teks dari AI disuntikkan ke template `.docx` via API Next.js dan diunggah ke Drive.
2.  **[WAITING_REVIEW]** Staf mengajukan dokumen. Akses staf dikunci (*Read-Only*).
3.  **[REVISION_REQ]** Pimpinan melihat *preview* PDF. Jika ada koreksi, pimpinan mengisi `catatan_revisi`. `current_version` naik menjadi V2 setelah staf memperbaikinya.
4.  **[FINALIZED]** Pimpinan menyetujui. Dokumen dikonversi menjadi PDF statis dan status menjadi `COMPLETED`.

---

## 5. Pedoman Antarmuka Pengguna (UI/UX Guidelines)
*   **Visual Philosophy:** *High-End Editorial* & *Swiss-style*. Mengedepankan ruang kosong (*ample white space*) dan navigasi intuitif.
*   **Color Palette:** *Matte Obsidian* (tema gelap elegan) dipadukan dengan aksen putih kontras.
*   **Typography:** Tipografi *Sans-Serif* yang tebal (Bold) pada *header* untuk keterbacaan instan.

---

## 6. Spesifikasi Integrasi & API (Backend Logic)

### Payload `docxtemplater` (API Route `POST /api/generate`)
```json
{
  "document_id": "uuid-1234",
  "template_type": "nota_dinas",
  "data": {
    "nomor_surat": "B/123/V/2026/Ops",
    "tanggal": "21 Mei 2026",
    "kepada": "Kapolda",
    "dari": "Dir Ops",
    "perihal": "Laporan Giat Patroli",
    "isi_narasi": "[Hasil Generate AI dari Gemini]"
  }
}