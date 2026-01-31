import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

// POST - Şifre değiştir
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Mevcut şifre ve yeni şifre gerekli" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Yeni şifre en az 6 karakter olmalıdır" },
        { status: 400 },
      );
    }

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı veya şifre ayarlanmamış" },
        { status: 404 },
      );
    }

    // Mevcut şifreyi kontrol et
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Mevcut şifre hatalı" },
        { status: 400 },
      );
    }

    // Yeni şifreyi hashle
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Şifreyi güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: "Şifre başarıyla değiştirildi",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
    }
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Şifre değiştirilemedi" },
      { status: 500 },
    );
  }
}
