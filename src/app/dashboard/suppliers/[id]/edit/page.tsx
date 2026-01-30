"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { ArrowLeft, Building2, Phone, Mail, MapPin, FileText, Save, Loader2 } from "lucide-react"
import { useEffect } from "react"

const supplierSchema = z.object({
    name: z.string().min(1, "Firma adı zorunlu"),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Geçersiz e-posta").or(z.literal("")).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    taxNumber: z.string().optional(),
    taxOffice: z.string().optional(),
    notes: z.string().optional(),
})

type SupplierFormData = z.infer<typeof supplierSchema>

interface Supplier {
    id: string
    code: string
    name: string
    contactPerson: string | null
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    taxNumber: string | null
    taxOffice: string | null
    balance: number
    notes: string | null
}

export default function EditSupplierPage() {
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()

    const { data: supplier, isLoading } = useQuery<Supplier>({
        queryKey: ["supplier", params.id],
        queryFn: async () => {
            const res = await fetch(`/api/suppliers/${params.id}`)
            if (!res.ok) throw new Error("Tedarikçi bulunamadı")
            return res.json()
        },
    })

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<SupplierFormData>({
        resolver: zodResolver(supplierSchema),
    })

    useEffect(() => {
        if (supplier) {
            reset({
                name: supplier.name,
                contactPerson: supplier.contactPerson || "",
                phone: supplier.phone || "",
                email: supplier.email || "",
                address: supplier.address || "",
                city: supplier.city || "",
                taxNumber: supplier.taxNumber || "",
                taxOffice: supplier.taxOffice || "",
                notes: supplier.notes || "",
            })
        }
    }, [supplier, reset])

    const updateMutation = useMutation({
        mutationFn: async (data: SupplierFormData) => {
            const res = await fetch(`/api/suppliers/${params.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            if (!res.ok) throw new Error("Güncellenemedi")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["supplier", params.id] })
            queryClient.invalidateQueries({ queryKey: ["suppliers"] })
            router.push(`/dashboard/suppliers/${params.id}`)
        },
    })

    const onSubmit = (data: SupplierFormData) => {
        updateMutation.mutate(data)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
            </div>
        )
    }

    if (!supplier) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Tedarikçi bulunamadı</p>
                <Link href="/dashboard/suppliers" className="text-violet-500 hover:underline mt-4 inline-block">
                    Tedarikçiler'e Dön
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href={`/dashboard/suppliers/${supplier.id}`}
                    className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">Tedarikçi Düzenle</h1>
                    <p className="text-zinc-400 text-sm">{supplier.code} - {supplier.name}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Firm Info */}
                <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-violet-500" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Firma Bilgileri</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Firma Adı <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...register("name")}
                                type="text"
                                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                placeholder="Firma adı"
                            />
                            {errors.name && (
                                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Yetkili Kişi
                            </label>
                            <input
                                {...register("contactPerson")}
                                type="text"
                                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                placeholder="Yetkili kişi"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                <Phone className="w-4 h-4 inline mr-1" /> Telefon
                            </label>
                            <input
                                {...register("phone")}
                                type="tel"
                                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                placeholder="0555 555 55 55"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                <Mail className="w-4 h-4 inline mr-1" /> E-posta
                            </label>
                            <input
                                {...register("email")}
                                type="email"
                                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                placeholder="info@firma.com"
                            />
                            {errors.email && (
                                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-emerald-500" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Adres Bilgileri</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Adres
                            </label>
                            <textarea
                                {...register("address")}
                                rows={2}
                                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
                                placeholder="Adres"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Şehir
                            </label>
                            <input
                                {...register("city")}
                                type="text"
                                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                placeholder="İstanbul"
                            />
                        </div>
                    </div>
                </div>

                {/* Tax Info */}
                <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-500" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Vergi Bilgileri</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Vergi No / T.C. Kimlik
                            </label>
                            <input
                                {...register("taxNumber")}
                                type="text"
                                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-mono"
                                placeholder="1234567890"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Vergi Dairesi
                            </label>
                            <input
                                {...register("taxOffice")}
                                type="text"
                                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                placeholder="Kadıköy V.D."
                            />
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Notlar</h2>
                    <textarea
                        {...register("notes")}
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
                        placeholder="Tedarikçi hakkında notlar..."
                    />
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                    <Link
                        href={`/dashboard/suppliers/${supplier.id}`}
                        className="flex-1 px-6 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors text-center"
                    >
                        İptal
                    </Link>
                    <button
                        type="submit"
                        disabled={updateMutation.isPending || !isDirty}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Kaydediliyor...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                <span>Kaydet</span>
                            </>
                        )}
                    </button>
                </div>

                {updateMutation.isError && (
                    <p className="text-red-500 text-center">Bir hata oluştu, lütfen tekrar deneyin.</p>
                )}
            </form>

            {/* Footer */}
            <div className="text-center text-xs text-zinc-600 pt-4">
                © 2026 Optimus Vet. Tüm hakları saklıdır.
            </div>
        </div>
    )
}
