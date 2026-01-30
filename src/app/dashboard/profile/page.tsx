"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  Mail,
  Shield,
  Camera,
  Save,
  Lock,
  BadgeCheck,
  Building,
  Phone,
  ArrowLeft,
  Zap,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    // Burada yükleme mantığı (S3/Cloudinary/API vb.) gerçeklenebilir.
    // Şimdilik simüle ediyoruz.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setUploading(false);

    toast({
      variant: "success",
      title: "Resim Yüklendi",
      description: "Profil resminiz başarıyla güncellendi.",
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="rounded-full h-8 w-8 text-slate-400"
            >
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              HESAP YÖNETİMİ
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter">
            Profil <span className="text-primary italic">Bilgileri</span>
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">
            KİŞİSEL VERİLERİNİ VE GÜVENLİK AYARLARINI YÖNET
          </p>
        </div>
        <Button className="rounded-2xl h-12 px-6 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
          <Save className="w-4 h-4 mr-2" />
          DEĞİŞİKLİKLERİ KAYDET
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Avatar & Quick Info */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="rounded-[3rem] border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent -z-1" />
            <CardContent className="p-8 pt-12 flex flex-col items-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center text-primary font-black text-4xl shadow-primary/10">
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    session?.user?.name?.[0]?.toUpperCase() || "U"
                  )}
                </div>
                <Button
                  size="icon"
                  className="absolute -bottom-2 -right-2 rounded-2xl w-10 h-10 bg-white border border-slate-100 shadow-xl text-slate-600 hover:text-primary hover:bg-slate-50 cursor-pointer"
                  onClick={() =>
                    document.getElementById("avatar-upload")?.click()
                  }
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </Button>
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>

              <div className="text-center">
                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">
                  {session?.user?.name || "Kullanıcı"}
                </h3>
                <Badge
                  variant="outline"
                  className="rounded-lg border-primary/20 text-primary font-black uppercase text-[9px] tracking-widest px-3 h-6 mb-4"
                >
                  {session?.user?.role || "ADMIN"}
                </Badge>

                <div className="flex flex-col gap-2 w-full mt-4">
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 truncate">
                      {session?.user?.email}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Forms */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[3rem] border-slate-100 shadow-xl shadow-slate-200/40">
            <CardHeader className="pb-4 pt-10 px-10">
              <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
                Kişisel Bilgiler
              </CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                TEMEL HESAP VERİLERİNİ GÜNCELLE
              </CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    ADINIZ SOYADINIZ
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Ad Soyad"
                      defaultValue={session?.user?.name || ""}
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-primary transition-all font-bold text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    E-POSTA ADRESİ
                  </label>
                  <div className="relative opacity-60">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      disabled
                      placeholder="Email"
                      defaultValue={session?.user?.email || ""}
                      className="pl-12 h-14 rounded-2xl bg-slate-100 border-transparent font-bold text-sm cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    TELEFON NO
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="05XX XXX XX XX"
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-primary transition-all font-bold text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    KLİNİK ADI / ŞUBE
                  </label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Klinik Adı"
                      defaultValue="Optimus Ana Şube"
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-primary transition-all font-bold text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[3rem] border-slate-100 shadow-xl shadow-slate-200/40">
            <CardHeader className="pb-4 pt-10 px-10">
              <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
                Güvenlik & Şifre
              </CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest text-rose-500/60">
                HESAP ERİŞİM AYARLARINI YÖNET
              </CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-rose-500/80">
                    MEVCUT ŞİFRE
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pl-12 h-14 rounded-2xl bg-rose-50/20 border-transparent focus:bg-white focus:border-rose-200 transition-all font-bold text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    YENİ ŞİFRE
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Min 8 Karakter"
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-primary transition-all font-bold text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-8 p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">
                      İki Faktörlü Doğrulama
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                      HESAP GÜVENLİĞİNİ ARTIRIN
                    </p>
                  </div>
                </div>
                <Badge className="rounded-xl px-4 py-1.5 bg-slate-200 text-slate-500 border-none font-black text-[9px] uppercase tracking-widest">
                  AKTİF DEĞİL
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
