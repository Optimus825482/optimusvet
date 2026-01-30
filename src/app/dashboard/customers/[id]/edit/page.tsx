"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const customerSchema = z.object({
    name: z.string().min(2, "Ad soyad en az 2 karakter olmalı"),
    phone: z.string().optional(),
    email: z.string().email("Geçerli e-posta giriniz").optional().or(z.literal("")),
    address: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    taxOffice: z.string().optional(),
    taxId: z.string().optional(),
    notes: z.string().optional(),
})

type CustomerFormData = z.infer<typeof customerSchema>

export default function CustomerEditPage() {
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const customerId = params.id as string

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema),
    })

    // Fetch customer
    const { data: customer, isLoading } = useQuery({
        queryKey: ["customer", customerId],
        queryFn: async () => {
            const res = await fetch(`/api/customers/${customerId}`)
            if (!res.ok) throw new Error("Müşteri bulunamadı")
            return res.json()
        },
    })

    // Populate form when data loads
    useEffect(() => {
        if (customer) {
            reset({
                name: customer.name || "",
                phone: customer.phone || "",
                email: customer.email || "",
                address: customer.address || "",
                city: customer.city || "",
                district: customer.district || "",
                taxOffice: customer.taxOffice || "",
                taxId: customer.taxId || "",
                notes: customer.notes || "",
            })
        }
    }, [customer, reset])

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (data: CustomerFormData) => {
            const res = await fetch(`/api/customers/${customerId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Güncelleme başarısız")
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customers"] })
            queryClient.invalidateQueries({ queryKey: ["customer", customerId] })
            router.push(`/dashboard/customers/${customerId}`)
        },
    })

    const onSubmit = (data: CustomerFormData) => {
        updateMutation.mutate(data)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
        )
    }

    if (!customer) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-slate-500">Müşteri bulunamadı</p>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/customers">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Müşterilere Dön
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/customers/${customerId}`}>
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Müşteri Düzenle</h1>
                    <p className="text-sm text-slate-500">{customer.name}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Kişisel Bilgiler</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Ad Soyad *
                            </label>
                            <Input {...register("name")} placeholder="Ad Soyad" />
                            {errors.name && (
                                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Telefon
                                </label>
                                <Input {...register("phone")} placeholder="0555 123 45 67" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    E-posta
                                </label>
                                <Input {...register("email")} type="email" placeholder="ornek@email.com" />
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
                        <CardTitle className="text-lg">Adres Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Adres
                            </label>
                            <Input {...register("address")} placeholder="Sokak, Mahalle, No" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    İlçe
                                </label>
                                <Input {...register("district")} placeholder="İlçe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    İl
                                </label>
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
                                    Vergi No / TC
                                </label>
                                <Input {...register("taxId")} placeholder="VKN / TC Kimlik No" />
                            </div>
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
                            placeholder="Müşteri hakkında notlar..."
                        />
                    </CardContent>
                </Card>

                {/* Error Message */}
                {updateMutation.isError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                        {updateMutation.error.message}
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
                        disabled={updateMutation.isPending}
                    >
                        {updateMutation.isPending ? (
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
