"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema, type RegisterInput } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PawPrint, Mail, Lock, User } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function RegisterPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
    })

    const onSubmit = async (data: RegisterInput) => {
        setLoading(true)
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            const result = await response.json()

            if (!response.ok) {
                toast({
                    variant: "destructive",
                    title: "Kayıt başarısız",
                    description: result.error,
                })
                return
            }

            toast({
                variant: "success",
                title: "Kayıt başarılı!",
                description: "Hesabınız oluşturuldu. Giriş yapabilirsiniz.",
            })
            router.push("/auth/login")
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Bir hata oluştu. Lütfen tekrar deneyin.",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-violet-50 dark:from-slate-900 dark:to-slate-800 p-4">
            <Card variant="elevated" className="w-full max-w-md animate-slideUp border-slate-200">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-200">
                            <PawPrint className="w-9 h-9 text-white" />
                        </div>
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-slate-900">Kayıt Ol</CardTitle>
                        <CardDescription className="text-slate-500">Yeni hesap oluşturun</CardDescription>
                    </div>
                </CardHeader>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" required>Ad Soyad</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Adınız Soyadınız"
                                icon={<User className="w-4 h-4" />}
                                error={errors.name?.message}
                                {...register("name")}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" required>E-posta</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="ornek@email.com"
                                icon={<Mail className="w-4 h-4" />}
                                error={errors.email?.message}
                                {...register("email")}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" required>Şifre</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                icon={<Lock className="w-4 h-4" />}
                                error={errors.password?.message}
                                {...register("password")}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" required>Şifre Tekrar</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                icon={<Lock className="w-4 h-4" />}
                                error={errors.confirmPassword?.message}
                                {...register("confirmPassword")}
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex-col gap-4">
                        <Button type="submit" className="w-full" size="lg" loading={loading}>
                            Kayıt Ol
                        </Button>

                        <p className="text-sm text-muted-foreground text-center">
                            Zaten hesabınız var mı?{" "}
                            <Link href="/auth/login" className="text-primary font-medium hover:underline">
                                Giriş yapın
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
    )
}
