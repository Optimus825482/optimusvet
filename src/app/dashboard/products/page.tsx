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
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductCategoryBadge } from "@/components/products/category-badge";
import { ProductImage } from "@/components/products/product-image";
import { BulkPriceUpdateModal } from "@/components/products/bulk-price-update-modal";
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
  productCategory:
    | "MEDICINE"
    | "SERVICE"
    | "MEDICAL_SUPPLY"
    | "PREMIX"
    | "FEED";
  image?: string | null;
  category?: {
    id: string;
    name: string;
    color?: string;
  };
}

async function fetchProducts(
  search: string,
  category: string,
  stockStatus: string,
): Promise<{ products: Product[] }> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (category && category !== "ALL")
    params.append("productCategory", category);
  if (stockStatus && stockStatus !== "ALL")
    params.append("stockStatus", stockStatus);

  const res = await fetch(`/api/products?${params.toString()}`);
  if (!res.ok) throw new Error("Ürünler yüklenemedi");
  return res.json();
}

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [stockStatus, setStockStatus] = useState("ALL");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["products", debouncedSearch, category, stockStatus],
    queryFn: () => fetchProducts(debouncedSearch, category, stockStatus),
  });

  // Simple debounce
  const handleSearch = (value: string) => {
    setSearch(value);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const products = data?.products || [];

  // Seçili ürünlerin detaylarını al
  const selectedProductsData = products
    .filter((p) => selectedProducts.includes(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      salePrice: Number(p.salePrice),
    }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
            Stok Yönetimi
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Ürün ve hizmetlerinizi yönetin
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dashboard/products/new">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Ürün
          </Link>
        </Button>
      </div>

      {/* Search & Filters - Mobile Optimized */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="flex-1">
              <Input
                type="search"
                placeholder="Ürün adı, kodu veya barkod ile ara..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                className="w-full"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Kategori Filtresi */}
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Tüm Kategoriler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm Kategoriler</SelectItem>
                  <SelectItem value="MEDICINE">İlaç</SelectItem>
                  <SelectItem value="SERVICE">Hizmet</SelectItem>
                  <SelectItem value="MEDICAL_SUPPLY">
                    Medikal Malzeme
                  </SelectItem>
                  <SelectItem value="PREMIX">Premix</SelectItem>
                  <SelectItem value="FEED">Yem</SelectItem>
                </SelectContent>
              </Select>

              {/* Stok Durumu Filtresi */}
              <Select value={stockStatus} onValueChange={setStockStatus}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Stok Durumu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tümü</SelectItem>
                  <SelectItem value="CRITICAL">Kritik</SelectItem>
                  <SelectItem value="LOW">Düşük</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                </SelectContent>
              </Select>

              {/* Temizle Butonu */}
              {(category !== "ALL" || stockStatus !== "ALL") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCategory("ALL");
                    setStockStatus("ALL");
                  }}
                  className="w-full sm:w-auto"
                >
                  Temizle
                </Button>
              )}
            </div>

            {/* Toplu İşlem Butonu */}
            {selectedProducts.length > 0 && (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setBulkModalOpen(true)}
              >
                <Calculator className="w-4 h-4 mr-2" />
                Toplu Fiyat Güncelle ({selectedProducts.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products List - Mobile Optimized */}
      {isLoading ? (
        <div className="grid gap-3 sm:gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
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
          <CardContent className="p-6 sm:p-8 text-center">
            <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-destructive mb-4" />
            <p className="text-sm sm:text-base text-destructive">
              Ürünler yüklenirken hata oluştu
            </p>
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-8 text-center">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              Henüz ürün yok
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              İlk ürününüzü ekleyerek başlayın
            </p>
            <Button asChild className="w-full sm:w-auto">
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
            const isSelected = selectedProducts.includes(product.id);

            return (
              <Card key={product.id} className="group">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedProducts([
                            ...selectedProducts,
                            product.id,
                          ]);
                        } else {
                          setSelectedProducts(
                            selectedProducts.filter((id) => id !== product.id),
                          );
                        }
                      }}
                      className="flex-shrink-0"
                    />

                    {/* Ürün Resmi */}
                    <ProductImage
                      src={product.image}
                      alt={product.name}
                      category={product.productCategory}
                      size="sm"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm sm:text-base truncate">
                          {product.name}
                        </h3>
                        <ProductCategoryBadge
                          category={product.productCategory}
                          size="sm"
                          showIcon={false}
                        />
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
                      <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <span>{product.code}</span>
                        {product.category && (
                          <Badge variant="outline" className="text-[10px]">
                            {product.category.name}
                          </Badge>
                        )}
                      </div>

                      {/* Mobile Stats - Visible only on mobile */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t sm:hidden">
                        <div>
                          <p className="text-xs text-muted-foreground">Stok</p>
                          <p
                            className={`font-semibold text-sm ${isLowStock ? "text-red-500" : ""}`}
                          >
                            {product.isService
                              ? "-"
                              : `${stock} ${product.unit}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            Satış Fiyatı
                          </p>
                          <p className="font-semibold text-sm text-primary">
                            {formatCurrency(Number(product.salePrice))}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Stats - Hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-4 sm:gap-6">
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0"
                        >
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bulk Price Update Modal */}
      <BulkPriceUpdateModal
        selectedProducts={selectedProductsData}
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        onSuccess={() => {
          refetch();
          setSelectedProducts([]);
        }}
      />

      {/* Footer */}
      <div className="text-center py-4 border-t">
        <p className="text-xs text-muted-foreground">
          © 2026 Optimus Vet. Tüm hakları saklıdır.
        </p>
      </div>

      {/* Bulk Price Update Modal */}
      <BulkPriceUpdateModal
        selectedProducts={selectedProductsData}
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        onSuccess={() => {
          refetch();
          setSelectedProducts([]);
        }}
      />
    </div>
  );
}
