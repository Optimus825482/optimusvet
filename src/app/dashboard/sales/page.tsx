"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  ShoppingCart,
  MoreHorizontal,
  Eye,
  Printer,
  Trash2,
  Loader2,
  Receipt,
  User,
  Calendar as CalendarIcon,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { formatCurrency } from "@/lib/utils";
import { DateRange } from "react-day-picker";

// Simple date formatter
function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Sale {
  id: string;
  code: string;
  type: string;
  status: string;
  subtotal: string | number;
  discount: number;
  vatTotal: string | number;
  total: string | number;
  paidAmount: string | number;
  date: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  } | null;
  animal: {
    id: string;
    name: string;
    species: string;
  } | null;
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: string | number;
  }[];
  _count: {
    payments: number;
  };
}

const statusConfig: Record<
  string,
  { label: string; variant: any; icon: React.ElementType }
> = {
  PENDING: { label: "Bekliyor", variant: "warning", icon: Clock },
  PARTIAL: { label: "Kısmi Ödeme", variant: "info", icon: AlertCircle },
  COMPLETED: { label: "Tamamlandı", variant: "success", icon: CheckCircle },
  CANCELLED: { label: "İptal", variant: "destructive", icon: XCircle },
};

const typeLabels: Record<string, string> = {
  SALE: "Satış",
  PURCHASE: "Alım",
  RETURN: "İade",
  SERVICE: "Hizmet",
};

