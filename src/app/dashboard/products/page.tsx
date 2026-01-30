"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Package,
  MoreVertical,
  Pencil,
  Trash2,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  purchasePrice: string;
  salePrice: string;
  stock: string;
  criticalLevel: string;
  isService: boolean;
  category?: {
    id: string;
    name: string;
    color?: string;
  };
}

async function fetchProducts(search: string): Promise<{ products: Product[] }> {
  const res = await fetch(`/api/products?search=${encodeURIComponent(search)}`);
  if (!res.ok) throw new Error("Ürünler yüklenemedi");
  return res.json();
}

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["products", debouncedSearch],
    queryFn: () => fetchProducts(debouncedSearch),
  });

  // Simple debounce
  const handleSearch = (value: string) => {
    setSearch(value);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const products = data?.products || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Stok Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Ürün ve hizmetlerinizi yönetin
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Ürün
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="search"
                placeholder="Ürün adı, kodu veya barkod ile ara..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button variant="outline" className="sm:w-auto">
              <Filter className="w-4 h-4 mr-2" />
              Filtrele
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive">Ürünler yüklenirken hata oluştu</p>
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Henüz ürün yok</h3>
            <p className="text-muted-foreground mb-4">
              İlk ürününüzü ekleyerek başlayın
            </p>
            <Button asChild>
              <Link href="/dashboard/products/new">
                <Plus className="w-4 h-4 mr-2" />
                Ürün Ekle
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {products.map((product) => {
            const stock = parseFloat(product.stock);
            const critical = parseFloat(product.criticalLevel);
            const isLowStock = stock <= critical && !product.isService;

            return (
              <Card key={product.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                        isLowStock
                          ? "bg-red-100 dark:bg-red-900/30"
                          : "bg-primary/10"
                      }`}
                    >
                      <Package
                        className={`w-6 h-6 ${
                          isLowStock ? "text-red-500" : "text-primary"
                        }`}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {product.name}
                        </h3>
                        {product.isService && (
                          <Badge variant="secondary" className="text-[10px]">
                            Hizmet
                          </Badge>
                        )}
                        {isLowStock && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Kritik
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{product.code}</span>
                        {product.category && (
                          <Badge variant="outline" className="text-[10px]">
                            {product.category.name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Stok</p>
                        <p
                          className={`font-semibold ${isLowStock ? "text-red-500" : ""}`}
                        >
                          {product.isService ? "-" : `${stock} ${product.unit}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Satış Fiyatı
                        </p>
                        <p className="font-semibold text-primary">
                          {formatCurrency(Number(product.salePrice))}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/products/${product.id}`}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Düzenle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Mobile Stats */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t sm:hidden">
                    <div>
                      <p className="text-xs text-muted-foreground">Stok</p>
                      <p
                        className={`font-semibold ${isLowStock ? "text-red-500" : ""}`}
                      >
                        {product.isService ? "-" : `${stock} ${product.unit}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Satış Fiyatı
                      </p>
                      <p className="font-semibold text-primary">
                        {formatCurrency(Number(product.salePrice))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4 border-t">
        <p className="text-xs text-muted-foreground">
          © 2026 Optimus Vet. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  );
}
