import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';

// Inisialisasi Supabase dengan Kunci Master (Bypass RLS untuk Backend API)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Konfigurasi Google OAuth2
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
);
oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});
const drive = google.drive({ version: 'v3', auth: oauth2Client });

export async function POST(request: Request) {
    try {
        const { template_type, variables, user_id } = await request.json();

        // 1. Pemetaan File Template Master
        const templateMap: Record<string, string> = {
            'LHK': 'template_lhk.docx',
            'SURAT_PERINTAH': 'template_sprin.docx',
            'NOTA_DINAS': 'template_nodin.docx'
        };
        const templateFileName = templateMap[template_type] || 'template_lhk.docx';
        const templatePath = path.join(process.cwd(), 'templates', templateFileName);

        if (!fs.existsSync(templatePath)) {
            return NextResponse.json({ success: false, error: `Template ${templateFileName} tidak ditemukan.` }, { status: 404 });
        }

        // 2. Perakitan Teks ke dalam File Word (.docx) di RAM
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        doc.render(variables);
        const docBuffer = doc.getZip().generate({ type: 'nodebuffer' });

        // 3. UNGGAH KE GOOGLE DRIVE SEBAGAI GOOGLE DOCS (Untuk Trigger Mesin Konversi)
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const titleWithoutExt = `Draft_${template_type}_${Date.now()}`;

        const driveResponse = await drive.files.create({
            requestBody: {
                name: titleWithoutExt,
                mimeType: 'application/vnd.google-apps.document', // Mengubah .docx menjadi format Google Docs otomatis
                parents: folderId ? [folderId] : undefined,
            },
            media: {
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                body: require('stream').Readable.from(docBuffer),
            },
            fields: 'id, webViewLink',
        });

        const googleDocId = driveResponse.data.id;

        if (!googleDocId) {
            throw new Error('Gagal mendapatkan ID Dokumen dari Google Drive.');
        }

        // 4. EKSPOR OTOMATIS MENJADI PDF MURNI VIA DRIVE ENGINE
        const pdfResponse = await drive.files.export({
            fileId: googleDocId,
            mimeType: 'application/pdf',
        }, { responseType: 'stream' });

        // 5. UNGGAH HASIL PDF KEMBALI KE FOLDER DRIVE ANDA
        const finalPdfUpload = await drive.files.create({
            requestBody: {
                name: `${titleWithoutExt}.pdf`,
                parents: folderId ? [folderId] : undefined,
            },
            media: {
                mimeType: 'application/pdf',
                body: pdfResponse.data,
            },
            fields: 'id, webViewLink',
        });

        // 6. BERSIHKAN FILE GOOGLE DOCS MENTAH (Opsional, agar folder Drive tidak penuh)
        await drive.files.delete({ fileId: googleDocId }).catch(err => console.error("Gagal menghapus file mentah:", err));

        const finalPdfUrl = finalPdfUpload.data.webViewLink;

        // 7. AMANKAN LOG DAN RIWAYAT KE DATABASE SUPABASE
        const { error: dbError } = await supabase
            .from('documents')
            .insert([
                {
                    title: `${titleWithoutExt}.pdf`,
                    jenis_naskah: template_type,
                    file_url: finalPdfUrl,
                    status: 'WAITING_APPROVAL', // Ubah status menjadi menunggu persetujuan
                    user_id: user_id // Rekam ID pembuat dokumen
                }
            ]);

        if (dbError) {
            throw new Error(`Gagal mengamankan riwayat ke database: ${dbError.message}`);
        }

        return NextResponse.json({
            success: true,
            file_id: finalPdfUpload.data.id,
            file_url: finalPdfUrl
        });

    } catch (error: any) {
        console.error('Pipa Arsitektur Generate Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Gagal mengeksekusi otomatisasi dokumen.'
        }, { status: 500 });
    }
}