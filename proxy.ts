import { createRateLimiter } from "@/lib/rate-limit";
import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";

// Form submissions, uploads and AI actions all arrive as POST. Normal use stays well under this.
const isAllowed = createRateLimiter(120);

export async function proxy(request: NextRequest) {
  if (request.method === "POST") {
    const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (!isAllowed(client ?? "unknown")) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
