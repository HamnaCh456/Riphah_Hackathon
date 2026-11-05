import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requiredRole } from "@/lib/auth/access";

const SIGNED_OUT_ONLY = ["/auth/login", "/auth/sign-up"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Don't keep this client in a global. Create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Keep this call right after createServerClient, or sessions can drop at random.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const { pathname } = request.nextUrl;

  // Redirects must carry refreshed session cookies or the browser falls out of sync.
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  if (!userId) {
    const isPublic = pathname === "/" || pathname.startsWith("/auth");
    return isPublic ? supabaseResponse : redirectTo("/auth/login");
  }

  if (SIGNED_OUT_ONLY.includes(pathname)) return redirectTo("/");

  const needed = requiredRole(pathname);
  if (needed) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.role !== needed) return redirectTo("/forbidden");
  }

  return supabaseResponse;
}
