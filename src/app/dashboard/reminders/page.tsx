"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
    Bell,
    Search,
    MoreHorizontal,
    CheckCircle,
    Clock,
    Send,
    Trash2,
    Loader2,
    Syringe,
    Baby,
    CreditCard,
    Calendar,
    PawPrint,
    User,
    Phone,
    Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDate } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface Reminder {
    id: string
    type: string
    title: string
    message: string | null
    dueDate: string
    isSent: boolean
    isCompleted: boolean
    sentAt: string | null
    animal: {
        id: string
        name: string
        species: string
        customer: {
            id: string
            name: string
            phone: string
        }
    } | null
}

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    VACCINE: { label: "Aşı", icon: Syringe, color: "bg-blue-100 text-blue-600" },
    FERTILITY: { label: "Fertilite", icon: Baby, color: "bg-pink-100 text-pink-600" },
    PAYMENT: { label: "Ödeme", icon: CreditCard, color: "bg-amber-100 text-amber-600" },
    APPOINTMENT: { label: "Randevu", icon: Calendar, color: "bg-emerald-100 text-emerald-600" },
    OTHER: { label: "Diğer", icon: Bell, color: "bg-slate-100 text-slate-600" },
}

export default function RemindersPage() {
    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState<string>("all")
    const [statusFilter, setStatusFilter] = useState<string>("pending")

    const queryClient = useQueryClient()

    const { data, isLoading, error } = useQuery<{ reminders: Reminder[]; total: number }>({
        queryKey: ["reminders", search, typeFilter, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (search) params.set("search", search)
            if (typeFilter && typeFilter !== "all") params.set("type", typeFilter)
            if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)
            params.set("limit", "50")

            const res = await fetch(`/api/reminders?${params}`)
            if (!res.ok) throw new Error("Hatırlatıcılar yüklenemedi")
            return res.json()
        },
    })

    const markCompletedMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch("/api/reminders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, isCompleted: true }),
            })
            if (!res.ok) throw new Error("Hata")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reminders"] })
            toast({ variant: "success", title: "Tamamlandı olarak işaretlendi" })
        },
    })

    const markSentMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch("/api/reminders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, isSent: true }),
            })
            if (!res.ok) throw new Error("Hata")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reminders"] })
            toast({ variant: "success", title: "Gönderildi olarak işaretlendi" })
        },
    })

    const getDaysUntil = (dueDate: string) => {
        const due = new Date(dueDate)
        const now = new Date()
        const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return diff
    }

    const getDueBadge = (dueDate: string) => {
        const days = getDaysUntil(dueDate)
        if (days < 0) {
            return <Badge variant="destructive">Gecikmiş ({Math.abs(days)} gün)</Badge>
        } else if (days === 0) {
            return <Badge variant="warning">Bugün</Badge>
        } else if (days <= 3) {
            return <Badge variant="warning">{days} gün kaldı</Badge>
        } else {
            return <Badge variant="secondary">{days} gün kaldı</Badge>
        }
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bell className="w-6 h-6 text-primary" />
                        Hatırlatıcılar
                    </h1>
                    <p className="text-muted-foreground">
                        Aşı, fertilite ve ödeme hatırlatıcılarını yönetin
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Hayvan veya sahip ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Tip" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tüm Tipler</SelectItem>
                        <SelectItem value="VACCINE">Aşı</SelectItem>
                        <SelectItem value="FERTILITY">Fertilite</SelectItem>
                        <SelectItem value="PAYMENT">Ödeme</SelectItem>
                        <SelectItem value="APPOINTMENT">Randevu</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Durum" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="pending">Bekleyen</SelectItem>
                        <SelectItem value="sent">Gönderilen</SelectItem>
                        <SelectItem value="completed">Tamamlanan</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stats */}
            {data && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Toplam</div>
                        <div className="text-2xl font-bold">{data.total}</div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Bugün</div>
                        <div className="text-2xl font-bold text-amber-600">
                            {data.reminders.filter((r) => getDaysUntil(r.dueDate) === 0).length}
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Gecikmiş</div>
                        <div className="text-2xl font-bold text-destructive">
                            {data.reminders.filter((r) => getDaysUntil(r.dueDate) < 0 && !r.isCompleted).length}
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Bu Hafta</div>
                        <div className="text-2xl font-bold text-emerald-600">
                            {
                                data.reminders.filter(
                                    (r) => getDaysUntil(r.dueDate) >= 0 && getDaysUntil(r.dueDate) <= 7
                                ).length
                            }
                        </div>
                    </Card>
                </div>
            )}

            {/* Reminder List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <Card className="p-8 text-center">
                    <p className="text-destructive">Hatırlatıcılar yüklenirken hata oluştu</p>
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                        Tekrar Dene
                    </Button>
                </Card>
            ) : data?.reminders.length === 0 ? (
                <Card className="p-8 text-center">
                    <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">Hatırlatıcı Bulunamadı</h3>
                    <p className="text-muted-foreground">
                        {search || typeFilter !== "all" || statusFilter !== "all"
                            ? "Arama kriterlerine uygun hatırlatıcı yok"
                            : "Bekleyen hatırlatıcı bulunmuyor"}
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {data?.reminders.map((reminder) => {
                        const TypeIcon = typeConfig[reminder.type]?.icon || Bell
                        const days = getDaysUntil(reminder.dueDate)

                        return (
                            <Card
                                key={reminder.id}
                                className={`overflow-hidden hover:shadow-md transition-shadow ${reminder.isCompleted
                                        ? "opacity-60"
                                        : days < 0
                                            ? "border-destructive/50"
                                            : days === 0
                                                ? "border-amber-500/50"
                                                : ""
                                    }`}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Left: Info */}
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div
                                                className={`p-2 rounded-lg shrink-0 ${typeConfig[reminder.type]?.color || "bg-slate-100 text-slate-600"
                                                    }`}
                                            >
                                                <TypeIcon className="w-5 h-5" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <h3 className="font-semibold">{reminder.title}</h3>
                                                    {getDueBadge(reminder.dueDate)}
                                                    {reminder.isSent && !reminder.isCompleted && (
                                                        <Badge variant="info">Gönderildi</Badge>
                                                    )}
                                                    {reminder.isCompleted && (
                                                        <Badge variant="success">Tamamlandı</Badge>
                                                    )}
                                                </div>

                                                {reminder.message && (
                                                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                                        {reminder.message}
                                                    </p>
                                                )}

                                                {reminder.animal && (
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <PawPrint className="w-3.5 h-3.5" />
                                                            <span>{reminder.animal.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <User className="w-3.5 h-3.5" />
                                                            <span>{reminder.animal.customer.name}</span>
                                                        </div>
                                                        <a
                                                            href={`tel:${reminder.animal.customer.phone}`}
                                                            className="flex items-center gap-1 hover:text-primary"
                                                        >
                                                            <Phone className="w-3.5 h-3.5" />
                                                            <span>{reminder.animal.customer.phone}</span>
                                                        </a>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>{formatDate(reminder.dueDate)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="flex items-center gap-2">
                                            {!reminder.isCompleted && (
                                                <>
                                                    {!reminder.isSent && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => markSentMutation.mutate(reminder.id)}
                                                            disabled={markSentMutation.isPending}
                                                        >
                                                            <Send className="w-4 h-4 mr-1" />
                                                            Gönderildi
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => markCompletedMutation.mutate(reminder.id)}
                                                        disabled={markCompletedMutation.isPending}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        Tamamla
                                                    </Button>
                                                </>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {reminder.animal && (
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/dashboard/animals/${reminder.animal.id}`}>
                                                                <PawPrint className="w-4 h-4 mr-2" />
                                                                Hayvan Detay
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive">
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Sil
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Footer */}
            <div className="text-center py-4 border-t mt-8">
                <p className="text-xs text-muted-foreground">
                    © 2026 Optimus Vet. Tüm hakları saklıdır.
                </p>
            </div>
        </div>
    )
}
