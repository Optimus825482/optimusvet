"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { ArrowLeft, Save, Loader2, Building2, Phone, Mail, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const supplierSchema = z.object({
    name: z.string().min(2, "Tedarikçi adı en az 2 karakter olmalı"),
    phone: z.string().optional(),
    email: z.string().email("Geçerli e-posta giriniz").optional().or(z.literal("")),
    address: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    taxOffice: z.string().optional(),
    taxId: z.string().optional(),
    contactPerson: z.string().optional(),
    notes: z.string().optional(),
    openingBalance: z.string().optional(),
})

type SupplierFormData = z.infer<typeof supplierSchema>

export default function NewSupplierPage() {
    const router = useRouter()
    const queryClient = useQueryClient()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SupplierFormData>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            openingBalance: "0",
        },
    })

    const createMutation = useMutation({
        mutationFn: async (data: SupplierFormData) => {
            const payload = {
                ...data,
                openingBalance: data.openingBalance ? parseFloat(data.openingBalance) : 0,
            }

            const res = await fetch("/api/suppliers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Tedarikçi oluşturulamadı")
            }

            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] })
            router.push("/dashboard/suppliers")
        },
    })

    const onSubmit = (data: SupplierFormData) => {
        createMutation.mutate(data)
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/suppliers">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Yeni Tedarikçi</h1>
                    <p className="text-sm text-slate-500">Yeni tedarikçi kaydı oluşturun</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-emerald-600" />
                            Firma Bilgileri
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Firma Adı *
                            </label>
                            <Input {...register("name")} placeholder="Firma / Tedarikçi Adı" />
                            {errors.name && (
                                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Yetkili Kişi
                            </label>
                            <Input {...register("contactPerson")} placeholder="İletişim kurulacak kişi" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    <Phone className="h-4 w-4 inline mr-1" />
                                    Telefon
                                </label>
                                <Input {...register("phone")} placeholder="0555 123 45 67" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    <Mail className="h-4 w-4 inline mr-1" />
                                    E-posta
                                </label>
                                <Input {...register("email")} type="email" placeholder="info@firma.com" />
                                {errors.email && (
                                    <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Address */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-emerald-600" />
                            Adres Bilgileri
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
                            <Input {...register("address")} placeholder="Sokak, Mahalle, No" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">İlçe</label>
                                <Input {...register("district")} placeholder="İlçe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">İl</label>
                                <Input {...register("city")} placeholder="İl" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tax Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Vergi Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Vergi Dairesi
                                </label>
                                <Input {...register("taxOffice")} placeholder="Vergi Dairesi" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Vergi No
                                </label>
                                <Input {...register("taxId")} placeholder="VKN" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Financial */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Finansal Bilgiler</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Açılış Bakiyesi (₺)
                            </label>
                            <Input
                                {...register("openingBalance")}
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Pozitif: Borcunuz (Alınacak) • Negatif: Alacağınız (Verilecek)
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Notlar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <textarea
                            {...register("notes")}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                            rows={3}
                            placeholder="Tedarikçi hakkında notlar..."
                        />
                    </CardContent>
                </Card>

                {/* Error Message */}
                {createMutation.isError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                        {createMutation.error.message}
                    </div>
                )}

                {/* Submit Buttons */}
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => router.back()}
                    >
                        İptal
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={createMutation.isPending}
                    >
                        {createMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Kaydediliyor...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Kaydet
                            </>
                        )}
                    </Button>
                </div>
            </form>

            {/* Footer */}
            <footer className="text-center py-4 text-sm text-slate-500 border-t">
                © {new Date().getFullYear()} Optimus Vet. Tüm hakları saklıdır.
            </footer>
        </div>
    )
}
