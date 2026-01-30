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
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
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
  const [dateFilter, setDateFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery<{
    transactions: Sale[];
    total: string | number;
  }>({
    queryKey: ["sales", search, statusFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all")
        params.set("status", statusFilter);
      params.set("type", "SALE");
      params.set("limit", "50");

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
      .filter((s) => new Date(s.date || s.createdAt).toDateString() === today)
      .reduce((sum, s) => sum + Number(s.total || 0), 0);
  };

  const getPendingTotal = () => {
    if (!data?.transactions) return 0;
    return data.transactions
      .filter((s) => s.status === "PENDING" || s.status === "PARTIAL")
      .reduce((sum, s) => sum + Number(getRemainingAmount(s) || 0), 0);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Satışlar
          </h1>
          <p className="text-muted-foreground">
            Satış ve hizmet işlemlerini yönetin
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/sales/new">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Satış
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="İşlem kodu veya müşteri ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
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
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tarih" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Zamanlar</SelectItem>
            <SelectItem value="today">Bugün</SelectItem>
            <SelectItem value="week">Bu Hafta</SelectItem>
            <SelectItem value="month">Bu Ay</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Toplam İşlem</div>
            <div className="text-2xl font-bold">{data.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Bugünkü Satış</div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(getTodayTotal())}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Bekleyen Ödeme</div>
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

      {/* Sales List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">Satışlar yüklenirken hata oluştu</p>
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
          <h3 className="font-semibold mb-2">Satış Bulunamadı</h3>
          <p className="text-muted-foreground mb-4">
            {search || statusFilter !== "all"
              ? "Arama kriterlerine uygun satış yok"
              : "Henüz satış kaydı yok"}
          </p>
          <Button asChild>
            <Link href="/dashboard/sales/new">
              <Plus className="w-4 h-4 mr-2" />
              İlk Satışı Oluştur
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {data?.transactions.map((sale) => {
            const StatusIcon = statusConfig[sale.status]?.icon || Clock;
            const remaining = getRemainingAmount(sale);

            return (
              <Card key={sale.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{sale.code}</h3>
                        <Badge
                          variant={
                            statusConfig[sale.status]?.variant || "secondary"
                          }
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[sale.status]?.label || sale.status}
                        </Badge>
                        <Badge variant="outline">
                          {typeLabels[sale.type] || sale.type}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {sale.customer && (
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            <span>{sale.customer.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(sale.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{sale.items.length} kalem</span>
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div className="mt-2 text-sm text-muted-foreground">
                        {sale.items.slice(0, 3).map((item, idx) => (
                          <span key={item.id}>
                            {item.productName} x{item.quantity}
                            {idx < Math.min(sale.items.length, 3) - 1 && ", "}
                          </span>
                        ))}
                        {sale.items.length > 3 &&
                          ` +${sale.items.length - 3} daha`}
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {formatCurrency(Number(sale.total || 0))}
                        </div>
                        {remaining > 0 && (
                          <div className="text-sm text-destructive">
                            Kalan: {formatCurrency(remaining)}
                          </div>
                        )}
                        {Number(sale.paidAmount || 0) > 0 &&
                          Number(sale.paidAmount || 0) < Number(sale.total || 0) && (
                            <div className="text-xs text-muted-foreground">
                              Ödenen: {formatCurrency(Number(sale.paidAmount || 0))}
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
                          <DropdownMenuItem>
                            <Printer className="w-4 h-4 mr-2" />
                            Yazdır
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            İptal Et
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

      {/* Footer */}
      <div className="text-center py-4 border-t mt-8">
        <p className="text-xs text-muted-foreground">
          © 2026 Optimus Vet. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  );
}
