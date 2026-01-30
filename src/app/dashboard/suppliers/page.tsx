"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  balance: number;
  createdAt: string;
  _count: {
    transactions: number;
  };
}

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useQuery<{
    suppliers: Supplier[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["suppliers", search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/suppliers?${params}`);
      if (!res.ok) throw new Error("Tedarikçiler yüklenemedi");
      return res.json();
    },
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Tedarikçiler
          </h1>
          <p className="text-muted-foreground">
            Tedarikçi ve alım işlemlerini yönetin
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/suppliers/new">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Tedarikçi
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tedarikçi ara (ad, telefon, kod)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">
              Toplam Tedarikçi
            </div>
            <div className="text-2xl font-bold">{data.pagination.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Borçlu</div>
            <div className="text-2xl font-bold text-destructive">
              {data.suppliers.filter((s) => s.balance < 0).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Bu Sayfada</div>
            <div className="text-2xl font-bold">{data.suppliers.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Sayfa</div>
            <div className="text-2xl font-bold">
              {data.pagination.page} / {data.pagination.totalPages}
            </div>
          </Card>
        </div>
      )}

      {/* Supplier List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">
            Tedarikçiler yüklenirken hata oluştu
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Tekrar Dene
          </Button>
        </Card>
      ) : data?.suppliers.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Tedarikçi Bulunamadı</h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? "Arama kriterlerine uygun tedarikçi yok"
              : "Henüz tedarikçi eklenmemiş"}
          </p>
          <Button asChild>
            <Link href="/dashboard/suppliers/new">
              <Plus className="w-4 h-4 mr-2" />
              İlk Tedarikçiyi Ekle
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data?.suppliers.map((supplier) => (
            <Link
              key={supplier.id}
              href={`/dashboard/suppliers/${supplier.id}`}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Supplier Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {supplier.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {supplier.code}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        {supplier.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate">{supplier.email}</span>
                          </div>
                        )}
                        {supplier.city && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{supplier.city}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-start gap-4">
                      {/* Transaction Count */}
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-primary">
                          <ShoppingBag className="w-4 h-4" />
                          <span className="font-semibold">
                            {supplier._count.transactions}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          İşlem
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="text-right">
                        <div
                          className={`font-semibold ${
                            supplier.balance < 0
                              ? "text-destructive"
                              : supplier.balance > 0
                                ? "text-emerald-600"
                                : ""
                          }`}
                        >
                          {formatCurrency(Math.abs(supplier.balance))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {supplier.balance < 0
                            ? "Borç"
                            : supplier.balance > 0
                              ? "Alacak"
                              : "Bakiye"}
                        </div>
                      </div>

                      {/* Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.preventDefault()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/suppliers/${supplier.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Detay
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/suppliers/${supplier.id}/edit`}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Düzenle
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/purchases/new?supplierId=${supplier.id}`}
                            >
                              <ShoppingBag className="w-4 h-4 mr-2" />
                              Alım Yap
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => e.preventDefault()}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                    <span>Kayıt: {formatDate(supplier.createdAt)}</span>
                    <span>{supplier._count.transactions} alım</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Toplam {data.pagination.total} tedarikçiden {(page - 1) * limit + 1}
            -{Math.min(page * limit, data.pagination.total)} arası gösteriliyor
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Önceki
            </Button>
            <div className="flex items-center gap-1">
              {Array.from(
                { length: data.pagination.totalPages },
                (_, i) => i + 1,
              )
                .filter((p) => {
                  return (
                    p === 1 ||
                    p === data.pagination.totalPages ||
                    Math.abs(p - page) <= 1
                  );
                })
                .map((p, idx, arr) => (
                  <div key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(p)}
                      className="min-w-[40px]"
                    >
                      {p}
                    </Button>
                  </div>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((p) => Math.min(data.pagination.totalPages, p + 1))
              }
              disabled={page === data.pagination.totalPages}
            >
              Sonraki
            </Button>
          </div>
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
