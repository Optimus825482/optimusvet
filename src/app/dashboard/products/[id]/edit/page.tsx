"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Package, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const productSchema = z.object({
  name: z.string().min(1, "Ürün adı zorunludur"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().min(1, "Birim seçiniz"),
  purchasePrice: z.string().min(1, "Alış fiyatı zorunludur"),
  salePrice: z.string().min(1, "Satış fiyatı zorunludur"),
  vatRate: z.string().min(1, "KDV oranı seçiniz"),
  criticalLevel: z.string().optional(),
  isService: z.boolean().default(false),
  categoryId: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

const unitOptions = [
  { value: "Adet", label: "Adet" },
  { value: "Kutu", label: "Kutu" },
  { value: "Paket", label: "Paket" },
  { value: "Kg", label: "Kilogram" },
  { value: "Lt", label: "Litre" },
  { value: "ml", label: "Mililitre" },
  { value: "Ampul", label: "Ampul" },
  { value: "Flakon", label: "Flakon" },
  { value: "Şişe", label: "Şişe" },
  { value: "Tüp", label: "Tüp" },
];

const vatRates = ["0", "1", "10", "20"];

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const productId = params.id as string;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
  });

  const isService = watch("isService");

  // Fetch product
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Ürün bulunamadı");
      return res.json();
    },
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json();
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (product) {
      reset({
        name: product.name || "",
        barcode: product.barcode || "",
        description: product.description || "",
        unit: product.unit || "Adet",
        purchasePrice: product.purchasePrice?.toString() || "0",
        salePrice: product.salePrice?.toString() || "0",
        vatRate: product.vatRate?.toString() || "20",
        criticalLevel: product.criticalLevel?.toString() || "",
        isService: product.isService || false,
        categoryId: product.categoryId || "NONE",
      });
    }
  }, [product, reset]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload = {
        ...data,
        purchasePrice: parseFloat(data.purchasePrice),
        salePrice: parseFloat(data.salePrice),
        vatRate: parseInt(data.vatRate),
        criticalLevel: data.criticalLevel ? parseInt(data.criticalLevel) : null,
        categoryId:
          data.categoryId && data.categoryId !== "NONE"
            ? data.categoryId
            : null,
      };

      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Güncelleme başarısız");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      router.push(`/dashboard/products/${productId}`);
    },
  });

  const onSubmit = (data: ProductFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-slate-500">Ürün bulunamadı</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ürünlere Dön
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/products/${productId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ürün Düzenle</h1>
          <p className="text-sm text-slate-500">{product.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Product Type Toggle */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setValue("isService", false)}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  !isService
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Package
                  className={`h-5 w-5 ${!isService ? "text-emerald-600" : "text-slate-400"}`}
                />
                <span
                  className={`font-medium ${!isService ? "text-emerald-700" : "text-slate-600"}`}
                >
                  Ürün
                </span>
              </button>
              <button
                type="button"
                onClick={() => setValue("isService", true)}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  isService
                    ? "border-purple-500 bg-purple-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Tag
                  className={`h-5 w-5 ${isService ? "text-purple-600" : "text-slate-400"}`}
                />
                <span
                  className={`font-medium ${isService ? "text-purple-700" : "text-slate-600"}`}
                >
                  Hizmet
                </span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Temel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isService ? "Hizmet Adı" : "Ürün Adı"} *
              </label>
              <Input {...register("name")} placeholder="Örn: Karma Aşı" />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Barkod
                </label>
                <Input {...register("barcode")} placeholder="Barkod numarası" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Birim *
                </label>
                <Controller
                  name="unit"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Birim seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Açıklama
              </label>
              <textarea
                {...register("description")}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                rows={2}
                placeholder="Ürün açıklaması..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fiyatlandırma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Alış Fiyatı (₺) *
                </label>
                <Input
                  {...register("purchasePrice")}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
                {errors.purchasePrice && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.purchasePrice.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Satış Fiyatı (₺) *
                </label>
                <Input
                  {...register("salePrice")}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
                {errors.salePrice && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.salePrice.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  KDV Oranı *
                </label>
                <Controller
                  name="vatRate"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="KDV oranı seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {vatRates.map((rate) => (
                          <SelectItem key={rate} value={rate}>
                            %{rate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Kategori
                </label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || "NONE"}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Kategorisiz</SelectItem>
                        {categories?.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Settings */}
        {!isService && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stok Ayarları</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Kritik Stok Seviyesi
                </label>
                <Input
                  {...register("criticalLevel")}
                  type="number"
                  placeholder="Örn: 10"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Stok bu seviyenin altına düştüğünde uyarı alırsınız.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {updateMutation.isError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {updateMutation.error.message}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            İptal
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Kaydet
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Footer */}
      <footer className="text-center py-4 text-sm text-slate-500 border-t">
        © {new Date().getFullYear()} Optimus Vet. Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
