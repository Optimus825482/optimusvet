import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Validation schema
const createUserSchema = z.object({
  name: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  role: z
    .enum(["ADMIN", "USER"])
    .refine((val) => val === "ADMIN" || val === "USER", {
      message: "Rol ADMIN veya USER olmalıdır",
    }),
});

// GET - Tüm kullanıcıları listele (Sadece ADMIN)
export async function GET(request: NextRequest) {
  try {
    // Auth kontrolü
    const authUser = await requireAuth(request);

    // ADMIN yetkisi kontrolü
    if (authUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 },
      );
    }

    // Tüm kullanıcıları getir
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      users,
      total: users.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
    }
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Kullanıcılar yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// POST - Yeni kullanıcı oluştur (Sadece ADMIN)
export async function POST(request: NextRequest) {
  try {
    // Auth kontrolü
    const authUser = await requireAuth(request);

    // ADMIN yetkisi kontrolü
    if (authUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 },
      );
    }

    // Request body'yi parse et
    const body = await request.json();

    // Validation
    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return NextResponse.json(
        { error: "Validasyon hatası", details: errors },
        { status: 400 },
      );
    }

    const { name, email, password, role } = validationResult.data;

    // Email unique kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu e-posta adresi zaten kullanılıyor" },
        { status: 409 },
      );
    }

    // Şifre hash'leme
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcı oluştur
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Kullanıcı başarıyla oluşturuldu",
        user: newUser,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
    }
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Kullanıcı oluşturulurken hata oluştu" },
      { status: 500 },
    );
  }
}
