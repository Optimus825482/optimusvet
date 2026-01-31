import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Validation schema for update
const updateUserSchema = z.object({
  name: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır").optional(),
  email: z.string().email("Geçerli bir e-posta adresi giriniz").optional(),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır").optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  active: z.boolean().optional(),
});

// PATCH - Kullanıcı güncelle (Sadece ADMIN)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id: userId } = await params;

    // Kullanıcı var mı kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 },
      );
    }

    // Kendi hesabını pasif yapamaz
    if (userId === authUser.id) {
      const body = await request.json();
      if (body.active === false) {
        return NextResponse.json(
          { error: "Kendi hesabınızı pasif yapamazsınız" },
          { status: 400 },
        );
      }
    }

    // Request body'yi parse et
    const body = await request.json();

    // Validation
    const validationResult = updateUserSchema.safeParse(body);
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

    const { name, email, password, role, active } = validationResult.data;

    // Email değişiyorsa unique kontrolü
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Bu e-posta adresi zaten kullanılıyor" },
          { status: 409 },
        );
      }
    }

    // Update data hazırla
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (active !== undefined) updateData.active = active;

    // Şifre değişiyorsa hash'le
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Kullanıcıyı güncelle
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Kullanıcı başarıyla güncellendi",
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
    }
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Kullanıcı güncellenirken hata oluştu" },
      { status: 500 },
    );
  }
}
