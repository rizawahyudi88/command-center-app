import { NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function POST(request: Request) {
    try {
        // 1. Tangkap payload JSON
        const body = await request.json();
        const { template_type, variables } = body;

        // 2. Baca Template Master dari lokal
        const templateFileName = template_type === 'LHK' ? 'template_lhk.docx' : 'template_lhk.docx';
        const templatePath = path.resolve(process.cwd(), 'templates', templateFileName);
        const content = fs.readFileSync(templatePath, 'binary');

        // 3. Render Dokumen (.docx di memori/RAM)
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
        doc.render(variables);

        // Hasilkan file dalam bentuk buffer
        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

        // 4. Konfigurasi Autentikasi Google Drive (OAuth 2.0)
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // 5. Konversi Buffer ke Stream (Syarat Google Drive API)
        const bufferStream = new Readable();
        bufferStream.push(buf);
        bufferStream.push(null);

        // 6. Proses Upload ke Google Drive
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const outputFileName = `Draft_${template_type}_${Date.now()}.docx`;

        const response = await drive.files.create({
            requestBody: {
                name: outputFileName,
                parents: [folderId!],
            },
            media: {
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                body: bufferStream,
            },
            fields: 'id, webViewLink', // Meminta Google mengembalikan ID unik dan Link file
        });

        // 7. Kembalikan respon sukses beserta ID File Google Drive
        return NextResponse.json({
            success: true,
            message: 'Dokumen berhasil di-generate dan diamankan di Google Drive.',
            file_name: outputFileName,
            drive_file_id: response.data.id,
            file_url: response.data.webViewLink
        }, { status: 200 });

    } catch (error: any) {
        console.error('Document Generation & Upload Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}