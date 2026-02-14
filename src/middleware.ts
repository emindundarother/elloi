import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "elloi_session";

const publicPaths = ["/login"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (
        publicPaths.some((p) => pathname.startsWith(p)) ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/images") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!token) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
