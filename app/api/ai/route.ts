import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inisialisasi Model Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json({ success: false, error: 'Instruksi tidak boleh kosong.' }, { status: 400 });
        }

        // Memilih model: gemini-1.5-flash sangat cepat dan cocok untuk tugas teks
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        // SYSTEM INSTRUCTION: Membentuk Persona AI Agent sebagai Asisten Naskah Dinas
        const systemPrompt = `
      Anda adalah AI Asisten spesialis penyusun Naskah Dinas Polri tingkat lanjut.
      Tugas Anda adalah mengubah poin-poin informasi mentah/singkat yang diberikan pengguna menjadi sebuah paragraf narasi laporan formal yang siap dimasukkan ke dalam dokumen dinas.
      
      Aturan Mutlak:
      1. Gunakan bahasa Indonesia baku yang sangat formal, tegas, dan profesional sesuai standar Ejaan Yang Disempurnakan (EYD).
      2. Gunakan terminologi operasional standar kepolisian yang tepat (misal: "giat" untuk kegiatan, "sitkamtibmas", "personel", "kondusif").
      3. Jangan menambahkan informasi fiktif yang tidak ada di poin mentah, cukup elaborasi dan perbaiki struktur kalimatnya.
      4. Output HANYA berupa teks laporan akhir (tanpa basa-basi, tanpa ucapan pembuka/penutup seperti "Berikut adalah laporannya:").
      
      Poin Mentah dari Pengguna:
      ${prompt}
    `;

        // Eksekusi prompt ke server Google Gemini
        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();

        return NextResponse.json({
            success: true,
            data: responseText
        });

    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Gagal terhubung ke server AI.'
        }, { status: 500 });
    }
}