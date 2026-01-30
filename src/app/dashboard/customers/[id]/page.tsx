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
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementUrl, setStatementUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("transactions");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const handleGenerateStatement = async () => {
    if (!customer) return;

    setIsGeneratingStatement(true);
    try {
      const response = await fetch(`/api/customers/${customer.id}/statement`);
      if (!response.ok) throw new Error("Hesap ekstresi oluşturulamadı");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      setStatementUrl(url);
      setShowStatementModal(true);

      toast({
        title: "Başarılı",
        description: "Hesap ekstresi oluşturuldu",
      });
    } catch (error) {
      console.error("Statement generation error:", error);
      toast({
        title: "Hata",
        description: "Hesap ekstresi oluşturulurken hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingStatement(false);
    }
  };

  const handleCloseStatementModal = () => {
    setShowStatementModal(false);
    if (statementUrl) {
      window.URL.revokeObjectURL(statementUrl);
      setStatementUrl(null);
    }
  };

  const handlePrintStatement = () => {
    if (statementUrl) {
      const printWindow = window.open(statementUrl, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
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
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/animals/new?customerId=${customer.id}`}>
              <PawPrint className="w-4 h-4 mr-2" />
              Hayvan Ekle
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={handleGenerateStatement}
            disabled={isGeneratingStatement || !customer}
            className="bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
          >
            {isGeneratingStatement ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Hesap Ekstresi
          </Button>
          <Button asChild>
            <Link href={`/dashboard/customers/${customer.id}/edit`}>
              <Edit className="w-4 h-4 mr-2" />
              Düzenle
            </Link>
          </Button>
        </div>
      </div>

      {/* Customer Profile */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar with Upload & Remove */}
            <div className="relative group">
              <Avatar className="w-24 h-24">
                <AvatarImage
                  src={customer.image || undefined}
                  alt={customer.name}
                />
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

      {/* Tabs: Animals & Transactions */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            İşlemler ({customer.transactions.length})
          </TabsTrigger>
          <TabsTrigger value="animals" className="flex items-center gap-2">
            <PawPrint className="w-4 h-4" />
            Hayvanlar ({customer.animals.length})
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-6">
          {/* Transactions Table with Pagination */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Tüm İşlemler ({customer.transactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Sort transactions by date (descending)
                const sortedTransactions = [...customer.transactions].sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                );

                // Pagination calculations
                const totalPages = Math.ceil(
                  sortedTransactions.length / itemsPerPage,
                );
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedTransactions = sortedTransactions.slice(
                  startIndex,
                  endIndex,
                );

                const goToPage = (page: number) => {
                  setCurrentPage(Math.max(1, Math.min(page, totalPages)));
                };

                return sortedTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Henüz işlem kaydı yok</p>
                  </div>
                ) : (
                  <>
                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">
                              İşlem Kodu
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">
                              Tarih
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">
                              Tür
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-semibold">
                              Tutar
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">
                              Durum
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">
                              İşlem
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {paginatedTransactions.map((transaction) => (
                            <tr
                              key={transaction.id}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <span className="font-medium">
                                  {transaction.code}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {formatDate(transaction.date)}
                              </td>
                              <td className="px-4 py-3">
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
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                {Number(transaction.total || 0).toLocaleString(
                                  "tr-TR",
                                  {
                                    style: "currency",
                                    currency: "TRY",
                                  },
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
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
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link
                                    href={`/dashboard/sales/${transaction.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Link>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Sayfa {currentPage} / {totalPages} (
                          {sortedTransactions.length} işlem)
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Önceki
                          </Button>

                          {/* Page numbers */}
                          <div className="flex gap-1">
                            {Array.from(
                              { length: Math.min(5, totalPages) },
                              (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }

                                return (
                                  <Button
                                    key={pageNum}
                                    variant={
                                      currentPage === pageNum
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() => goToPage(pageNum)}
                                    className="w-8 h-8 p-0"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              },
                            )}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Sonraki
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Animals Tab */}
        <TabsContent value="animals" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {customer.animals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <PawPrint className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">
                    Henüz hayvan kaydı yok
                  </p>
                  <p className="text-sm mb-4">
                    Bu müşteriye ait hayvan kaydı bulunmuyor
                  </p>
                  <Button asChild size="lg">
                    <Link
                      href={`/dashboard/animals/new?customerId=${customer.id}`}
                    >
                      <PawPrint className="w-4 h-4 mr-2" />
                      İlk Hayvanı Ekle
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
                      <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-16 h-16">
                              <AvatarImage
                                src={animal.image || undefined}
                                alt={animal.name}
                              />
                              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-violet-600 text-white">
                                <PawPrint className="w-8 h-8" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg truncate">
                                {animal.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {animal.species}
                              </p>
                              {animal.breed && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {animal.breed}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                Kayıt: {formatDate(animal.createdAt)}
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
        </TabsContent>
      </Tabs>

      {/* Statement Modal */}
      <Dialog
        open={showStatementModal}
        onOpenChange={handleCloseStatementModal}
      >
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Hesap Ekstresi - {customer.name}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintStatement}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Yazdır
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseStatementModal}
                >
                  Kapat
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {statementUrl && (
              <iframe
                src={statementUrl}
                className="w-full h-full border-0"
                title="Hesap Ekstresi"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
