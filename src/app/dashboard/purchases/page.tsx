"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Receipt,
  MoreHorizontal,
  Eye,
  Printer,
  Trash2,
  Loader2,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ArrowDownLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Purchase {
  id: string;
  code: string;
  type: string;
  status: string;
  subTotal: number;
  discount: number;
  vatTotal: number;
  grandTotal: number;
  paidAmount: number;
  createdAt: string;
  supplier: {
    id: string;
    name: string;
    code: string;
  } | null;
  items: {
    id: string;
    product?: {
      name: string;
    };
    description?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

const statusConfig: Record<
  string,
  {
    label: string;
    variant:
      | "success"
      | "warning"
      | "destructive"
      | "secondary"
      | "outline"
      | "info";
    icon: React.ElementType;
  }
> = {
  PENDING: { label: "Bekliyor", variant: "warning", icon: Clock },
  PARTIAL: { label: "Kısmi Ödeme", variant: "info", icon: AlertCircle },
  COMPLETED: { label: "Tamamlandı", variant: "success", icon: CheckCircle },
  CANCELLED: { label: "İptal", variant: "destructive", icon: XCircle },
};

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data, isLoading, error } = useQuery<{
    transactions: Purchase[];
    pagination: { total: number };
  }>({
    queryKey: ["purchases", search, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("type", "PURCHASE");
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all")
        params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("limit", "50");

      const res = await fetch(`/api/transactions?${params}`);
      if (!res.ok) throw new Error("Satın almalar yüklenemedi");
      return res.json();
    },
  });

  const getRemainingAmount = (purchase: Purchase) => {
    return purchase.grandTotal - purchase.paidAmount;
  };

  const getTodayTotal = () => {
    if (!data?.transactions) return 0;
    const today = new Date().toDateString();
    return data.transactions
      .filter((s) => new Date(s.createdAt).toDateString() === today)
      .reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);
  };

  const getPendingTotal = () => {
    if (!data?.transactions) return 0;
    return data.transactions
      .filter((s) => s.status === "PENDING" || s.status === "PARTIAL")
      .reduce((sum, s) => sum + Number(getRemainingAmount(s) || 0), 0);
  };

  // Hızlı tarih seçicileri
  const handleQuickDateSelect = (option: string) => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    switch (option) {
      case "today":
        setDateFrom(formatDate(today));
        setDateTo(formatDate(today));
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        setDateFrom(formatDate(yesterday));
        setDateTo(formatDate(yesterday));
        break;
      case "thisWeek":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1); // Pazartesi
        setDateFrom(formatDate(weekStart));
        setDateTo(formatDate(today));
        break;
      case "lastWeek":
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay());
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        setDateFrom(formatDate(lastWeekStart));
        setDateTo(formatDate(lastWeekEnd));
        break;
      case "thisMonth":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateFrom(formatDate(monthStart));
        setDateTo(formatDate(today));
        break;
      case "lastMonth":
        const lastMonthStart = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1,
        );
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setDateFrom(formatDate(lastMonthStart));
        setDateTo(formatDate(lastMonthEnd));
        break;
      case "thisYear":
        const yearStart = new Date(today.getFullYear(), 0, 1);
        setDateFrom(formatDate(yearStart));
        setDateTo(formatDate(today));
        break;
      case "lastYear":
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
        setDateFrom(formatDate(lastYearStart));
        setDateTo(formatDate(lastYearEnd));
        break;
      case "clear":
        setDateFrom("");
        setDateTo("");
        break;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowDownLeft className="w-6 h-6 text-primary" />
            Satın Almalar
          </h1>
          <p className="text-muted-foreground">
            Tedarikçilerden yapılan alımları yönetin
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/purchases/new">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Alım
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="İşlem kodu veya tedarikçi ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Hızlı Tarih Seçici */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Calendar className="w-4 h-4 mr-2" />
              {dateFrom && dateTo
                ? `${new Date(dateFrom).toLocaleDateString("tr-TR")} - ${new Date(dateTo).toLocaleDateString("tr-TR")}`
                : "Tarih Seç"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => handleQuickDateSelect("today")}>
              📅 Bugün
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleQuickDateSelect("yesterday")}
            >
              📆 Dün
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleQuickDateSelect("thisWeek")}>
              📊 Bu Hafta
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleQuickDateSelect("lastWeek")}>
              📉 Geçen Hafta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleQuickDateSelect("thisMonth")}
            >
              📈 Bu Ay
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleQuickDateSelect("lastMonth")}
            >
              📊 Geçen Ay
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleQuickDateSelect("thisYear")}>
              🎯 Bu Yıl
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleQuickDateSelect("lastYear")}>
              📅 Geçen Yıl
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleQuickDateSelect("clear")}>
              ❌ Temizle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="PENDING">Bekliyor</SelectItem>
            <SelectItem value="PARTIAL">Kısmi Ödeme</SelectItem>
            <SelectItem value="COMPLETED">Tamamlandı</SelectItem>
            <SelectItem value="CANCELLED">İptal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Toplam Alım</div>
            <div className="text-2xl font-bold">{data.pagination.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Bugünkü Alım</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(getTodayTotal())}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Ödenecek Borç</div>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(getPendingTotal())}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Tamamlanan</div>
            <div className="text-2xl font-bold">
              {data.transactions.filter((s) => s.status === "COMPLETED").length}
            </div>
          </Card>
        </div>
      )}

      {/* Purchases List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-destructive">
          <p>Satın almalar yüklenirken hata oluştu</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Tekrar Dene
          </Button>
        </Card>
      ) : data?.transactions.length === 0 ? (
        <Card className="p-8 text-center">
          <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Alım Bulunamadı</h3>
          <p className="text-muted-foreground mb-4">
            {search || statusFilter !== "all"
              ? "Arama kriterlerine uygun alım yok"
              : "Henüz alım kaydı yok"}
          </p>
          <Button asChild>
            <Link href="/dashboard/purchases/new">
              <Plus className="w-4 h-4 mr-2" />
              İlk Alımı Oluştur
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {data?.transactions.map((purchase) => {
            const StatusIcon = statusConfig[purchase.status]?.icon || Clock;
            const remaining = getRemainingAmount(purchase);

            return (
              <Card key={purchase.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{purchase.code}</h3>
                        <Badge
                          variant={
                            statusConfig[purchase.status]?.variant ||
                            "secondary"
                          }
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[purchase.status]?.label ||
                            purchase.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {purchase.supplier && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{purchase.supplier.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(purchase.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Receipt className="w-3.5 h-3.5" />
                          <span>{purchase.items.length} kalem</span>
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div className="mt-2 text-sm text-muted-foreground truncate">
                        {purchase.items.slice(0, 3).map((item, idx) => (
                          <span key={item.id}>
                            {item.product?.name || item.description} x
                            {item.quantity}
                            {idx < Math.min(purchase.items.length, 3) - 1 &&
                              ", "}
                          </span>
                        ))}
                        {purchase.items.length > 3 &&
                          ` +${purchase.items.length - 3} daha`}
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {formatCurrency(purchase.grandTotal)}
                        </div>
                        {remaining > 0 && (
                          <div className="text-sm text-destructive">
                            Kalan: {formatCurrency(remaining)}
                          </div>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/purchases/${purchase.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Detay
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Printer className="w-4 h-4 mr-2" />
                            Yazdır
                          </DropdownMenuItem>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