export default function SalesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<{
    transactions: Sale[];
    total: string | number;
  }>({
    queryKey: ["sales", search, statusFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all")
        params.set("status", statusFilter);
      if (dateRange?.from) {
        params.set("startDate", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.set("endDate", dateRange.to.toISOString());
      }
      params.set("type", "SALE");
      params.set("limit", "50");
      params.set("orderBy", "date");
      params.set("order", "desc");

      const res = await fetch(`/api/sales?${params}`);
      if (!res.ok) throw new Error("Satışlar yüklenemedi");
      return res.json();
    },
  });

  const getRemainingAmount = (sale: Sale) => {
    return Number(sale.total || 0) - Number(sale.paidAmount || 0);
  };

  const getTodayTotal = () => {
    if (!data?.transactions) return 0;
    const today = new Date().toDateString();
    return data.transactions
      .filter((s) => new Date(s.date).toDateString() === today)
      .reduce((sum, s) => sum + Number(s.total || 0), 0);
  };

  const getPendingTotal = () => {
    if (!data?.transactions) return 0;
    return data.transactions
      .filter((s) => s.status === "PENDING" || s.status === "PARTIAL")
      .reduce((sum, s) => sum + Number(getRemainingAmount(s) || 0), 0);
  };

  const handleDelete = async (saleId: string, saleCode: string) => {
    if (
      !confirm(
        `${saleCode} kodlu satışı iptal etmek istediğinize emin misiniz?\n\nBu işlem:\n- Satış kaydını silecek\n- Ürün stoklarını geri yükleyecek\n- Müşteri bakiyesini düzeltecek\n\nBu işlem geri alınamaz!`,
      )
    ) {
      return;
    }

    setDeletingId(saleId);

    try {
      const response = await fetch(`/api/transactions/${saleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Satış iptal edilemedi");
      }

      const result = await response.json();
      alert(result.message || "Satış başarıyla iptal edildi");

      // Refresh the list
      refetch();
    } catch (error) {
      console.error("Delete error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Satış iptal edilirken hata oluştu",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Satışlar
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Satış ve hizmet işlemlerini yönetin
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dashboard/sales/new">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Satış
          </Link>
        </Button>
      </div>

      {/* Search & Filters - Mobile Optimized */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="İşlem kodu veya müşteri ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
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

          {/* Quick Date Selectors */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Hızlı Seç
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  const today = new Date();
                  setDateRange({ from: today, to: today });
                }}
              >
                📅 Bugün
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setDateRange({ from: yesterday, to: yesterday });
                }}
              >
                ⏮️ Dün
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const today = new Date();
                  const weekStart = new Date(today);
                  weekStart.setDate(today.getDate() - today.getDay() + 1);
                  setDateRange({ from: weekStart, to: today });
                }}
              >
                📆 Bu Hafta
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const today = new Date();
                  const lastWeekEnd = new Date(today);
                  lastWeekEnd.setDate(today.getDate() - today.getDay());
                  const lastWeekStart = new Date(lastWeekEnd);
                  lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
                  setDateRange({ from: lastWeekStart, to: lastWeekEnd });
                }}
              >
                ⏪ Geçen Hafta
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const today = new Date();
                  const monthStart = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1,
                  );
                  setDateRange({ from: monthStart, to: today });
                }}
              >
                🗓️ Bu Ay
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const today = new Date();
                  const lastMonthStart = new Date(
                    today.getFullYear(),
                    today.getMonth() - 1,
                    1,
                  );
                  const lastMonthEnd = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    0,
                  );
                  setDateRange({ from: lastMonthStart, to: lastMonthEnd });
                }}
              >
                ◀️ Geçen Ay
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const today = new Date();
                  const yearStart = new Date(today.getFullYear(), 0, 1);
                  setDateRange({ from: yearStart, to: today });
                }}
              >
                📅 Bu Yıl
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const today = new Date();
                  const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
                  const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
                  setDateRange({ from: lastYearStart, to: lastYearEnd });
                }}
              >
                ⏪ Geçen Yıl
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDateRange(undefined)}
                className="text-muted-foreground"
              >
                <X className="w-4 h-4 mr-2" />
                Temizle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full sm:w-[280px] justify-start text-left font-normal ${
                  !dateRange && "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {dateRange.from.toLocaleDateString("tr-TR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      -{" "}
                      {dateRange.to.toLocaleDateString("tr-TR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </>
                  ) : (
                    dateRange.from.toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  )
                ) : (
                  <span>Tarih seçin</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
              {dateRange && (
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDateRange(undefined)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Temizle
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats - Mobile Optimized */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Toplam İşlem
            </div>
            <div className="text-xl sm:text-2xl font-bold">{data.total}</div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Bugünkü Satış
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600">
              {formatCurrency(getTodayTotal())}
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Bekleyen Ödeme
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-600">
              {formatCurrency(getPendingTotal())}
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Tamamlanan
            </div>
            <div className="text-xl sm:text-2xl font-bold">
              {data.transactions.filter((s) => s.status === "COMPLETED").length}
            </div>
          </Card>
        </div>
      )}

      {/* Sales List - Mobile Optimized */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-6 sm:p-8 text-center">
          <p className="text-sm sm:text-base text-destructive">
            Satışlar yüklenirken hata oluştu
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Tekrar Dene
          </Button>
        </Card>
      ) : data?.transactions.length === 0 ? (
        <Card className="p-6 sm:p-8 text-center">
          <Receipt className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base sm:text-lg font-semibold mb-2">
            Satış Bulunamadı
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-4">
            {search || statusFilter !== "all"
              ? "Arama kriterlerine uygun satış yok"
              : "Henüz satış kaydı yok"}
          </p>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/sales/new">
              <Plus className="w-4 h-4 mr-2" />
              İlk Satışı Oluştur
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {data?.transactions.map((sale) => {
            const StatusIcon = statusConfig[sale.status]?.icon || Clock;
            const remaining = getRemainingAmount(sale);

            return (
              <Link key={sale.id} href={`/dashboard/sales/${sale.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:gap-4">
                      {/* Top Row: Info & Amount */}
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-sm sm:text-base">
                              {sale.code}
                            </h3>
                            <Badge
                              variant={
                                statusConfig[sale.status]?.variant ||
                                "secondary"
                              }
                              className="text-xs"
                            >
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig[sale.status]?.label || sale.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {typeLabels[sale.type] || sale.type}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                            {sale.customer && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span className="truncate max-w-[150px] sm:max-w-none">
                                  {sale.customer.name}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span className="text-xs sm:text-sm">
                                {formatDate(sale.date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span>{sale.items.length} kalem</span>
                            </div>
                          </div>

                          {/* Items Preview - Hidden on very small screens */}
                          <div className="hidden xs:block mt-2 text-xs sm:text-sm text-muted-foreground">
                            {sale.items.slice(0, 3).map((item, idx) => (
                              <span key={item.id}>
                                {item.productName} x{item.quantity}
                                {idx < Math.min(sale.items.length, 3) - 1 &&
                                  ", "}
                              </span>
                            ))}
                            {sale.items.length > 3 &&
                              ` +${sale.items.length - 3} daha`}
                          </div>
                        </div>

                        {/* Right: Amount */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg sm:text-xl font-bold">
                            {formatCurrency(Number(sale.total || 0))}
                          </div>
                          {remaining > 0 && (
                            <div className="text-xs sm:text-sm text-destructive">
                              Kalan: {formatCurrency(remaining)}
                            </div>
                          )}
                          {Number(sale.paidAmount || 0) > 0 &&
                            Number(sale.paidAmount || 0) <
                              Number(sale.total || 0) && (
                              <div className="text-xs text-muted-foreground">
                                Ödenen:{" "}
                                {formatCurrency(Number(sale.paidAmount || 0))}
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Bottom Row: Actions - Mobile Optimized */}
                      <div className="flex items-center justify-end gap-2 pt-3 border-t">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.preventDefault()}
                            disabled={deletingId === sale.id}
                          >
                            <Button variant="ghost" size="sm" className="h-9">
                              {deletingId === sale.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <MoreHorizontal className="w-4 h-4 sm:mr-2" />
                                  <span className="hidden sm:inline">
                                    İşlemler
                                  </span>
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/sales/${sale.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                Detay
                              </Link>
                            </DropdownMenuItem>
                            {remaining > 0 && (
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/sales/${sale.id}/payment`}
                                >
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Ödeme Al
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => e.preventDefault()}
                            >
                              <Printer className="w-4 h-4 mr-2" />
                              Yazdır
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.preventDefault();
                                handleDelete(sale.id, sale.code);
                              }}
                              disabled={deletingId === sale.id}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              İptal Et
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
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
  );
}
