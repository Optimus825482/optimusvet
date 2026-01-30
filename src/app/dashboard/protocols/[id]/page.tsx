"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
    ArrowLeft,
    Trash2,
    Syringe,
    Heart,
    ClipboardList,
    Check,
    Circle,
    Calendar,
    Dog,
    Cat,
    Bird,
    PawPrint,
    User,
    Phone,
    ChevronDown,
    ChevronUp,
    Clock,
    AlertCircle,
} from "lucide-react"
import { useState } from "react"

interface Protocol {
    id: string
    name: string
    type: string
    status: string
    startDate: string
    notes: string | null
    progress: number
    completedSteps: number
    totalSteps: number
    animal: {
        id: string
        name: string
        species: string
        breed: string | null
        customer: {
            id: string
            name: string
            phone: string | null
            email: string | null
        }
    }
    template: {
        id: string
        name: string
        type: string
    } | null
    steps: ProtocolStep[]
}

interface ProtocolStep {
    id: string
    name: string
    description: string | null
    dayOffset: number
    scheduledDate: string
    completedAt: string | null
    notes: string | null
}

export default function ProtocolDetailPage() {
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [expandedSteps, setExpandedSteps] = useState<string[]>([])

    const { data: protocol, isLoading } = useQuery<Protocol>({
        queryKey: ["protocol", params.id],
        queryFn: async () => {
            const res = await fetch(`/api/protocols/${params.id}`)
            if (!res.ok) throw new Error("Protokol bulunamadı")
            return res.json()
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/protocols/${params.id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Silinemedi")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["protocols"] })
            router.push("/dashboard/protocols")
        },
    })

    const toggleStepMutation = useMutation({
        mutationFn: async ({ stepId, completed }: { stepId: string; completed: boolean }) => {
            const res = await fetch(`/api/protocols/${params.id}/steps/${stepId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed }),
            })
            if (!res.ok) throw new Error("Güncellenemedi")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["protocol", params.id] })
        },
    })

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        })
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

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "VACCINATION":
                return <Syringe className="w-5 h-5" />
            case "FERTILITY":
                return <Heart className="w-5 h-5" />
            default:
                return <ClipboardList className="w-5 h-5" />
        }
    }

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            VACCINATION: "Aşı Protokolü",
            FERTILITY: "Üreme Takibi",
            TREATMENT: "Tedavi Protokolü",
            OTHER: "Diğer",
        }
        return labels[type] || type
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            ACTIVE: "bg-blue-500/10 text-blue-500",
            COMPLETED: "bg-emerald-500/10 text-emerald-500",
            CANCELLED: "bg-red-500/10 text-red-500",
            PAUSED: "bg-amber-500/10 text-amber-500",
        }
        const labels: Record<string, string> = {
            ACTIVE: "Aktif",
            COMPLETED: "Tamamlandı",
            CANCELLED: "İptal Edildi",
            PAUSED: "Duraklatıldı",
        }
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || ""}`}>
                {labels[status] || status}
            </span>
        )
    }

    const isStepOverdue = (step: ProtocolStep) => {
        if (step.completedAt) return false
        return new Date(step.scheduledDate) < new Date()
    }

    const isStepToday = (step: ProtocolStep) => {
        const today = new Date()
        const scheduled = new Date(step.scheduledDate)
        return (
            today.getDate() === scheduled.getDate() &&
            today.getMonth() === scheduled.getMonth() &&
            today.getFullYear() === scheduled.getFullYear()
        )
    }

    const toggleExpand = (stepId: string) => {
        setExpandedSteps((prev) =>
            prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
        )
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
            </div>
        )
    }

    if (!protocol) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Protokol bulunamadı</p>
                <Link href="/dashboard/protocols" className="text-violet-500 hover:underline mt-4 inline-block">
                    Protokoller'e Dön
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/protocols"
                        className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${protocol.type === "VACCINATION" ? "bg-blue-500/10 text-blue-500" :
                            protocol.type === "FERTILITY" ? "bg-pink-500/10 text-pink-500" :
                                "bg-violet-500/10 text-violet-500"
                            }`}>
                            {getTypeIcon(protocol.type)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{protocol.name}</h1>
                            <p className="text-zinc-400 text-sm">{getTypeLabel(protocol.type)}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge(protocol.status)}
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/10 text-red-500 hover:bg-red-600/20 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Sil</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Info */}
                <div className="space-y-4">
                    {/* Progress Card */}
                    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
                        <h3 className="font-semibold text-white mb-4">İlerleme Durumu</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-400">Tamamlanan</span>
                                <span className="text-white font-medium">
                                    {protocol.completedSteps} / {protocol.totalSteps} adım
                                </span>
                            </div>
                            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${protocol.progress === 100 ? "bg-emerald-500" : "bg-violet-500"
                                        }`}
                                    style={{ width: `${protocol.progress}%` }}
                                />
                            </div>
                            <p className="text-center text-lg font-bold text-white">
                                %{protocol.progress}
                            </p>
                        </div>
                    </div>

                    {/* Animal Card */}
                    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${protocol.animal.species === "DOG" ? "bg-amber-500/10 text-amber-500" :
                                protocol.animal.species === "CAT" ? "bg-orange-500/10 text-orange-500" :
                                    protocol.animal.species === "BIRD" ? "bg-sky-500/10 text-sky-500" :
                                        "bg-violet-500/10 text-violet-500"
                                }`}>
                                {getSpeciesIcon(protocol.animal.species)}
                            </div>
                            <h3 className="font-semibold text-white">Hasta Bilgisi</h3>
                        </div>
                        <div className="space-y-2">
                            <Link
                                href={`/dashboard/animals/${protocol.animal.id}`}
                                className="text-lg font-medium text-violet-400 hover:text-violet-300 transition-colors"
                            >
                                {protocol.animal.name}
                            </Link>
                            {protocol.animal.breed && (
                                <p className="text-sm text-zinc-400">{protocol.animal.breed}</p>
                            )}
                        </div>
                    </div>

                    {/* Owner Card */}
                    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-emerald-500" />
                            </div>
                            <h3 className="font-semibold text-white">Hasta Sahibi</h3>
                        </div>
                        <div className="space-y-2">
                            <Link
                                href={`/dashboard/customers/${protocol.animal.customer.id}`}
                                className="text-lg font-medium text-violet-400 hover:text-violet-300 transition-colors"
                            >
                                {protocol.animal.customer.name}
                            </Link>
                            {protocol.animal.customer.phone && (
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                    <Phone className="w-4 h-4" />
                                    <a
                                        href={`tel:${protocol.animal.customer.phone}`}
                                        className="hover:text-white transition-colors"
                                    >
                                        {protocol.animal.customer.phone}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
                        <h3 className="font-semibold text-white mb-4">Protokol Bilgileri</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-zinc-500" />
                                <span className="text-zinc-400">Başlangıç:</span>
                                <span className="text-white">{formatDate(protocol.startDate)}</span>
                            </div>
                            {protocol.template && (
                                <div>
                                    <span className="text-zinc-400">Şablon:</span>
                                    <span className="text-white ml-2">{protocol.template.name}</span>
                                </div>
                            )}
                        </div>
                        {protocol.notes && (
                            <div className="mt-4 pt-4 border-t border-zinc-800/50">
                                <p className="text-sm text-zinc-400">{protocol.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Steps */}
                <div className="lg:col-span-2">
                    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
                        <div className="p-5 border-b border-zinc-800/50">
                            <h3 className="font-semibold text-white">Protokol Adımları</h3>
                        </div>
                        <div className="divide-y divide-zinc-800/50">
                            {protocol.steps.map((step, index) => {
                                const isExpanded = expandedSteps.includes(step.id)
                                const overdue = isStepOverdue(step)
                                const today = isStepToday(step)

                                return (
                                    <div
                                        key={step.id}
                                        className={`p-4 transition-colors ${step.completedAt ? "bg-emerald-500/5" :
                                            overdue ? "bg-red-500/5" :
                                                today ? "bg-amber-500/5" :
                                                    "hover:bg-zinc-800/30"
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Checkbox */}
                                            <button
                                                onClick={() => toggleStepMutation.mutate({
                                                    stepId: step.id,
                                                    completed: !step.completedAt,
                                                })}
                                                disabled={toggleStepMutation.isPending}
                                                className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${step.completedAt
                                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                                    : "border-zinc-600 hover:border-violet-500"
                                                    }`}
                                            >
                                                {step.completedAt && <Check className="w-4 h-4" />}
                                            </button>

                                            {/* Content */}
                                            <div className="flex-1">
                                                <div
                                                    className="flex items-center justify-between cursor-pointer"
                                                    onClick={() => toggleExpand(step.id)}
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-zinc-500">
                                                                Adım {index + 1}
                                                            </span>
                                                            {overdue && !step.completedAt && (
                                                                <span className="flex items-center gap-1 text-xs text-red-500">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    Gecikmiş
                                                                </span>
                                                            )}
                                                            {today && !step.completedAt && (
                                                                <span className="flex items-center gap-1 text-xs text-amber-500">
                                                                    <Clock className="w-3 h-3" />
                                                                    Bugün
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className={`font-medium ${step.completedAt ? "text-zinc-400 line-through" : "text-white"
                                                            }`}>
                                                            {step.name}
                                                        </h4>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="text-sm text-zinc-400">
                                                                {formatDate(step.scheduledDate)}
                                                            </p>
                                                            <p className="text-xs text-zinc-500">
                                                                +{step.dayOffset} gün
                                                            </p>
                                                        </div>
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-5 h-5 text-zinc-500" />
                                                        ) : (
                                                            <ChevronDown className="w-5 h-5 text-zinc-500" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <div className="mt-3 pt-3 border-t border-zinc-800/50 space-y-2">
                                                        {step.description && (
                                                            <p className="text-sm text-zinc-400">{step.description}</p>
                                                        )}
                                                        {step.completedAt && (
                                                            <p className="text-sm text-emerald-500">
                                                                ✓ {formatDate(step.completedAt)} tarihinde tamamlandı
                                                            </p>
                                                        )}
                                                        {step.notes && (
                                                            <p className="text-sm text-zinc-500 italic">{step.notes}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-white mb-2">Protokolü Sil</h3>
                        <p className="text-zinc-400 mb-6">
                            <strong>{protocol.name}</strong> protokolünü silmek istediğinize emin misiniz?
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
