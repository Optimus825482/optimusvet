"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
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

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);

    try {
      // Use NextAuth signIn function - handles CSRF automatically
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false, // Don't redirect automatically
      });

      if (result?.error) {
        toast({
          variant: "destructive",
          title: "Giriş başarısız",
          description: "E-posta veya şifre hatalı",
        });
        return;
      }

      if (result?.ok) {
        toast({
          title: "Hoş geldiniz!",
          description: "Giriş başarılı, yönlendiriliyorsunuz...",
        });

        // Redirect to dashboard
        router.push("/dashboard");
        router.refresh(); // Refresh to update session
      }
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

            <div className="space-y-2">
              <Label htmlFor="password" required>
                Şifre
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                icon={<Lock className="w-4 h-4" />}
                {...register("password")}
                error={errors.password?.message}
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
              disabled={loading}
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
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
