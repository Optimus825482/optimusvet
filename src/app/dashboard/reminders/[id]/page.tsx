"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
    ArrowLeft,
    Pencil,
    Trash2,
    Bell,
    Syringe,
    Stethoscope,
    Calendar,
    CheckCircle2,
    Clock,
    XCircle,
    Dog,
    Cat,
    Bird,
    PawPrint,
    User,
    Phone,
} from "lucide-react"
import { useState } from "react"

interface Reminder {
    id: string
    title: string
    description: string | null
    type: string
    dueDate: string
    status: string
    completedAt: string | null
    customer: {
        id: string
        name: string
        phone: string | null
    } | null
    animal: {
        id: string
        name: string
        species: string
    } | null
}

export default function ReminderDetailPage() {
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const { data: reminder, isLoading } = useQuery<Reminder>({
        queryKey: ["reminder", params.id],
        queryFn: async () => {
            const res = await fetch(`/api/reminders/${params.id}`)
            if (!res.ok) throw new Error("Hatırlatma bulunamadı")
            return res.json()
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/reminders/${params.id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Silinemedi")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reminders"] })
            router.push("/dashboard/reminders")
        },
    })

    const statusMutation = useMutation({
        mutationFn: async (status: string) => {
            const res = await fetch(`/api/reminders/${params.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            })
            if (!res.ok) throw new Error("Güncellenemedi")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reminder", params.id] })
            queryClient.invalidateQueries({ queryKey: ["reminders"] })
        },
    })

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "VACCINATION":
                return <Syringe className="w-5 h-5" />
            case "CHECKUP":
                return <Stethoscope className="w-5 h-5" />
            case "PROTOCOL":
                return <Calendar className="w-5 h-5" />
            default:
                return <Bell className="w-5 h-5" />
        }
    }

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            VACCINATION: "Aşı Hatırlatması",
            CHECKUP: "Muayene Hatırlatması",
            PROTOCOL: "Protokol Hatırlatması",
            PAYMENT: "Ödeme Hatırlatması",
            GENERAL: "Genel Hatırlatma",
        }
        return labels[type] || type
    }

    const getSpeciesIcon = (species: string) => {
        switch (species) {
            case "DOG":
                return <Dog className="w-5 h-5" />
            case "CAT":
                return <Cat className="w-5 h-5" />
            case "BIRD":
                return <Bird className="w-5 h-5" />
            default:
                return <PawPrint className="w-5 h-5" />
        }
    }

    const getStatusBadge = (status: string) => {
        const configs: Record<string, { icon: React.ReactNode; label: string; class: string }> = {
            PENDING: {
                icon: <Clock className="w-4 h-4" />,
                label: "Bekliyor",
                class: "bg-amber-500/10 text-amber-500",
            },
            COMPLETED: {
                icon: <CheckCircle2 className="w-4 h-4" />,
                label: "Tamamlandı",
                class: "bg-emerald-500/10 text-emerald-500",
            },
            CANCELLED: {
                icon: <XCircle className="w-4 h-4" />,
                label: "İptal Edildi",
                class: "bg-red-500/10 text-red-500",
            },
        }
        const config = configs[status] || configs.PENDING
        return (
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.class}`}>
                {config.icon}
                {config.label}
            </span>
        )
    }

    const isOverdue = () => {
        if (!reminder || reminder.status !== "PENDING") return false
        return new Date(reminder.dueDate) < new Date()
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
            </div>
        )
    }

    if (!reminder) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Hatırlatma bulunamadı</p>
                <Link href="/dashboard/reminders" className="text-violet-500 hover:underline mt-4 inline-block">
                    Hatırlatmalar'a Dön
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/reminders"
                        className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${reminder.type === "VACCINATION" ? "bg-blue-500/10 text-blue-500" :
                            reminder.type === "CHECKUP" ? "bg-emerald-500/10 text-emerald-500" :
                                reminder.type === "PAYMENT" ? "bg-amber-500/10 text-amber-500" :
                                    "bg-violet-500/10 text-violet-500"
                            }`}>
                            {getTypeIcon(reminder.type)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{reminder.title}</h1>
                            <p className="text-zinc-400 text-sm">{getTypeLabel(reminder.type)}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge(reminder.status)}
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/10 text-red-500 hover:bg-red-600/20 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Sil</span>
                    </button>
                </div>
            </div>

            {/* Overdue Warning */}
            {isOverdue() && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                    <Clock className="w-6 h-6 text-red-500" />
                    <div>
                        <p className="font-medium text-red-500">Bu hatırlatma geçmiş tarihli!</p>
                        <p className="text-sm text-red-400/80">
                            Lütfen gereğini yapın veya durumu güncelleyin.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Main Info */}
                <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6">
                    <h3 className="font-semibold text-white mb-4">Hatırlatma Detayları</h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-zinc-500 mb-1">Tarih & Saat</p>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-zinc-400" />
                                <span className={`text-lg ${isOverdue() ? "text-red-500" : "text-white"}`}>
                                    {formatDate(reminder.dueDate)}
                                </span>
                            </div>
                        </div>
                        {reminder.description && (
                            <div>
                                <p className="text-sm text-zinc-500 mb-1">Açıklama</p>
                                <p className="text-white">{reminder.description}</p>
                            </div>
                        )}
                        {reminder.completedAt && (
                            <div>
                                <p className="text-sm text-zinc-500 mb-1">Tamamlanma Tarihi</p>
                                <p className="text-emerald-500">{formatDate(reminder.completedAt)}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Related Info */}
                <div className="space-y-4">
                    {reminder.animal && (
                        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${reminder.animal.species === "DOG" ? "bg-amber-500/10 text-amber-500" :
                                    reminder.animal.species === "CAT" ? "bg-orange-500/10 text-orange-500" :
                                        "bg-violet-500/10 text-violet-500"
                                    }`}>
                                    {getSpeciesIcon(reminder.animal.species)}
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-500">Hasta</p>
                                    <Link
                                        href={`/dashboard/animals/${reminder.animal.id}`}
                                        className="text-lg font-medium text-violet-400 hover:text-violet-300 transition-colors"
                                    >
                                        {reminder.animal.name}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {reminder.customer && (
                        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <User className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-500">Müşteri</p>
                                    <Link
                                        href={`/dashboard/customers/${reminder.customer.id}`}
                                        className="text-lg font-medium text-violet-400 hover:text-violet-300 transition-colors"
                                    >
                                        {reminder.customer.name}
                                    </Link>
                                    {reminder.customer.phone && (
                                        <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
                                            <Phone className="w-4 h-4" />
                                            <a href={`tel:${reminder.customer.phone}`} className="hover:text-white">
                                                {reminder.customer.phone}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            {reminder.status === "PENDING" && (
                <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6">
                    <h3 className="font-semibold text-white mb-4">Durumu Güncelle</h3>
                    <div className="flex gap-3">
                        <button
                            onClick={() => statusMutation.mutate("COMPLETED")}
                            disabled={statusMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Tamamlandı</span>
                        </button>
                        <button
                            onClick={() => statusMutation.mutate("CANCELLED")}
                            disabled={statusMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-medium hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50"
                        >
                            <XCircle className="w-5 h-5" />
                            <span>İptal Et</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-white mb-2">Hatırlatmayı Sil</h3>
                        <p className="text-zinc-400 mb-6">
                            Bu hatırlatmayı silmek istediğinize emin misiniz?
                            Bu işlem geri alınamaz.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate()}
                                disabled={deleteMutation.isPending}
                                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                            >
                                {deleteMutation.isPending ? "Siliniyor..." : "Sil"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-zinc-600 pt-4">
                © 2026 Optimus Vet. Tüm hakları saklıdır.
            </div>
        </div>
    )
}
