"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    Users,
    PawPrint,
    Package,
    AlertTriangle,
    Bell,
    CreditCard,
    Syringe,
    Calendar,
    Download,
    FileSpreadsheet,
    FileText,
    Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"

interface ReportData {
    period: string
    sales: {
        total: number
        paid: number
        discount: number
        count: number
    }
    purchases: {
        total: number
        paid: number
        count: number
    }
    paymentsByMethod: {
        method: string
        _sum: { amount: number }
        _count: number
    }[]
    customers: {
        total: number
        new: number
    }
    animals: {
        total: number
        new: number
    }
    lowStockProducts: {
        id: string
        code: string
        name: string
        stock: number
        criticalLevel: number
    }[]
    upcomingReminders: number
    pendingPayments: {
        total: number
        count: number
    }
    activeProtocols: number
    topProducts: {
        productId: string
        productName: string
        _sum: { quantity: number; total: number }
    }[]
    dailySales: { date: string; total: number }[]
    profit: number
}

export default function ReportsPage() {
    const [period, setPeriod] = useState("month")

    const { data, isLoading, error } = useQuery<ReportData>({
        queryKey: ["reports-summary", period],
        queryFn: async () => {
            const res = await fetch(`/api/reports/summary?period=${period}`)
            if (!res.ok) throw new Error("Rapor yüklenemedi")
            return res.json()
        },
    })

    const periodLabels: Record<string, string> = {
        day: "Bugün",
        week: "Bu Hafta",
        month: "Bu Ay",
        year: "Bu Yıl",
    }

    const maxDailySale = data?.dailySales
        ? Math.max(...data.dailySales.map((d) => d.total), 1)
        : 1

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-primary" />
                        Raporlar
                    </h1>
                    <p className="text-muted-foreground">
                        İşletme performansınızı analiz edin
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="day">Bugün</SelectItem>
                            <SelectItem value="week">Bu Hafta</SelectItem>
                            <SelectItem value="month">Bu Ay</SelectItem>
                            <SelectItem value="year">Bu Yıl</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel
                    </Button>
                    <Button variant="outline">
                        <FileText className="w-4 h-4 mr-2" />
                        PDF
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <Card className="p-8 text-center">
                    <p className="text-destructive">Rapor yüklenirken hata oluştu</p>
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                        Tekrar Dene
                    </Button>
                </Card>
            ) : data ? (
                <>
                    {/* Main Stats */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Sales */}
                        <Card className="relative overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Satışlar</p>
                                        <p className="text-2xl font-bold">{formatCurrency(data.sales.total)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {data.sales.count} işlem
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Purchases */}
                        <Card className="relative overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Alımlar</p>
                                        <p className="text-2xl font-bold">{formatCurrency(data.purchases.total)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {data.purchases.count} işlem
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                                        <ShoppingCart className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Profit */}
                        <Card className="relative overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Kar</p>
                                        <p
                                            className={`text-2xl font-bold ${data.profit >= 0 ? "text-emerald-600" : "text-destructive"
                                                }`}
                                        >
                                            {formatCurrency(data.profit)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">{periodLabels[period]}</p>
                                    </div>
                                    <div
                                        className={`p-3 rounded-xl ${data.profit >= 0
                                                ? "bg-emerald-100 text-emerald-600"
                                                : "bg-red-100 text-red-600"
                                            }`}
                                    >
                                        {data.profit >= 0 ? (
                                            <TrendingUp className="w-6 h-6" />
                                        ) : (
                                            <TrendingDown className="w-6 h-6" />
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pending Payments */}
                        <Card className="relative overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Bekleyen Alacak</p>
                                        <p className="text-2xl font-bold text-amber-600">
                                            {formatCurrency(data.pendingPayments.total)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {data.pendingPayments.count} müşteri
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts Row */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Daily Sales Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-primary" />
                                    Son 7 Gün Satışları
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end justify-between gap-2 h-48">
                                    {data.dailySales.map((day, idx) => {
                                        const height = (day.total / maxDailySale) * 100
                                        const date = new Date(day.date)
                                        const dayName = date.toLocaleDateString("tr-TR", { weekday: "short" })

                                        return (
                                            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                                <div className="text-xs font-medium">
                                                    {formatCurrency(day.total).replace("₺", "")}
                                                </div>
                                                <div
                                                    className="w-full bg-primary/20 rounded-t-lg transition-all duration-300 hover:bg-primary/30"
                                                    style={{ height: `${Math.max(height, 5)}%` }}
                                                >
                                                    <div
                                                        className="w-full bg-primary rounded-t-lg transition-all duration-300"
                                                        style={{ height: "100%" }}
                                                    />
                                                </div>
                                                <div className="text-xs text-muted-foreground">{dayName}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Products */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="w-5 h-5 text-primary" />
                                    En Çok Satan Ürünler
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {data.topProducts.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        Bu dönemde satış yok
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {data.topProducts.map((product, idx) => (
                                            <div key={product.productId} className="flex items-center gap-3">
                                                <div
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${idx === 0
                                                            ? "bg-amber-100 text-amber-600"
                                                            : idx === 1
                                                                ? "bg-slate-200 text-slate-600"
                                                                : idx === 2
                                                                    ? "bg-orange-100 text-orange-600"
                                                                    : "bg-slate-100 text-slate-500"
                                                        }`}
                                                >
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">{product.productName}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {product._sum.quantity} adet satıldı
                                                    </div>
                                                </div>
                                                <div className="text-right font-semibold">
                                                    {formatCurrency(product._sum.total)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bottom Stats */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{data.customers.total}</div>
                                    <div className="text-sm text-muted-foreground">
                                        Müşteri (+{data.customers.new} yeni)
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                                    <PawPrint className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{data.animals.total}</div>
                                    <div className="text-sm text-muted-foreground">
                                        Hayvan (+{data.animals.new} yeni)
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                                    <Syringe className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{data.activeProtocols}</div>
                                    <div className="text-sm text-muted-foreground">Aktif Protokol</div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-pink-100 text-pink-600">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{data.upcomingReminders}</div>
                                    <div className="text-sm text-muted-foreground">Yaklaşan Hatırlatıcı</div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Low Stock Alert */}
                    {data.lowStockProducts.length > 0 && (
                        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-amber-700">
                                    <AlertTriangle className="w-5 h-5" />
                                    Düşük Stok Uyarısı
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {data.lowStockProducts.map((product) => (
                                        <div
                                            key={product.id}
                                            className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800"
                                        >
                                            <div>
                                                <div className="font-medium">{product.name}</div>
                                                <div className="text-sm text-muted-foreground">{product.code}</div>
                                            </div>
                                            <Badge variant={product.stock === 0 ? "destructive" : "warning"}>
                                                {product.stock} / {product.criticalLevel}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Payment Methods */}
                    {data.paymentsByMethod.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Ödeme Yöntemlerine Göre</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {data.paymentsByMethod.map((pm) => (
                                        <div key={pm.method} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                            <div className="text-sm text-muted-foreground mb-1">
                                                {pm.method === "CASH"
                                                    ? "Nakit"
                                                    : pm.method === "CARD"
                                                        ? "Kredi Kartı"
                                                        : pm.method === "TRANSFER"
                                                            ? "Havale/EFT"
                                                            : pm.method}
                                            </div>
                                            <div className="text-xl font-bold">{formatCurrency(pm._sum.amount || 0)}</div>
                                            <div className="text-xs text-muted-foreground">{pm._count} işlem</div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : null}

            {/* Footer */}
            <div className="text-center py-4 border-t mt-8">
                <p className="text-xs text-muted-foreground">
                    © 2026 Optimus Vet. Tüm hakları saklıdır.
                </p>
            </div>
        </div>
    )
}
