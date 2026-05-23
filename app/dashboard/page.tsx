"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle, ExternalLink, Clock, File, Sparkles, ChevronDown } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function DocumentGeneratorPage() {
    const [loading, setLoading] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [successData, setSuccessData] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // STATE BARU: Menyimpan jenis naskah yang dipilih
    const [templateType, setTemplateType] = useState('LHK');

    const [formData, setFormData] = useState({
        nomor_surat: 'B/ND-001/V/OPS/2026',
        tanggal_dokumen: '23 Mei 2026',
        perihal: 'Laporan Situasi Operasional',
        isi_narasi: ''
    });

    const fetchHistory = async () => {
        setLoadingHistory(true);
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (data) setHistory(data);
        if (error) console.error('Gagal mengambil riwayat:', error);
        setLoadingHistory(false);
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGenerateAI = async () => {
        if (!formData.isi_narasi.trim()) {
            alert("Ketik poin-poin laporan mentah terlebih dahulu di kolom narasi.");
            return;
        }

        setGeneratingAI(true);
        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: formData.isi_narasi })
            });

            const result = await response.json();

            if (result.success) {
                setFormData({ ...formData, isi_narasi: result.data.trim() });
            } else {
                alert('AI Gagal: ' + result.error);
            }
        } catch (error) {
            console.error(error);
            alert('Terjadi kesalahan koneksi ke server AI Google.');
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleGenerateDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccessData(null);

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template_type: templateType, // Menggunakan state dropdown
                    variables: formData
                })
            });

            const result = await response.json();

            if (result.success) {
                setSuccessData(result);
                setFormData({ ...formData, isi_narasi: '' });
                fetchHistory();
            } else {
                alert('Gagal: ' + result.error);
            }
        } catch (error) {
            console.error(error);
            alert('Terjadi kesalahan pada sistem jaringan.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                <div className="border-b border-slate-800 pb-4 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold tracking-wider">GENERATOR NASKAH DINAS</h1>
                        <p className="text-sm text-slate-400 mt-1">Sistem Otomatisasi Dokumen & Cloud Sinkronisasi</p>
                    </div>
                    <div className="bg-blue-900/30 text-blue-400 border border-blue-800/50 px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded-sm flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> AI Powered
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    <div className="lg:col-span-2 space-y-6">
                        {successData && (
                            <div className="p-5 border border-emerald-500 bg-emerald-900/20 rounded-sm flex items-start gap-4">
                                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-emerald-400 tracking-widest text-xs uppercase mb-1">Injeksi Cloud Berhasil</h3>
                                    <p className="text-sm text-slate-300 mb-3">Dokumen {templateType} telah dicetak dan diamankan di pangkalan data.</p>
                                    <a href={successData.file_url} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-slate-900 border border-slate-700 px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" /> Buka Arsip
                                    </a>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-sm shadow-2xl">
                            <form onSubmit={handleGenerateDocument} className="space-y-6">

                                {/* DROPDOWN PEMILIHAN TEMPLATE */}
                                <div className="relative">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Jenis Naskah Dinas</label>
                                    <div className="relative">
                                        <select
                                            value={templateType}
                                            onChange={(e) => setTemplateType(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200 appearance-none cursor-pointer"
                                        >
                                            <option value="LHK">Laporan Hasil Kegiatan (LHK)</option>
                                            <option value="SURAT_PERINTAH">Surat Perintah (Sprin)</option>
                                            <option value="NOTA_DINAS">Nota Dinas</option>
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-4 top-3.5 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nomor Surat</label>
                                        <input type="text" name="nomor_surat" value={formData.nomor_surat} onChange={handleInputChange} required
                                            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tanggal</label>
                                        <input type="text" name="tanggal_dokumen" value={formData.tanggal_dokumen} onChange={handleInputChange} required
                                            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Perihal</label>
                                    <input type="text" name="perihal" value={formData.perihal} onChange={handleInputChange} required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200" />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Isi Laporan / Narasi</label>
                                        <button
                                            type="button"
                                            onClick={handleGenerateAI}
                                            disabled={generatingAI || formData.isi_narasi.length === 0}
                                            className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            {generatingAI ? 'AI SEDANG MERAKIT...' : 'RAPIHKAN DENGAN AI'}
                                        </button>
                                    </div>
                                    <textarea name="isi_narasi" value={formData.isi_narasi} onChange={handleInputChange} required rows={6}
                                        placeholder="Ketik poin laporan singkat di sini, lalu klik 'Rapihkan dengan AI'..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-200 resize-none" />
                                </div>

                                <button type="submit" disabled={loading || generatingAI}
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-xs font-bold py-4 rounded-sm tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Memproses Dokumen & Cloud...</> : <><FileText className="w-4 h-4" /> Eksekusi Naskah Dinas</>}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-sm shadow-2xl h-full">
                            <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Audit Trail</h2>
                            </div>

                            {loadingHistory ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
                                </div>
                            ) : history.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-10">Belum ada riwayat dokumen.</p>
                            ) : (
                                <div className="space-y-4">
                                    {history.map((doc) => (
                                        <div key={doc.id} className="group flex flex-col p-3 border border-slate-800 bg-slate-950 hover:border-slate-600 transition-colors rounded-sm">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400">{doc.jenis_naskah}</span>
                                                <span className="text-[9px] text-slate-500">
                                                    {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                            <p className="text-xs font-medium text-slate-300 truncate mb-3" title={doc.title}>
                                                {doc.title.replace('.docx', '')}
                                            </p>
                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                                                className="mt-auto text-[10px] font-bold text-slate-500 group-hover:text-slate-300 uppercase tracking-widest flex items-center gap-1 transition-colors"
                                            >
                                                <File className="w-3 h-3" /> Buka
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}