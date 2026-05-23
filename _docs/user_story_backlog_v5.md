# USER STORY BACKLOG
**Proyek:** AI Agent Generator Naskah Dinas & Command Center Operasional
**Arsitektur:** Zero-Cost Serverless Stack

---

## EPIC 1: Autentikasi & Manajemen Akses Dasar

### US 1.1: Login Sistem
**Sebagai** Pengguna (Pimpinan/Staf/Admin),
**Saya ingin** masuk ke dalam sistem menggunakan otentikasi yang aman (NRP/NIP dan *password*),
**Sehingga** saya bisa mengakses *dashboard* sesuai dengan kewenangan saya.
*   **Kriteria Penerimaan:**
    *   Sistem memvalidasi kredensial pengguna ke *database* Supabase.
    *   Jika berhasil, pengguna diarahkan ke *dashboard* spesifik berdasarkan *Role* (`ADMIN`, `PIMPINAN`, atau `OPERATOR_STAF`).
    *   Jika gagal, sistem menampilkan pesan *error* "Kredensial tidak valid".

### US 1.2: Manajemen Template (Khusus Admin)
**Sebagai** Administrator,
**Saya ingin** mengelola tautan ID *Template* Master (.docx) dari Google Drive ke dalam sistem,
**Sehingga** mesin pembuat dokumen (`docxtemplater`) selalu merujuk pada format tata naskah baku instansi yang terbaru.
*   **Kriteria Penerimaan:**
    *   Admin dapat menambahkan atau memperbarui ID Google Drive untuk *template* (cth: Nota Dinas, LHK).
    *   Sistem menyimpan perubahan tersebut di *database* tanpa menghapus *template* lama.

---

## EPIC 2: Pendelegasian Tugas (Command Center Module)

### US 2.1: Pembuatan Tiket Tugas
**Sebagai** Pimpinan,
**Saya ingin** membuat tiket penugasan baru (Tipe: Administrasi atau Operasional) dan menugaskannya kepada staf tertentu,
**Sehingga** instruksi saya terdokumentasi, terukur *deadline*-nya, dan staf langsung menerima notifikasi.
*   **Kriteria Penerimaan:**
    *   Pimpinan dapat mengisi *form*: Judul Tugas, Tipe, Deskripsi, Penerima Tugas (Staf), dan *Due Date*.
    *   Setelah disimpan, status tugas otomatis menjadi `ASSIGNED` di *database*.
    *   Notifikasi dikirim ke staf yang ditugaskan.

### US 2.2: Pemantauan Matriks Tugas
**Sebagai** Pimpinan,
**Saya ingin** melihat daftar seluruh tugas pada sebuah *dashboard* bergaya *Data Grid*,
**Sehingga** saya bisa mengetahui secara *real-time* tugas mana yang berstatus `IN_PROGRESS`, `REPORTING`, atau *overdue*.
*   **Kriteria Penerimaan:**
    *   *Dashboard* menampilkan baris tugas (*TaskRow*) dengan *badge* status berwarna (*color-coded*) sesuai pedoman *High-End Editorial*.
    *   Pimpinan dapat menyaring (filter) tampilan berdasarkan status atau nama staf.

---

## EPIC 3: Eksekusi Lapangan & Pelaporan (AI Integration)

### US 3.1: Konfirmasi Giat Lapangan
**Sebagai** Staf / Operator,
**Saya ingin** merespons tiket tugas operasional yang saya terima,
**Sehingga** pimpinan mengetahui bahwa saya sudah mulai bergerak atau tiba di lokasi.
*   **Kriteria Penerimaan:**
    *   Staf dapat menekan tombol "Mulai Kerjakan" pada tiket tugas.
    *   Status tugas di *database* berubah dari `ASSIGNED` menjadi `IN_PROGRESS`.

