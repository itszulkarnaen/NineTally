import { NextResponse } from "next/server";
import { verifyCredentials, createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const isValid = await verifyCredentials(email, password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Email atau password salah." },
        { status: 401 }
      );
    }

    const token = await createSessionToken(email);

    const response = NextResponse.json({
      success: true,
      message: "Login berhasil",
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server saat login." },
      { status: 500 }
    );
  }
}
