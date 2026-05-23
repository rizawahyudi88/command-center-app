"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, ShieldAlert } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setErrorMsg(error.message === 'Invalid login credentials'
                    ? 'Kredensial salah. Periksa kembali email dan password Anda.'
                    : error.message
                );
            } else if (data?.session) {

                // --- TAMBAHKAN BARIS INI UNTUK MIDDLEWARE ---
                document.cookie = "cc_session=active; path=/; max-age=86400; secure; samesite=strict";
                // Login sukses, arahkan langsung ke cockpit dashboard
                router.push('/dashboard');
                router.refresh();
            }
        } catch (err) {
            setErrorMsg('Terjadi gangguan koneksi ke server autentikasi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-sm shadow-2xl space-y-6">

                {/* BRANDING */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-sm bg-blue-900/30 border border-blue-800/50 text-blue-400 mb-2">
                        <Lock className="w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold tracking-wider uppercase">COMMAND CENTER</h1>
                    <p className="text-xs text-slate-400">Sistem Otomatisasi Dokumen & Perimeter Aman</p>
                </div>

                {errorMsg && (
                    <div className="p-4 border border-red-500 bg-red-900/20 rounded-sm flex items-center gap-3 text-sm text-red-400">
                        <ShieldAlert className="w-5 h-5 shrink-0" />
                        <p>{errorMsg}</p>
                    </div>
                )}

                {/* FORM */}
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email Operasional</label>
                        <div className="relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="nama@instansi.gov"
                                className="w-full bg-slate-950 border border-slate-800 rounded-sm pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
                            />
                            <Mail className="w-4 h-4 text-slate-600 absolute left-3 top-3.5" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Kata Sandi (Password)</label>
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full bg-slate-950 border border-slate-800 rounded-sm pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
                            />
                            <Lock className="w-4 h-4 text-slate-600 absolute left-3 top-3.5" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-xs font-bold py-4 rounded-sm tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Otorisasi...</> : 'Masuk ke Sistem'}
                    </button>
                </form>

            </div>
        </div>
    );
}