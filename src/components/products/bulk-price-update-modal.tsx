"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown } from "lucide-react";

const bulkPriceUpdateSchema = z.object({
  productIds: z.array(z.string()).min(1, "En az bir ürün seçilmelidir"),
  updateType: z.enum(["PERCENTAGE", "FIXED", "SET_PRICE"]),
  value: z.number(),
  reason: z.string().min(1, "Sebep zorunludur"),
});

type BulkPriceUpdateInput = z.infer<typeof bulkPriceUpdateSchema>;

interface Product {
  id: string;
  name: string;
  salePrice: number;
}

interface BulkPriceUpdateModalProps {
  selectedProducts: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkPriceUpdateModal({
  selectedProducts,
  open,
  onOpenChange,
  onSuccess,
}: BulkPriceUpdateModalProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<BulkPriceUpdateInput>({
    resolver: zodResolver(bulkPriceUpdateSchema),
    defaultValues: {
      productIds: selectedProducts.map((p) => p.id),
      updateType: "PERCENTAGE",
      value: 0,
      reason: "",
    },
  });

  const updateType = watch("updateType");
  const value = watch("value") || 0;

  // Calculate preview
  const preview = selectedProducts.map((product) => {
    let newPrice = product.salePrice;

    switch (updateType) {
      case "PERCENTAGE":
        newPrice = product.salePrice * (1 + value / 100);
        break;
      case "FIXED":
        newPrice = product.salePrice + value;
        break;
      case "SET_PRICE":
        newPrice = value;
        break;
    }

    newPrice = Math.max(0, Math.round(newPrice * 100) / 100);

    return {
      ...product,
      newPrice,
      change: newPrice - product.salePrice,
      changePercent: ((newPrice - product.salePrice) / product.salePrice) * 100,
    };
  });

  const onSubmit = async (data: BulkPriceUpdateInput) => {
    setLoading(true);
    try {
      const response = await fetch("/api/products/bulk-price-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          productIds: selectedProducts.map((p) => p.id),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: result.error || "Güncelleme başarısız",
        });
        return;
      }

      toast({
        variant: "success",
        title: "Başarılı",
        description: `${result.updated} ürün güncellendi`,
      });

      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Güncelleme sırasında hata oluştu",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Toplu Fiyat Güncelleme</DialogTitle>
          <DialogDescription>
            {selectedProducts.length} ürünün fiyatını güncelleyin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Update Type */}
          <div className="space-y-2">
            <Label>Güncelleme Türü</Label>
            <Select
              defaultValue="PERCENTAGE"
              onValueChange={(value) => setValue("updateType", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">
                  📊 Yüzde Artış/Azalış
                </SelectItem>
                <SelectItem value="FIXED">
                  💰 Sabit Tutar Artış/Azalış
                </SelectItem>
                <SelectItem value="SET_PRICE">🏷️ Yeni Fiyat Belirle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label>
              {updateType === "PERCENTAGE" && "Yüzde (%)"}
              {updateType === "FIXED" && "Tutar (₺)"}
              {updateType === "SET_PRICE" && "Yeni Fiyat (₺)"}
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0"
              {...register("value")}
            />
            {errors.value && (
              <p className="text-sm text-red-500">{errors.value.message}</p>
            )}
            {updateType === "PERCENTAGE" && (
              <p className="text-xs text-muted-foreground">
                Pozitif değer artış, negatif değer azalış anlamına gelir
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Sebep</Label>
            <Textarea
              placeholder="Fiyat değişikliği sebebi..."
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-sm text-red-500">{errors.reason.message}</p>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Önizleme</Label>
            <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-semibold">Ürün</th>
                    <th className="text-right p-2 font-semibold">Eski Fiyat</th>
                    <th className="text-right p-2 font-semibold">Yeni Fiyat</th>
                    <th className="text-right p-2 font-semibold">Değişim</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((item) => (
                    <tr key={item.id} className="border-t hover:bg-slate-50">
                      <td className="p-2 max-w-[200px] truncate">
                        {item.name}
                      </td>
                      <td className="text-right p-2 text-muted-foreground">
                        ₺{item.salePrice.toFixed(2)}
                      </td>
                      <td className="text-right p-2 font-semibold">
                        ₺{item.newPrice.toFixed(2)}
                      </td>
                      <td className="text-right p-2">
                        <div className="flex items-center justify-end gap-1">
                          {item.change > 0 ? (
                            <TrendingUp className="w-3 h-3 text-red-500" />
                          ) : item.change < 0 ? (
                            <TrendingDown className="w-3 h-3 text-green-500" />
                          ) : null}
                          <span
                            className={`font-semibold ${
                              item.change > 0
                                ? "text-red-600"
                                : item.change < 0
                                  ? "text-green-600"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {item.change > 0 ? "+" : ""}₺
                            {item.change.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({item.changePercent > 0 ? "+" : ""}
                            {item.changePercent.toFixed(1)}%)
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Toplam Ürün</p>
                <p className="font-semibold text-lg">
                  {selectedProducts.length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Ortalama Değişim</p>
                <p className="font-semibold text-lg">
                  {(
                    preview.reduce((sum, p) => sum + p.changePercent, 0) /
                    preview.length
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Güncelleniyor..." : "Uygula"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
