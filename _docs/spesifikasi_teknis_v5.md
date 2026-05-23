# SPESIFIKASI TEKNIS SISTEM
**Nama Sistem:** AI Agent Generator Naskah Dinas & Command Center Operasional
**Versi Arsitektur:** 5.0 (Zero-Cost Serverless)
**Technical Architect / Project Manager:** Riza Fazrul Wahyudi, S.Kom
**Tanggal Rilis:** 21 Mei 2026

---

## I. Arsitektur Sistem & Topologi Pipeline Data
Sistem berjalan sepenuhnya di atas infrastruktur *Serverless* untuk menjamin biaya operasional Rp 0 (*Zero-Cost*).

```text
[ NEXT.JS FRONTEND (Vercel) ] --(Mudah & Cepat via Client SDK)--> [ SUPABASE AUTH & POSTGRES ]
             |
      (Secure API Route)
             |
             v
[ NEXT.JS EDGE/SERVERLESS BACKEND ]
             |
             +---> [ GOOGLE GEMINI API ] (Generasi Teks Baku LHK)
             |
             +---> [ GOOGLE DRIVE API ] (Service Account via Signed URL)
             |
             +---> [ ENGINE DOCXTEMPLATER ] (Injeksi Native .docx Tanpa Geser)
```

### Kebutuhan Dependensi (`package.json`)
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.11.0",
    "@supabase/supabase-js": "^2.43.4",
    "docxtemplater": "^3.47.0",
    "pizzip": "^3.0.6",
    "googleapis": "^137.0.0",
    "lucide-react": "^0.379.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0"
  }
}
```

---

## II. Skema Database Relasional (DDL SQL - Supabase)
Eksekusi skrip SQL ini langsung pada Editor SQL Supabase Anda untuk membangun tabel, tipe data khusus (*Enum*), serta mengaktifkan *Row Level Security* (RLS).

```sql
-- 1. PEMBUATAN TYPE ENUM CUSTOM
CREATE TYPE user_role AS ENUM ('ADMIN', 'PIMPINAN', 'OPERATOR_STAF');
CREATE TYPE task_type AS ENUM ('ADMINISTRASI', 'OPERASIONAL');
CREATE TYPE task_status AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'REPORTING', 'COMPLETED');
CREATE TYPE doc_status AS ENUM ('DRAFTING', 'WAITING_REVIEW', 'REVISION_REQ', 'FINALIZED');
CREATE TYPE jenis_naskah_type AS ENUM ('NOTA_DINAS', 'SURAT_TELEGRAM', 'LHK');

-- 2. TABEL USERS (PROFIL PERSONEL)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_lengkap VARCHAR(255) NOT NULL,
    nrp_nip VARCHAR(50) UNIQUE NOT NULL,
    jabatan VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'OPERATOR_STAF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABEL TASKS (TIKET PENUGASAN OPERASIONAL & ADMIN)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul_tugas VARCHAR(255) NOT NULL,
    tipe_tugas task_type NOT NULL,
    deskripsi_instruksi TEXT NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status task_status NOT NULL DEFAULT 'ASSIGNED',
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TABEL DOCUMENTS (MANAJEMEN NASKAH DINAS MSR WORD)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    jenis_naskah jenis_naskah_type NOT NULL,
    nomor_dokumen VARCHAR(100),
    status doc_status NOT NULL DEFAULT 'DRAFTING',
    current_version INT NOT NULL DEFAULT 1,
    drive_file_id VARCHAR(100), -- Menyimpan ID Unik File dari Google Drive
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABEL AUDIT LOGS (RIWAYAT TRANSAKSI & REVISI)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    catatan_revisi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. INDEXING UNTUK OPTIMALISASI QUERY MONITORING PIMPINAN
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_documents_task_id ON documents(task_id);
CREATE INDEX idx_documents_status ON documents(status);
```

---

## III. Spesifikasi Endpoints API (Next.js Serverless Routes)

### 1. `POST /api/generate` (Engine Pembuat MS Word)
*   **Request Headers:** `Content-Type: application/json`
*   **Request Body Payload:**
```json
{
  "task_id": "8b5f3a12-c419-4b8c-b930-f8d75239a512",
  "template_type": "LHK",
  "variables": {
    "nomor_surat": "B/ND-204/V/OPS/2026",
    "tanggal_dokumen": "21 Mei 2026",
    "perihal": "Laporan Hasil Rapat Koordinasi Wilayah",
    "isi_narasi": "Berdasarkan instruksi pimpinan, telah dilaksanakan rapat koordinasi..."
  }
}
```

### 2. `PATCH /api/documents/review` (Siklus Persetujuan & Revisi)
*   **Request Body Payload:**
```json
{
  "document_id": "c9a7b541-e128-4f9e-a131-d8923412abef",
  "action": "REJECT_WITH_REVISION",
  "user_id": "2d1f3e4a-9b8c-4d3e-ae12-8f7b6c5d4e3f",
  "catatan_revisi": "Perbaiki tata bahasa paragraf 3. Sebutkan jumlah personel yang hadir secara rinci."
}
```

---

## IV. Logika AI Agent & Rekayasa Prompt (Google Gemini API)

Sistem memanfaatkan SDK `@google/generative-ai` untuk merangkai teks mentah hasil giat operasional menjadi narasi formal kedinasan.

```typescript
import { GoogleGenAI } from '@google/generative-ai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const SYSTEM_INSTRUCTION = `
Anda adalah asisten AI berspesialisasi tinggi dalam penyusunan produk administrasi dan Tata Naskah Dinas resmi instansi pemerintah/kepolisian.
Tugas Anda adalah mengubah input berupa poin-poin mentah (bullet points) dari laporan petugas lapangan menjadi sebuah teks narasi Laporan Hasil Kegiatan (LHK) yang:
1. Menggunakan bahasa Indonesia yang sangat formal, baku, dan sesuai dengan Ejaan Yang Disempurnakan (EYD).
2. Memiliki nada bicara yang objektif, tegas, dan deskriptif.
3. Menghindari kata ganti orang pertama (seperti "saya", "kami"). Gunakan frasa penunjuk pos/jabatan seperti "telah dilaksanakan oleh personel gabungan...".
4. Menjaga struktur laporan operasional konvensional (Waktu, Tempat, Hasil yang Dicapai).
Output HANYA berupa teks narasi isi laporan, tanpa salam pembuka, tanpa tanda tangan, dan tanpa basa-basi percakapan.
`;

async function generateFormalNarration(rawNotes: string) {
  const model = ai.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION 
  });

  const prompt = `Ubah poin-poin kegiatan lapangan berikut menjadi narasi laporan dinas formal:

${rawNotes}`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}
```
