import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    // 1. Periksa apakah browser membawa tanda pengenal (cookie) sesi
    const session = request.cookies.get('cc_session');

    // 2. Jika ada orang asing mencoba masuk ke /dashboard tanpa tiket, blokir dan lempar ke /login
    if (request.nextUrl.pathname.startsWith('/dashboard') && !session) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 3. Jika Anda sudah login tapi tidak sengaja membuka halaman /login, langsung arahkan ke kokpit
    if (request.nextUrl.pathname === '/login' && session) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 4. Loloskan jika memenuhi syarat
    return NextResponse.next();
}

// Tentukan rute mana saja yang harus dijaga oleh satpam ini
export const config = {
    matcher: ['/dashboard/:path*', '/login'],
};