"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PawPrint, Mail, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);

    try {
      // TODO: Implement password reset email functionality
      // For now, just show a success message
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setEmailSent(true);
      toast({
        title: "E-posta gönderildi",
        description:
          "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bir hata oluştu. Lütfen tekrar deneyin.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-violet-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card
        variant="elevated"
        className="w-full max-w-md animate-slideUp border-slate-200"
        suppressHydrationWarning
      >
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-200">
              <PawPrint className="w-9 h-9 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Şifremi Unuttum
            </CardTitle>
            <CardDescription className="text-slate-500">
              {emailSent
                ? "E-posta adresinizi kontrol edin"
                : "E-posta adresinizi girin"}
            </CardDescription>
          </div>
        </CardHeader>

        {emailSent ? (
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen
                gelen kutunuzu kontrol edin.
              </p>
              <p className="text-xs text-muted-foreground">
                E-posta gelmedi mi? Spam klasörünü kontrol edin.
              </p>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" required>
                  E-posta
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  autoComplete="email"
                  icon={<Mail className="w-4 h-4" />}
                  {...register("email")}
                  error={errors.email?.message}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Kayıtlı e-posta adresinize şifre sıfırlama bağlantısı
                göndereceğiz.
              </p>
            </CardContent>

            <CardFooter className="flex-col gap-4">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
              </Button>
            </CardFooter>
          </form>
        )}

        <div className="pb-4 px-6">
          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Giriş sayfasına dön
          </Link>
        </div>

        <div className="pb-4 text-center">
          <p className="text-[10px] text-muted-foreground">
            © 2026 Optimus Vet. Tüm hakları saklıdır.
          </p>
        </div>
      </Card>
    </div>
  );
}
