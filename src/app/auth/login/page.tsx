"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations";
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
import { PawPrint, Mail, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission
    e.stopPropagation();
    
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      // Validate
      const validatedData = loginSchema.parse({ email, password });

      // POST request ile güvenli login - URL'de görünmez
      const response = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: validatedData.email,
          password: validatedData.password,
          callbackUrl: "/dashboard",
        }),
      });

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Giriş başarısız",
          description: "E-posta veya şifre hatalı",
        });
        return;
      }

      toast({
        title: "Hoş geldiniz!",
        description: "Giriş başarılı, yönlendiriliyorsunuz...",
      });
      
      // Session'ı yenile ve dashboard'a yönlendir
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Login error:", error);
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
              OPTIMUS VET
            </CardTitle>
            <CardDescription className="text-slate-500">
              Veteriner Ön Muhasebe Sistemi
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={onSubmit} method="POST">
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" required>
                E-posta
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ornek@email.com"
                autoComplete="email"
                icon={<Mail className="w-4 h-4" />}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" required>
                Şifre
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                icon={<Lock className="w-4 h-4" />}
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-input" />
                <span className="text-muted-foreground">Beni hatırla</span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-primary hover:underline"
              >
                Şifremi unuttum
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              disabled={loading}
            >
              Giriş Yap
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Hesabınız yok mu?{" "}
              <Link
                href="/auth/register"
                className="text-primary font-medium hover:underline"
              >
                Kayıt olun
              </Link>
            </p>
          </CardFooter>
        </form>

        <div className="pb-4 text-center">
          <p className="text-[10px] text-muted-foreground">
            © 2026 Optimus Vet. Tüm hakları saklıdır.
          </p>
        </div>
      </Card>
    </div>
  );
}