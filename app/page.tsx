import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-obsidian text-slate-50 font-swiss">
      <div className="w-full max-w-md p-10 bg-obsidian-light border border-obsidian-border shadow-2xl rounded-sm">

        {/* Header Section */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-14 h-14 bg-blue-600/10 border border-blue-500/30 rounded-full flex items-center justify-center mb-5">
            <ShieldCheck className="w-7 h-7 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-editorial mb-1">COMMAND CENTER</h1>
          <p className="text-xs text-slate-400 tracking-widest uppercase">Otentikasi Terpusat</p>
        </div>

        {/* Form Section */}
        <form className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Nomor Registrasi (NRP/NIP)
            </label>
            <input
              type="text"
              className="w-full bg-obsidian border border-obsidian-border rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-200 placeholder-slate-700"
              placeholder="Masukkan NRP / NIP"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Kata Sandi (Password)
            </label>
            <input
              type="password"
              className="w-full bg-obsidian border border-obsidian-border rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-200 placeholder-slate-700"
              placeholder="••••••••"
            />
          </div>

          <button
            type="button"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-4 rounded-sm tracking-widest uppercase transition-colors mt-4"
          >
            Otentikasi Masuk
          </button>
        </form>

      </div>
    </div>
  );
}