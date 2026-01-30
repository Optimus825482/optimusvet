"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  PawPrint,
  Loader2,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";

interface Customer {
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
    animals: number;
    transactions: number;
  };
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useQuery<{
    customers: Customer[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["customers", search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) throw new Error("Müşteriler yüklenemedi");
      return res.json();
    },
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Müşteriler
          </h1>
          <p className="text-muted-foreground">
            Müşteri ve hasta sahiplerini yönetin
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/customers/new">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Müşteri
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Müşteri ara (ad, telefon, kod)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to page 1 on search
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Toplam Müşteri</div>
            <div className="text-2xl font-bold">{data.pagination.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">
              Alacaklı Müşteri
            </div>
            <div className="text-2xl font-bold text-destructive">
              {data.customers.filter((c) => c.balance > 0).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Bu Sayfada</div>
            <div className="text-2xl font-bold">{data.customers.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Sayfa</div>
            <div className="text-2xl font-bold">
              {data.pagination.page} / {data.pagination.totalPages}
            </div>
          </Card>
        </div>
      )}

      {/* Customer List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">Müşteriler yüklenirken hata oluştu</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Tekrar Dene
          </Button>
        </Card>
      ) : data?.customers.length === 0 ? (
        <Card className="p-8 text-center">
          <UserX className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Müşteri Bulunamadı</h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? "Arama kriterlerine uygun müşteri yok"
              : "Henüz müşteri eklenmemiş"}
          </p>
          <Button asChild>
            <Link href="/dashboard/customers/new">
              <Plus className="w-4 h-4 mr-2" />
              İlk Müşteriyi Ekle
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data?.customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/dashboard/customers/${customer.id}`}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {customer.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {customer.code}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {customer.city && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{customer.city}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-start gap-4">
                      {/* Animal Count */}
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-primary">
                          <PawPrint className="w-4 h-4" />
                          <span className="font-semibold">
                            {customer._count.animals}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Hayvan
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="text-right">
                        <div
                          className={`font-semibold ${
                            customer.balance > 0
                              ? "text-destructive"
                              : customer.balance < 0
                                ? "text-emerald-600"
                                : ""
                          }`}
                        >
                          {customer.balance > 0 ? "+" : ""}
                          {Number(customer.balance || 0).toLocaleString(
                            "tr-TR",
                            {
                              style: "currency",
                              currency: "TRY",
                            },
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {customer.balance > 0
                            ? "Alacak"
                            : customer.balance < 0
                              ? "Borç"
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
                            <Link href={`/dashboard/customers/${customer.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Detay
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/customers/${customer.id}/edit`}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Düzenle
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/animals/new?customerId=${customer.id}`}
                            >
                              <PawPrint className="w-4 h-4 mr-2" />
                              Hayvan Ekle
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
                    <span>Kayıt: {formatDate(customer.createdAt)}</span>
                    <span>{customer._count.transactions} işlem</span>
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
            Toplam {data.pagination.total} müşteriden {(page - 1) * limit + 1}-
            {Math.min(page * limit, data.pagination.total)} arası gösteriliyor
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
                  // Show first, last, current, and adjacent pages
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
