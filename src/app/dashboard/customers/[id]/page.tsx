"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  PawPrint,
  Receipt,
  Edit,
  Upload,
  Loader2,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Animal {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  image: string | null;
  createdAt: string;
}

interface Transaction {
  id: string;
  code: string;
  type: string;
  date: string;
  total: number;
  paidAmount: number;
  status: string;
}

interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  image: string | null;
  balance: number;
  createdAt: string;
  animals: Animal[];
  transactions: Transaction[];
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ["customer", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${params.id}`);
      if (!res.ok) throw new Error("Müşteri yüklenemedi");
      return res.json();
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (base64Image: string | null) => {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });
      if (!res.ok) throw new Error("Resim güncellenemedi");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", params.id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Başarılı",
        description: "Müşteri resmi güncellendi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Resim güncellenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Hata",
        description: "Resim boyutu 5MB'dan küçük olmalıdır",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      uploadImageMutation.mutate(base64);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    if (confirm("Müşteri resmini kaldırmak istediğinize emin misiniz?")) {
      uploadImageMutation.mutate(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Müşteri bulunamadı</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/customers">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Müşterilere Dön
          </Link>
        </Button>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/customers">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/dashboard/customers/${customer.id}/edit`}>
            <Edit className="w-4 h-4 mr-2" />
            Düzenle
          </Link>
        </Button>
      </div>

      {/* Customer Profile */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar with Upload & Remove */}
            <div className="relative group">
              <Avatar className="w-24 h-24">
                <AvatarImage src={customer.image || undefined} alt={customer.name} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-white">
                  {getInitials(customer.name)}
                </AvatarFallback>
              </Avatar>
              
              {/* Upload/Remove Buttons */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                      title="Resim Yükle"
                    >
                      <Upload className="w-4 h-4 text-gray-700" />
                    </button>
                    {customer.image && (
                      <button
                        onClick={handleRemoveImage}
                        className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                        title="Resmi Kaldır"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Customer Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <Badge variant="secondary">{customer.code}</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{customer.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Kayıt: {formatDate(customer.createdAt)}</span>
                </div>
              </div>

              {/* Balance */}
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Bakiye</div>
                <div
                  className={`text-2xl font-bold ${
                    customer.balance > 0
                      ? "text-destructive"
                      : customer.balance < 0
                        ? "text-emerald-600"
                        : ""
                  }`}
                >
                  {customer.balance > 0 ? "+" : ""}
                  {Number(customer.balance || 0).toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  })}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {customer.balance > 0
                    ? "Alacak"
                    : customer.balance < 0
                      ? "Borç"
                      : "Bakiye Sıfır"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Animals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PawPrint className="w-5 h-5" />
            Hayvanlar ({customer.animals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.animals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Henüz hayvan kaydı yok</p>
              <Button asChild className="mt-4" size="sm">
                <Link href={`/dashboard/animals/new?customerId=${customer.id}`}>
                  <PawPrint className="w-4 h-4 mr-2" />
                  Hayvan Ekle
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customer.animals.map((animal) => (
                <Link
                  key={animal.id}
                  href={`/dashboard/animals/${animal.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={animal.image || undefined} alt={animal.name} />
                          <AvatarFallback className="bg-gradient-to-br from-violet-400 to-violet-600 text-white">
                            <PawPrint className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{animal.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {animal.species}
                            {animal.breed && ` • ${animal.breed}`}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Son İşlemler ({customer.transactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Henüz işlem kaydı yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customer.transactions.map((transaction) => (
                <Link
                  key={transaction.id}
                  href={`/dashboard/sales/${transaction.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{transaction.code}</span>
                        <Badge 
                          variant={
                            transaction.type === "SALE" 
                              ? "default" 
                              : transaction.type === "CUSTOMER_PAYMENT"
                                ? "outline"
                                : "secondary"
                          }
                          className={`text-xs ${
                            transaction.type === "SALE" 
                              ? "bg-emerald-500 hover:bg-emerald-600" 
                              : transaction.type === "CUSTOMER_PAYMENT"
                                ? "border-blue-500 text-blue-600"
                                : ""
                          }`}
                        >
                          {transaction.type === "SALE" 
                            ? "Satış" 
                            : transaction.type === "CUSTOMER_PAYMENT"
                              ? "Ödeme"
                              : transaction.type === "TREATMENT"
                                ? "Tedavi"
                                : transaction.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {Number(transaction.total || 0).toLocaleString("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        })}
                      </div>
                      <Badge
                        variant={
                          transaction.status === "PAID"
                            ? "default"
                            : transaction.status === "PARTIAL"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {transaction.status === "PAID"
                          ? "Ödendi"
                          : transaction.status === "PARTIAL"
                            ? "Kısmi"
                            : "Bekliyor"}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}