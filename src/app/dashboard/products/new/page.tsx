"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Package, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductImage } from "@/components/products/product-image";
import { productSchema, type ProductInput } from "@/lib/validations";
import { toast } from "@/hooks/use-toast";

const units = ["Adet", "Kutu", "Şişe", "Ampul", "Litre", "Kg", "Gram", "Paket"];

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      unit: "Adet",
      purchasePrice: 0,
      salePrice: 0,
      vatRate: 0,
      criticalLevel: 0,
      isService: false,
      productCategory: "MEDICINE",
    },
  });

  const isService = watch("isService");
  const productCategory = watch("productCategory");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Dosya boyutu 5MB'dan büyük olamaz",
      });
      return;
    }

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sadece JPG, PNG ve WebP formatları desteklenir",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setValue("image", data.url);
      setImagePreview(data.url);

      toast({
        variant: "success",
        title: "Başarılı",
        description: "Resim yüklendi",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Resim yüklenirken hata oluştu",
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProductInput) => {
    setLoading(true);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: result.error,
        });
        return;
      }

      toast({
        variant: "success",
        title: "Başarılı",
        description: "Ürün başarıyla eklendi",
      });
      router.push("/dashboard/products");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ürün eklenirken bir hata oluştu",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/products">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Yeni Ürün Ekle</h1>
          <p className="text-muted-foreground">
            Ürün veya hizmet bilgilerini girin
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Ürün Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Service Toggle */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <input
                type="checkbox"
                id="isService"
                className="w-5 h-5 rounded"
                {...register("isService")}
              />
              <Label htmlFor="isService" className="cursor-pointer">
                Bu bir hizmettir (stok takibi yapılmaz)
              </Label>
            </div>

            {/* Kategori Seçimi */}
            <div className="space-y-2">
              <Label htmlFor="productCategory" required>
                Kategori
              </Label>
              <Select
                defaultValue="MEDICINE"
                onValueChange={(value) => {
                  setValue("productCategory", value as any);
                  // Hizmet kategorisinde stok takibi otomatik disabled
                  if (value === "SERVICE") {
                    setValue("isService", true);
                  } else {
                    setValue("isService", false);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEDICINE">İlaç</SelectItem>
                  <SelectItem value="SERVICE">Hizmet</SelectItem>
                  <SelectItem value="MEDICAL_SUPPLY">
                    Medikal Malzeme
                  </SelectItem>
                  <SelectItem value="PREMIX">Premix</SelectItem>
                  <SelectItem value="FEED">Yem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resim Yükleme */}
            <div className="space-y-2">
              <Label htmlFor="image">Ürün Resmi</Label>
              <div className="flex flex-col gap-3">
                <Input
                  id="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                {uploading && (
                  <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                )}
                {imagePreview && (
                  <div className="flex justify-center">
                    <ProductImage
                      src={imagePreview}
                      alt="Önizleme"
                      category={productCategory}
                      size="lg"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" required>
                {isService ? "Hizmet Adı" : "Ürün Adı"}
              </Label>
              <Input
                id="name"
                placeholder="Örn: Karma Aşı, Muayene"
                error={errors.name?.message}
                {...register("name")}
              />
            </div>

            {/* Barcode & Category */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Barkod</Label>
                <Input
                  id="barcode"
                  placeholder="Opsiyonel"
                  {...register("barcode")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Birim</Label>
                <Select
                  defaultValue="Adet"
                  onValueChange={(value) => setValue("unit", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Birim seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prices */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Alış Fiyatı (₺)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  error={errors.purchasePrice?.message}
                  {...register("purchasePrice")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salePrice" required>
                  Satış Fiyatı (₺)
                </Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  error={errors.salePrice?.message}
                  {...register("salePrice")}
                />
              </div>
            </div>

            {/* VAT & Critical Level */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vatRate">KDV Oranı (%)</Label>
                <Select
                  defaultValue="0"
                  onValueChange={(value) =>
                    setValue("vatRate", parseFloat(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="KDV seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">%0</SelectItem>
                    <SelectItem value="1">%1</SelectItem>
                    <SelectItem value="10">%10</SelectItem>
                    <SelectItem value="20">%20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!isService && (
                <div className="space-y-2">
                  <Label htmlFor="criticalLevel">Kritik Stok Seviyesi</Label>
                  <Input
                    id="criticalLevel"
                    type="number"
                    min="0"
                    placeholder="0"
                    disabled={productCategory === "SERVICE"}
                    {...register("criticalLevel")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Stok bu seviyenin altına düştüğünde uyarı alırsınız
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                placeholder="Ürün hakkında notlar..."
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
          <Button variant="outline" type="button" asChild>
            <Link href="/dashboard/products">İptal</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              "Kaydediliyor..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Kaydet
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Footer */}
      <div className="text-center py-4 border-t">
        <p className="text-xs text-muted-foreground">
          © 2026 Optimus Vet. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  );
}
