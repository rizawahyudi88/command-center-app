"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, CheckCircle, ExternalLink, Clock, File, Sparkles, ChevronDown, LogOut, User, Save } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function DocumentGeneratorPage() {
    const router = useRouter();
    const [checkingAuth, setCheckingAuth] = useState(true);

    // STATE BARU: Manajemen Profil Personel
    const [profile, setProfile] = useState<any>(null);
    const [savingProfile, setSavingProfile] = useState(false);

    const [loading, setLoading] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [successData, setSuccessData] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [templateType, setTemplateType] = useState('LHK');

    const [formData, setFormData] = useState({
        nomor_surat: 'B/ND-001/V/OPS/2026',
        tanggal_dokumen: '23 Mei 2026',
        perihal: 'Laporan Situasi Operasional',
        isi_narasi: ''
    });

    // PROTEKSI PERIMETER & AMBIL DATA PROFIL
    useEffect(() => {
        const checkSessionAndProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
            } else {
                // Ambil data profil dari database berdasarkan ID sesi
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profileData) setProfile(profileData);

                setCheckingAuth(false);
                fetchHistory();
            }
        };
        checkSessionAndProfile();
    }, [router]);

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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        document.cookie = "cc_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.push('/login');
    };

    // FUNGSI BARU: Simpan Pembaruan Profil
    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    nama_lengkap: profile.nama_lengkap,
                    pangkat_nrp: profile.pangkat_nrp
                })
                .eq('id', profile.id);

            if (error) throw error;
            alert('Profil berhasil diperbarui!');
        } catch (error: any) {
            alert('Gagal menyimpan profil: ' + error.message);
        } finally {
            setSavingProfile(false);
        }
    };

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
                    template_type: templateType,
                    variables: formData,
                    user_id: profile.id // <-- TAMBAHKAN BARIS INI
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
            alert('Terjadi kesalahan pada sistem jaringan.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* HEADER */}
                <div className="border-b border-slate-800 pb-4 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold tracking-wider">COMMAND CENTER</h1>
                        <p className="text-sm text-slate-400 mt-1">Sistem Otomatisasi Dokumen & Cloud Sinkronisasi</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* BADGE ROLE DARI DATABASE */}
                        {profile && (
                            <div className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-sm text-[10px] font-bold tracking-widest uppercase text-slate-300">
                                Akses: <span className="text-emerald-400">{profile.role}</span>
                            </div>
                        )}
                        <div className="bg-blue-900/30 text-blue-400 border border-blue-800/50 px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded-sm flex items-center gap-2">
                            <Sparkles className="w-3 h-3" /> AI Powered
                        </div>
                        <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 p-1.5 transition-colors" title="Keluar Sistem">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* KOLOM KIRI: FORM GENERATOR */}
                    <div className="lg:col-span-2 space-y-6">
                        {successData && (
                            <div className="p-5 border border-emerald-500 bg-emerald-900/20 rounded-sm flex items-start gap-4">
                                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-emerald-400 tracking-widest text-xs uppercase mb-1">Injeksi Cloud Berhasil</h3>
                                    <p className="text-sm text-slate-300 mb-3">Dokumen {templateType} telah diamankan di pangkalan data.</p>
                                    <a href={successData.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-slate-900 border border-slate-700 px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors">
                                        <ExternalLink className="w-4 h-4" /> Buka Arsip
                                    </a>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-sm shadow-2xl">
                            <form onSubmit={handleGenerateDocument} className="space-y-6">
                                <div className="relative">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Jenis Naskah Dinas</label>
                                    <div className="relative">
                                        <select value={templateType} onChange={(e) => setTemplateType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200 appearance-none cursor-pointer">
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
                                        <input type="text" name="nomor_surat" value={formData.nomor_surat} onChange={handleInputChange} required className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tanggal</label>
                                        <input type="text" name="tanggal_dokumen" value={formData.tanggal_dokumen} onChange={handleInputChange} required className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Perihal</label>
                                    <input type="text" name="perihal" value={formData.perihal} onChange={handleInputChange} required className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200" />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Isi Laporan / Narasi</label>
                                        <button type="button" onClick={handleGenerateAI} disabled={generatingAI || formData.isi_narasi.length === 0} className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                            {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            {generatingAI ? 'AI SEDANG MERAKIT...' : 'RAPIHKAN DENGAN AI'}
                                        </button>
                                    </div>
                                    <textarea name="isi_narasi" value={formData.isi_narasi} onChange={handleInputChange} required rows={6} placeholder="Ketik poin laporan singkat di sini, lalu klik 'Rapihkan dengan AI'..." className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-200 resize-none" />
                                </div>

                                <button type="submit" disabled={loading || generatingAI} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-xs font-bold py-4 rounded-sm tracking-widest uppercase transition-colors flex items-center justify-center gap-2">
                                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Memproses Dokumen & Cloud...</> : <><FileText className="w-4 h-4" /> Eksekusi Naskah Dinas</>}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* KOLOM KANAN: PROFIL & AUDIT TRAIL */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* PANEL PROFIL PERSONEL */}
                        {profile && (
                            <div className="bg-slate-900 border border-slate-800 p-5 rounded-sm shadow-2xl">
                                <div className="flex items-center gap-2 mb-5 border-b border-slate-800 pb-3">
                                    <User className="w-4 h-4 text-slate-400" />
                                    <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Data Personel</h2>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Sesuai Naskah</label>
                                        <input
                                            type="text"
                                            value={profile.nama_lengkap || ''}
                                            onChange={(e) => setProfile({ ...profile, nama_lengkap: e.target.value })}
                                            placeholder="Contoh: Budi Santoso"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Identitas Pangkat/NRP</label>
                                        <input
                                            type="text"
                                            value={profile.pangkat_nrp || ''}
                                            onChange={(e) => setProfile({ ...profile, pangkat_nrp: e.target.value })}
                                            placeholder="Contoh: 88050123"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-200"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={savingProfile}
                                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-2.5 rounded-sm tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
                                    >
                                        {savingProfile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                        Simpan Identitas
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* AUDIT TRAIL */}
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-sm shadow-2xl">
                            <div className="flex items-center gap-2 mb-5 border-b border-slate-800 pb-3">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Audit Trail</h2>
                            </div>
                            {loadingHistory ? (
                                <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-slate-600 animate-spin" /></div>
                            ) : history.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-10">Belum ada riwayat dokumen.</p>
                            ) : (
                                <div className="space-y-4">
                                    {history.map((doc) => (
                                        <div key={doc.id} className="group flex flex-col p-3 border border-slate-800 bg-slate-950 hover:border-slate-600 transition-colors rounded-sm">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400">{doc.jenis_naskah}</span>
                                                <span className="text-[9px] text-slate-500">{new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                            <p className="text-xs font-medium text-slate-300 truncate mb-3" title={doc.title}>{doc.title.replace('.docx', '')}</p>
                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="mt-auto text-[10px] font-bold text-slate-500 group-hover:text-slate-300 uppercase tracking-widest flex items-center gap-1 transition-colors">
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