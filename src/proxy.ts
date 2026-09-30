import { NextRequest, NextResponse } from "next/server";
import { adminSessionToken } from "@/lib/admin-token";

const COOKIE_NAME = "admin_session";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = await adminSessionToken();
  const cookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!token || cookie !== token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
