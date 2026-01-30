"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  MoreVertical,
  Barcode,
  Tag,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  History,
  Calculator,
  Calendar,
  Layers,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const productId = params.id as string;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch product details
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Ürün bulunamadı");
      return res.json();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Silme başarısız");
      }
    },
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Başarılı",
        description: "Ürün başarıyla silindi.",
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push("/dashboard/products");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Ürün silinirken bir hata oluştu.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-slate-500 font-bold tracking-tight">
          Ürün bulunamadı
        </p>
        <Button
          variant="outline"
          asChild
          className="rounded-xl border-slate-200"
        >
          <Link href="/dashboard/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ürünlere Dön
          </Link>
        </Button>
      </div>
    );
  }

  const isLowStock =
    !product.isService && product.stock <= (product.criticalLevel || 0);
  const profitMargin =
    product.purchasePrice > 0
      ? (
          ((product.salePrice - product.purchasePrice) /
            product.purchasePrice) *
          100
        ).toFixed(1)
      : 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="rounded-xl shadow-sm border-slate-200"
          >
            <Link href="/dashboard/products">
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div
              className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${
                product.isService
                  ? "bg-purple-50 text-purple-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {product.isService ? (
                <Tag className="h-8 w-8" />
              ) : (
                <Package className="h-8 w-8" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase border-slate-200 text-slate-500"
                >
                  {product.code}
                </Badge>
                {product.isService ? (
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-black uppercase bg-purple-100 text-purple-700"
                  >
                    Hizmet
                  </Badge>
                ) : (
                  <Badge
                    variant="default"
                    className="text-[10px] font-black uppercase"
                  >
                    Ürün
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            asChild
            className="rounded-xl shadow-sm bg-white border-slate-200"
          >
            <Link href={`/dashboard/products/${productId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Düzenle
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl shadow-sm bg-white border-slate-200"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-2xl p-2 shadow-xl border-slate-100"
            >
              <DropdownMenuItem
                asChild
                className="rounded-lg py-2 cursor-pointer"
              >
                <Link href={`/dashboard/products/${productId}/movements`}>
                  <History className="h-4 w-4 mr-2 text-primary" />
                  Stok Hareketleri
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-600 rounded-lg py-2 cursor-pointer"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Ürünü Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Low Stock Warning */}
      {isLowStock && (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5 flex items-center gap-4 animate-pulse-subtle">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="font-black text-rose-900 uppercase tracking-wider text-xs">
              Kritik Stok Seviyesi!
            </p>
            <p className="text-sm text-rose-700/80 font-medium">
              Mevcut stok ({product.stock}) kritik seviyenin (
              {product.criticalLevel}) altında. Lütfen tedarik planlayın.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                  SATIŞ FİYATI
                </p>
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">
              {formatCurrency(product.salePrice)}
            </p>
            <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-wider italic">
              KDV DAHİL (%{product.vatRate})
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                  ALIŞ FİYATI
                </p>
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">
              {formatCurrency(product.purchasePrice)}
            </p>
            <p className="text-[10px] font-bold text-orange-600 mt-1 uppercase tracking-wider italic font-mono">
              SON GİRİŞ MALİYETİ
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-slate-900 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center text-primary border border-white/10">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">
                  KÂR MARJI
                </p>
              </div>
            </div>
            <p className="text-3xl font-black text-primary tracking-tighter">
              %{profitMargin}
            </p>
            <p className="text-[10px] font-bold text-white/40 mt-1 uppercase tracking-wider">
              BRÜT KÂR ORANI
            </p>
          </CardContent>
        </Card>

        <Card
          className={`rounded-3xl border-slate-100 shadow-sm overflow-hidden ${isLowStock ? "bg-rose-50 border-rose-100" : ""}`}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`h-10 w-10 rounded-2xl flex items-center justify-center shadow-sm ${
                  isLowStock
                    ? "bg-rose-500 text-white shadow-rose-500/20"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLowStock ? "text-rose-600" : "text-slate-400"}`}
                >
                  STOK DURUMU
                </p>
              </div>
            </div>
            <p
              className={`text-3xl font-black tracking-tighter ${isLowStock ? "text-rose-700" : "text-slate-900"}`}
            >
              {product.isService ? (
                <span className="text-slate-300">N/A</span>
              ) : (
                `${product.stock} ${product.unit}`
              )}
            </p>
            <p
              className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${isLowStock ? "text-rose-500" : "text-slate-400"}`}
            >
              {product.isService
                ? "HİZMET TİPİ"
                : `KRİTİK: ${product.criticalLevel || 0} ${product.unit}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Details Card */}
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/20">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-800">
              <Info className="w-4 h-4 text-primary" />
              Ürün Detayları
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Barkod / EAN
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Barcode className="h-4 w-4 text-slate-300" />
                    <p className="text-sm font-black text-slate-900 font-mono tracking-tight">
                      {product.barcode || "-"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    KDV Oranı
                  </label>
                  <p className="text-sm font-black text-slate-900 mt-0.5">
                    %{product.vatRate}
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Birim
                  </label>
                  <p className="text-sm font-black text-slate-900 mt-0.5 uppercase tracking-wider">
                    {product.unit}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Ürün Tipi
                  </label>
                  <p className="text-sm font-black text-slate-900 mt-0.5">
                    {product.isService
                      ? "Hizmet / Danışmanlık"
                      : "Stoklanabilir Ürün"}
                  </p>
                </div>
              </div>
            </div>

            {product.description && (
              <div className="pt-6 border-t border-slate-50">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Açıklama
                </label>
                <div className="mt-3 p-4 rounded-3xl bg-slate-50 border border-slate-100 text-sm text-slate-700 leading-relaxed italic">
                  {product.description}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category & Classification Card */}
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/20">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-800">
              <Layers className="w-4 h-4 text-emerald-600" />
              Sınıflandırma
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            {product.category ? (
              <div className="flex items-center gap-4 p-5 rounded-3xl bg-slate-50 border border-slate-100 group">
                <div
                  className="h-12 w-12 rounded-2xl shadow-inner group-hover:scale-110 transition-transform flex items-center justify-center text-white font-black"
                  style={{
                    backgroundColor: product.category.color || "#10b981",
                  }}
                >
                  {product.category.name.charAt(0)}
                </div>
                <div>
                  <p className="font-black text-slate-900 tracking-tight text-lg">
                    {product.category.name}
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    {product.category.code}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50/30 rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic tracking-[0.2em]">
                  Kategori atanmamış
                </p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-50 mt-auto">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-4">
                Sistem Kayıtları
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Oluşturulma
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {formatDate(product.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Son Güncelleme
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {formatDate(product.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="text-center py-10 border-t border-slate-100/50 mt-12">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
          OPTIMUS VET STOK YÖNETİM MODÜLÜ v1.0
        </p>
      </footer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 max-w-md">
          <DialogHeader>
            <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8 text-rose-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
              Ürünü Sil
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium py-4">
              <strong className="text-slate-900 underline decoration-rose-500/30">
                {product.name}
              </strong>{" "}
              isimli ürünü silmek istediğinize emin misiniz? Bu işlem geri
              alınamaz ve stok verileri kaybolur.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl border-slate-200 font-bold h-12 flex-1"
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="rounded-xl font-bold h-12 flex-1 shadow-lg shadow-rose-500/20"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Ürünü Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
