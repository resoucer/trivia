import { type NextRequest, NextResponse } from "next/server";
import { VISITOR_COOKIE, visitorCookieOptions } from "@/infra/auth/cookies";
import { newVisitorId } from "@/infra/random";

// `config` is exported inline below: Next.js only recognizes `export const config` (not re-exports).
export { proxy };

/**
 * Runs before trivia pages are rendered. Matcher values must be literals for Next's static analysis,
 * so the cookie name is repeated here (it must equal VISITOR_COOKIE).
 */
export const config = {
  matcher: [{ source: "/t/:path*", missing: [{ type: "cookie", key: "trivia_visitor" }] }],
};

/**
 * Gives every browser that opens a trivia a visitor cookie before it plays, so its first play is
 * already counted under the cookie instead of the network hash (which would double count the next play).
 */
function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  if (request.cookies.has(VISITOR_COOKIE)) return response;
  response.cookies.set(VISITOR_COOKIE, newVisitorId().value, visitorCookieOptions);
  return response;
}