### US 3.2: Pelaporan Hasil Kegiatan (LHK) dengan AI
**Sebagai** Staf / Operator,
**Saya ingin** memasukkan poin-poin mentah hasil kegiatan, kordinat, dan foto ke dalam sistem saat selesai giat,
**Sehingga** asisten AI (Gemini) dapat otomatis merangkai Laporan Hasil Kegiatan (LHK) formal untuk saya tanpa saya harus mengetik dari nol.
*   **Kriteria Penerimaan:**
    *   Terdapat *form* unggah foto (maks 3) yang akan langsung masuk ke Google Drive.
    *   Terdapat kotak teks untuk memasukkan *bullet points* hasil giat.
    *   Saat staf klik "Generate", sistem mengirim teks mentah ke Gemini API dan mengembalikan narasi formal ke layar untuk di-*review* oleh staf sebelum disuntikkan ke MS Word.
    *   Status tugas berubah menjadi `REPORTING`.

---

## EPIC 4: Siklus Tata Naskah & Pengawasan (Document Engine)

### US 4.1: Injeksi Dokumen Native MS Word
**Sebagai** Staf / Operator,
**Saya ingin** menyimpan narasi yang sudah dirangkai AI (beserta data variabel seperti Nomor Surat dan Tanggal) ke dalam *template* resmi,
**Sehingga** saya mendapatkan draf MS Word (.docx) yang format margin dan stempelnya persis 100% dengan aslinya.
*   **Kriteria Penerimaan:**
    *   Sistem (*backend* Vercel) mengeksekusi `docxtemplater` untuk menyuntikkan data ke file master di Google Drive.
    *   File draf baru (.docx) tercipta dan tersimpan di folder `/Drafts_In_Progress`.
    *   Entri dokumen masuk ke tabel `documents` dengan status `DRAFTING` (Versi 1).

### US 4.2: Pengajuan Review Dokumen
**Sebagai** Staf / Operator,
**Saya ingin** mengajukan draf naskah yang sudah selesai kepada pimpinan,
**Sehingga** naskah tersebut bisa diperiksa silang dan hak akses modifikasi saya dikunci sementara.
*   **Kriteria Penerimaan:**
    *   Staf menekan tombol "Ajukan ke Pimpinan".
    *   Status dokumen berubah menjadi `WAITING_REVIEW`.
    *   Akses *form input* staf berubah menjadi *Read-Only*.

### US 4.3: Pratinjau Naskah & Catatan Revisi (Pimpinan)
**Sebagai** Pimpinan,
**Saya ingin** melihat *preview* naskah dalam format PDF tanpa harus mengunduh file, dan memberikan catatan jika ada yang salah,
**Sehingga** keamanan file MS Word tetap terjaga dan staf tahu bagian mana yang harus diperbaiki.
*   **Kriteria Penerimaan:**
    *   *Dashboard* merender dokumen PDF menggunakan *Signed URL* dari Google Drive (berlaku terbatas 15 menit).
    *   Pimpinan memiliki kolom *input* untuk mengetik instruksi revisi.
    *   Jika pimpinan menolak, status berubah menjadi `REVISION_REQ`, status kembali terbuka bagi staf, dan catatan terekam di `audit_logs`.

### US 4.4: Revisi dan Peningkatan Versi Dokumen (Version Control)
**Sebagai** Staf / Operator,
**Saya ingin** memperbaiki *input* form berdasarkan catatan pimpinan dan men-*generate* ulang naskah,
**Sehingga** sistem otomatis membuat naskah Versi 2 (V2) tanpa menghapus jejak file Versi 1.
*   **Kriteria Penerimaan:**
    *   Staf memperbaiki data dan klik "Generate Ulang".
    *   Dokumen `.docx` baru terbuat. Atribut `current_version` di *database* naik +1 (misal dari 1 ke 2).
    *   Status kembali ke `WAITING_REVIEW`.

### US 4.5: Persetujuan Akhir (Finalisasi)
**Sebagai** Pimpinan,
**Saya ingin** menyetujui dokumen yang sudah sempurna,
**Sehingga** dokumen dikunci secara permanen menjadi PDF final, dimasukkan ke arsip, dan siklus tugas dinyatakan tuntas.
*   **Kriteria Penerimaan:**
    *   Pimpinan klik "Setujui Naskah".
    *   Status dokumen berubah menjadi `FINALIZED` dan status tiket tugas induk berubah menjadi `COMPLETED`.
    *   Akses seluruh *user* ke dokumen tersebut terkunci permanen.
