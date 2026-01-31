"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, User, Save, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { customerSchema, type CustomerInput } from "@/lib/validations";
import { toast } from "@/hooks/use-toast";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      balance: 0,
      name: "",
      phone: "",
      email: "",
      taxNumber: "",
      taxOffice: "",
      address: "",
      city: "",
      district: "",
      notes: "",
    },
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/customers", {
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
        description: "Müşteri başarıyla eklendi",
      });
      router.push("/dashboard/customers");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Müşteri eklenirken bir hata oluştu",
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
          <Link href="/dashboard/customers">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Yeni Müşteri Ekle</h1>
          <p className="text-muted-foreground">Müşteri bilgilerini girin</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Kişisel Bilgiler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" required>
                Ad Soyad
              </Label>
              <Input
                id="name"
                placeholder="Örn: Ahmet Yılmaz"
                error={errors.name?.message}
                {...register("name")}
              />
            </div>

            {/* Phone & Email */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" required>
                  Telefon
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="05XX XXX XX XX"
                  error={errors.phone?.message}
                  {...register("phone")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@mail.com"
                  error={errors.email?.message}
                  {...register("email")}
                />
              </div>
            </div>

            {/* Tax Info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxNumber">Vergi No / TC Kimlik</Label>
                <Input
                  id="taxNumber"
                  placeholder="Opsiyonel"
                  {...register("taxNumber")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxOffice">Vergi Dairesi</Label>
                <Input
                  id="taxOffice"
                  placeholder="Opsiyonel"
                  {...register("taxOffice")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Adres Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                placeholder="Açık adres..."
                {...register("address")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">İl</Label>
                <Input
                  id="city"
                  placeholder="Örn: İstanbul"
                  {...register("city")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">İlçe</Label>
                <Input
                  id="district"
                  placeholder="Örn: Kadıköy"
                  {...register("district")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card>
          <CardHeader>
            <CardTitle>Açılış Bakiyesi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="balance">Bakiye (₺)</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("balance")}
              />
              <p className="text-xs text-muted-foreground">
                Pozitif değer: Müşteriden alacak | Negatif değer: Müşteriye borç
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notlar</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              className="min-h-[100px]"
              placeholder="Müşteri hakkında özel notlar..."
              {...register("notes")}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/dashboard/customers">İptal</Link>
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
