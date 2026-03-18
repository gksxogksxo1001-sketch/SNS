import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This is a simplified middleware. Real production would check Firebase Session Cookies.
// For now, we lean on client-side protection or simple cookie checks.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  
  // Logic would go here once session cookies are implemented
  // For now, we let client-side hooks handle the redirect to simplify initial dev
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
