import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Menggunakan Gemini API Key dari .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { prompt, template_type } = await request.json();

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt kosong' }, { status: 400 });
    }

    // Menggunakan model efisien yang sudah kita bahas sebelumnya
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    let systemInstruction = "";

    // LOGIKA KONDISIONAL SANDI TELEGRAM
    if (template_type === 'SURAT_TELEGRAM') {
      systemInstruction = `Anda adalah asisten AI khusus pembuat draf Surat Telegram (ST) Polri.
      Ubah narasi mentah dari pengguna menjadi bahasa telegram yang kaku, padat, dan jelas dengan mematuhi ATURAN MUTLAK berikut:
      1. WAJIB GUNAKAN HURUF KAPITAL SEMUA (ALL CAPS).
      2. Dilarang keras menggunakan simbol tanda baca (, . / -). Ganti dengan sandi huruf:
         - Titik (.) diganti menjadi TTK
         - Koma (,) diganti menjadi KMA
         - Titik dua (:) diganti menjadi TTK DUA
         - Garis miring (/) diganti menjadi GRS MRG
         - Tanda hubung (-) diganti menjadi TND HBNG
      3. Gunakan singkatan dinas baku: TGL (Tanggal), YBS (Yang Bersangkutan), TPT (Tempat), JML (Jumlah), KET (Keterangan), GUNA (Untuk digunakan), SBB (Sebagai berikut).
      4. Jangan tambahkan kata pengantar atau penutup. Langsung berikan hasil teksnya saja.`;
    } else {
      systemInstruction = `Anda adalah asisten staf administrasi ahli. Rapihkan poin-poin mentah dari pengguna menjadi paragraf laporan dinas (Nota Dinas/LHK) yang sangat formal, menggunakan bahasa Indonesia baku (EYD), profesional, dan ringkas. Jangan mengubah fakta, hanya perbaiki struktur bahasanya saja. Jangan gunakan format Markdown (* atau #), gunakan teks datar biasa.`;
    }

    const finalPrompt = `${systemInstruction}\n\nBerikut adalah narasi mentah yang harus diolah:\n"${prompt}"`;

    const result = await model.generateContent(finalPrompt);
    const responseText = result.response.text();

    return NextResponse.json({ success: true, data: responseText });

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}