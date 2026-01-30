import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Tüm ayarları getir
export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.setting.findMany();

    // Key-value object'e dönüştür
    const settingsObj = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    return NextResponse.json(settingsObj, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Ayarlar yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// POST - Ayarları güncelle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Settings POST - Received data:", Object.keys(body));

    // Her ayarı upsert et
    const promises = Object.entries(body).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      }),
    );

    await Promise.all(promises);

    console.log(
      "Settings POST - Successfully saved",
      promises.length,
      "settings",
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings POST error:", error);
    return NextResponse.json(
      {
        error: "Ayarlar kaydedilirken hata oluştu",
        details: String(error),
      },
      { status: 500 },
    );
  }
}
