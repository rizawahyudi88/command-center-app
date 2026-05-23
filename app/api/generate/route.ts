import { NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase Client menggunakan variabel lingkungan
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        // 1. Tangkap payload JSON dari frontend
        const body = await request.json();
        const { template_type, variables } = body;

        // 2. Baca Template Master dari lokal penyimpanan server
        const templateFileName = template_type === 'LHK' ? 'template_lhk.docx' : 'template_lhk.docx';
        const templatePath = path.resolve(process.cwd(), 'templates', templateFileName);

        if (!fs.existsSync(templatePath)) {
            throw new Error(`File master template tidak ditemukan pada jalur: ${templatePath}`);
        }

        const content = fs.readFileSync(templatePath, 'binary');

        // 3. Render Dokumen (.docx) di dalam memori (RAM)
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true // Menjaga format enter/paragraf baru dari input teks
        });

        doc.render(variables);

        // Hasilkan file dalam bentuk node buffer
        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });

        // 4. Konfigurasi Autentikasi Google Drive (OAuth 2.0 User Token)
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // 5. Konversi Buffer ke Readable Stream (Syarat Mutlak Google Drive API)
        const bufferStream = new Readable();
        bufferStream.push(buf);
        bufferStream.push(null);

        // 6. Proses Pengunggahan ke Google Drive
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const outputFileName = `Draft_${template_type}_${Date.now()}.docx`;

        const driveResponse = await drive.files.create({
            requestBody: {
                name: outputFileName,
                parents: [folderId!],
            },
            media: {
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                body: bufferStream,
            },
            fields: 'id, webViewLink', // Meminta kembalian ID unik dan tautan web dari Google
        });

        // 7. Sinkronisasi Data: Simpan Riwayat & Metadata ke Supabase
        const { error: dbError } = await supabase
            .from('documents')
            .insert([
                {
                    title: outputFileName,
                    template_type: template_type,
                    jenis_naskah: template_type,
                    drive_file_id: driveResponse.data.id,
                    file_url: driveResponse.data.webViewLink,
                    variables: variables, // Menyimpan muatan variabel asli untuk cadangan data
                    status: 'draft'
                }
            ]);

        if (dbError) {
            console.error('Supabase Database Error:', dbError);
            throw new Error(`Gagal mengamankan riwayat ke database: ${dbError.message}`);
        }

        // 8. Kembalikan Respon Sukses Penuh ke Frontend Dashboard
        return NextResponse.json({
            success: true,
            message: 'Dokumen berhasil di-generate, diamankan di Cloud, dan dicatat di database.',
            file_name: outputFileName,
            drive_file_id: driveResponse.data.id,
            file_url: driveResponse.data.webViewLink
        }, { status: 200 });

    } catch (error: any) {
        console.error('Document Generation & Upload Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Terjadi gangguan internal pada server.'
        }, { status: 500 });
    }
}