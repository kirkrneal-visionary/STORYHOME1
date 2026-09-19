import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sessionWasForcedOut } from "@/lib/account/require-session-live";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";
import { logSecurityEvent } from "@/lib/security/log-event";
import { originAllowed, shouldCheckOrigin } from "@/lib/security/origin";
import {
  USERNAME_AVAILABILITY_OBSERVE,
  classifyRequestPath,
  clientIp,
  consumeRateLimit,
  observeRateLimit,
  rateLimitKey,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import {
  classifyCadPublicPath,
  consumeCadAccess,
} from "@/lib/cad/public-access";
import { inspectUsername } from "@/lib/account/username";

const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/**
 * Session refresh + app rate classes + Story Pro page session gate.
 * Tile routes are not rate-limited here.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/u/")) {
    const raw = decodeURIComponent(pathname.slice(3).split("/")[0] ?? "");
    const inspected = inspectUsername(raw);
    if (
      inspected.status === "ok" &&
      inspected.normalized &&
      raw !== inspected.normalized
    ) {
      const next = request.nextUrl.clone();
      next.pathname = `/u/${inspected.normalized}`;
      return NextResponse.redirect(next, 308);
    }
  }
  if (pathname.endsWith(".map")) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "cache-control": "no-store" },
    });
  }
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

  const cadLane = classifyCadPublicPath(pathname);
  if (cadLane) {
    const cadHit = consumeCadAccess({ lane: cadLane, ip });
    if (!cadHit.ok) {
      logSecurityEvent({
        kind: "rate_limited",
        path: pathname,
        status: 429,
        ip,
        subject: `cad:${cadLane}:${cadHit.windowId}`,
      });
      return tooManyRequests(cadHit.retryAfterSec);
    }
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
    if (cost === "username_availability") {
      const observed = observeRateLimit(
        `observe:username_availability:${ip}`,
        USERNAME_AVAILABILITY_OBSERVE,
      );
      if (!observed.ok) {
        logSecurityEvent({
          kind: "rate_limited",
          path: pathname,
          status: 200,
          ip,
          subject: "username_availability_observe",
        });
      }
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

  let signedIn = Boolean(user);
  if (signedIn && (await sessionWasForcedOut(supabase))) {
    await supabase.auth.signOut({ scope: "local" });
    signedIn = false;
  }

  const gated =
    pathname.startsWith("/portal") ||
    pathname.startsWith("/office") ||
    pathname.startsWith("/settings");

  if (gated && !signedIn) {
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

  if (gated && signedIn && user && !user.email_confirmed_at) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("pending", "email");
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
    "/:path*.map",
  ],
};
