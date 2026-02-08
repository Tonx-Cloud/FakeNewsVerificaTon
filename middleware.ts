import { createSupabaseMiddleware } from './lib/supabaseMiddleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddleware(request)

  // Refresh session if expired — required for Server Components
  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled by their own route handlers)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
