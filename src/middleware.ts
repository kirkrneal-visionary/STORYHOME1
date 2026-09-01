import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";
import { logSecurityEvent } from "@/lib/security/log-event";
import { originAllowed, shouldCheckOrigin } from "@/lib/security/origin";
import {
  classifyRequestPath,
  clientIp,
  consumeRateLimit,
  rateLimitKey,
  tooManyRequests,
} from "@/lib/security/rate-limit";

const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/**
 * Session refresh + app rate classes + Story Pro page session gate.
 * Tile routes are not rate-limited here.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ip = clientIp(request.headers);

  if (shouldCheckOrigin(pathname, request.method) && !originAllowed(request)) {
    logSecurityEvent({
      kind: "origin_rejected",
      path: pathname,
      status: 403,
      ip,
    });
    return new NextResponse(
      JSON.stringify({ error: "Request origin is not allowed" }),
      {
        status: 403,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      },
    );
  }

  const cost = classifyRequestPath(pathname);
  if (cost) {
    const hit = consumeRateLimit(rateLimitKey(cost, ip), cost);
    if (!hit.ok) {
      logSecurityEvent({
        kind: "rate_limited",
        path: pathname,
        status: 429,
        ip,
      });
      return tooManyRequests(hit.retryAfterSec);
    }
  }

  const response = NextResponse.next({ request });
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/portal") && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((c) => {
      redirect.cookies.set(c);
    });
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
