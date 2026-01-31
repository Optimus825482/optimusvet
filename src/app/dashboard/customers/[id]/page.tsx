"use client";

import { useState, useRef, useEffect } from "react";
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
  ShoppingCart,
  DollarSign,
  Plus,
  Minus,
  Trash2,
  Package,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    total: number;
    product: {
      name: string;
      code: string;
    };
  }>;
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
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);

  // Satış ve Tahsilat modal state'leri
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [isProcessing, setIsProcessing] = useState(false);

  // Ürün arama ve sepet state'leri
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cart, setCart] = useState<
    Array<{
      productId: string;
      productName: string;
      productCode: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>
  >([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productQuantity, setProductQuantity] = useState("1");
  const [productPrice, setProductPrice] = useState("");
  const [paidAmount, setPaidAmount] = useState("");

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

  const handleRowClick = async (transaction: Transaction) => {
    // Eğer detaylar yoksa API'den çek
    if (!transaction.items && transaction.type === "SALE") {
      try {
        const res = await fetch(`/api/transactions/${transaction.id}`);
        if (res.ok) {
          const fullTransaction = await res.json();
          setSelectedTransaction(fullTransaction);
        } else {
          setSelectedTransaction(transaction);
        }
      } catch (error) {
        console.error("Transaction detail fetch error:", error);
        setSelectedTransaction(transaction);
      }
    } else {
      setSelectedTransaction(transaction);
    }
    setShowTransactionDetail(true);
  };

  // Ürün arama fonksiyonu (debounced)
  const searchProducts = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/products?search=${encodeURIComponent(query)}&isActive=true&limit=5`,
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.products || []);
      }
    } catch (error) {
      console.error("Product search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce için useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(productSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch]);

  // Ürün seçme
  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setProductPrice(product.salePrice.toString());
    setProductQuantity("1");
    setProductSearch("");
    setSearchResults([]);
  };

  // Sepete ürün ekleme
  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const quantity = Number(productQuantity);
    const price = Number(productPrice);

    if (quantity <= 0 || price <= 0) {
      toast({
        title: "Hata",
        description: "Geçerli adet ve fiyat girin",
        variant: "destructive",
      });
      return;
    }

    // Ürün zaten sepette mi kontrol et
    const existingIndex = cart.findIndex(
      (item) => item.productId === selectedProduct.id,
    );

    if (existingIndex >= 0) {
      // Mevcut ürünü güncelle
      const newCart = [...cart];
      newCart[existingIndex] = {
        ...newCart[existingIndex],
        quantity: newCart[existingIndex].quantity + quantity,
        total: (newCart[existingIndex].quantity + quantity) * price,
      };
      setCart(newCart);
    } else {
      // Yeni ürün ekle
      setCart([
        ...cart,
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          productCode: selectedProduct.code,
          quantity,
          unitPrice: price,
          total: quantity * price,
        },
      ]);
    }

    // Reset
    setSelectedProduct(null);
    setProductQuantity("1");
    setProductPrice("");
  };

  // Sepetten ürün çıkarma
  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  // Sepetteki ürün güncelleme
  const handleUpdateCartItem = (
    productId: string,
    field: "quantity" | "unitPrice",
    value: string,
  ) => {
    const numValue = Number(value);
    if (numValue <= 0) return;

    setCart(
      cart.map((item) => {
        if (item.productId === productId) {
          const updated = { ...item, [field]: numValue };
          updated.total = updated.quantity * updated.unitPrice;
          return updated;
        }
        return item;
      }),
    );
  };

  // Toplam hesaplama
  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const remainingBalance = cartTotal - (paidAmount ? Number(paidAmount) : 0);

  const handleSale = async () => {
    if (!customer) return;

    // Sepet boşsa hata ver
    if (cart.length === 0) {
      toast({
        title: "Hata",
        description: "Sepete en az bir ürün ekleyin",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Sepetteki ürünlerden transaction oluştur
      const total = cart.reduce((sum, item) => sum + item.total, 0);
      const paid = paidAmount ? Number(paidAmount) : 0;

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SALE",
          customerId: customer.id,
          date: new Date().toISOString(),
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatRate: 0,
            discount: 0,
          })),
          total,
          subtotal: total,
          vatTotal: 0,
          discount: 0,
          paidAmount: paid,
          status: paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING",
          paymentMethod: "CASH",
          notes: "Satış",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Sale error response:", errorData);
        throw new Error(errorData.error || "Satış oluşturulamadı");
      }

      toast({
        title: "Başarılı",
        description: `₺${total.toLocaleString("tr-TR")} tutarında satış oluşturuldu`,
      });

      queryClient.invalidateQueries({ queryKey: ["customer", params.id] });
      setShowSaleModal(false);
      // Reset states
      setCart([]);
      setProductSearch("");
      setSearchResults([]);
      setSelectedProduct(null);
      setProductQuantity("1");
      setProductPrice("");
      setPaidAmount("");
    } catch (error) {
      console.error("Sale error:", error);
      toast({
        title: "Hata",
        description: "Satış oluşturulurken hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!customer) return;

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast({
        title: "Hata",
        description: "Geçerli bir tutar girin",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          type: "CUSTOMER_PAYMENT",
          total: Number(paymentAmount),
          paidAmount: 0,
          status: "PENDING",
          paymentMethod: paymentMethod,
        }),
      });

      if (!res.ok) throw new Error("Tahsilat oluşturulamadı");

      toast({
        title: "Başarılı",
        description: `₺${Number(paymentAmount).toLocaleString("tr-TR")} tutarında tahsilat kaydedildi`,
      });

      queryClient.invalidateQueries({ queryKey: ["customer", params.id] });
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentMethod("CASH");
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Hata",
        description: "Tahsilat kaydedilirken hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/customers">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Link>
          </Button>
        </div>

        {/* Action Buttons - Mobile Optimized */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSaleModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            <span className="text-sm">Satış</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowPaymentModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            <span className="text-sm">Tahsilat</span>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/animals/new?customerId=${customer.id}`}>
              <PawPrint className="w-4 h-4 mr-2" />
              <span className="text-sm">Hayvan</span>
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
            <span className="text-sm">Ekstre</span>
          </Button>
          <Button asChild className="col-span-2 sm:col-span-1">
            <Link href={`/dashboard/customers/${customer.id}/edit`}>
              <Edit className="w-4 h-4 mr-2" />
              <span className="text-sm">Düzenle</span>
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
                              onClick={() => handleRowClick(transaction)}
                              className="hover:bg-muted/30 transition-colors cursor-pointer"
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowClick(transaction);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
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

      {/* Transaction Detail Modal */}
      <Dialog
        open={showTransactionDetail}
        onOpenChange={setShowTransactionDetail}
      >
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Receipt className="w-5 h-5" />
              İşlem Detayı
            </DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              {/* Transaction Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                    İşlem Kodu
                  </div>
                  <div className="font-semibold text-sm sm:text-base">
                    {selectedTransaction.code}
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                    Tarih
                  </div>
                  <div className="font-semibold text-sm sm:text-base">
                    {formatDate(selectedTransaction.date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                    Tür
                  </div>
                  <Badge
                    variant={
                      selectedTransaction.type === "SALE"
                        ? "default"
                        : selectedTransaction.type === "CUSTOMER_PAYMENT"
                          ? "outline"
                          : "secondary"
                    }
                    className={`text-xs ${
                      selectedTransaction.type === "SALE"
                        ? "bg-emerald-500 hover:bg-emerald-600"
                        : selectedTransaction.type === "CUSTOMER_PAYMENT"
                          ? "border-blue-500 text-blue-600"
                          : ""
                    }`}
                  >
                    {selectedTransaction.type === "SALE"
                      ? "Satış"
                      : selectedTransaction.type === "CUSTOMER_PAYMENT"
                        ? "Ödeme"
                        : selectedTransaction.type === "TREATMENT"
                          ? "Tedavi"
                          : selectedTransaction.type}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                    Durum
                  </div>
                  <Badge
                    variant={
                      selectedTransaction.status === "PAID"
                        ? "default"
                        : selectedTransaction.status === "PARTIAL"
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    {selectedTransaction.status === "PAID"
                      ? "Ödendi"
                      : selectedTransaction.status === "PARTIAL"
                        ? "Kısmi Ödendi"
                        : "Bekliyor"}
                  </Badge>
                </div>
              </div>

              {/* Sale Items */}
              {selectedTransaction.type === "SALE" &&
                selectedTransaction.items &&
                selectedTransaction.items.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      Satış Kalemleri
                    </h3>

                    {/* Desktop Table - Hidden on Mobile */}
                    <div className="hidden sm:block border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold">
                              Ürün
                            </th>
                            <th className="px-4 py-2 text-center text-sm font-semibold">
                              Adet
                            </th>
                            <th className="px-4 py-2 text-right text-sm font-semibold">
                              Birim Fiyat
                            </th>
                            <th className="px-4 py-2 text-right text-sm font-semibold">
                              Toplam
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedTransaction.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-2">
                                <div className="font-medium">
                                  {item.product.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {item.product.code}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-center">
                                {Number(item.quantity)}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {Number(item.unitPrice).toLocaleString(
                                  "tr-TR",
                                  {
                                    style: "currency",
                                    currency: "TRY",
                                  },
                                )}
                              </td>
                              <td className="px-4 py-2 text-right font-semibold">
                                {Number(item.total).toLocaleString("tr-TR", {
                                  style: "currency",
                                  currency: "TRY",
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card Layout - Hidden on Desktop */}
                    <div className="sm:hidden space-y-3">
                      {selectedTransaction.items.map((item) => (
                        <Card key={item.id} className="border-2">
                          <CardContent className="p-3 space-y-2">
                            {/* Ürün Bilgisi */}
                            <div>
                              <div className="font-semibold text-sm">
                                {item.product.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.product.code}
                              </div>
                            </div>

                            {/* Adet ve Fiyat */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Adet
                                </div>
                                <div className="font-medium">
                                  {Number(item.quantity)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">
                                  Birim Fiyat
                                </div>
                                <div className="font-medium">
                                  {Number(item.unitPrice).toLocaleString(
                                    "tr-TR",
                                    {
                                      style: "currency",
                                      currency: "TRY",
                                    },
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Toplam */}
                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-xs font-medium text-muted-foreground">
                                Toplam:
                              </span>
                              <span className="text-base font-bold text-emerald-600">
                                {Number(item.total).toLocaleString("tr-TR", {
                                  style: "currency",
                                  currency: "TRY",
                                })}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

              {/* Payment Info */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-muted-foreground">
                    Toplam Tutar:
                  </span>
                  <span className="text-lg sm:text-xl font-bold">
                    {Number(selectedTransaction.total || 0).toLocaleString(
                      "tr-TR",
                      {
                        style: "currency",
                        currency: "TRY",
                      },
                    )}
                  </span>
                </div>
                {selectedTransaction.type === "SALE" && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm sm:text-base text-muted-foreground">
                        Ödenen Tutar:
                      </span>
                      <span className="text-base sm:text-lg font-semibold text-emerald-600">
                        {Number(
                          selectedTransaction.paidAmount || 0,
                        ).toLocaleString("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm sm:text-base text-muted-foreground">
                        Kalan Borç:
                      </span>
                      <span className="text-base sm:text-lg font-semibold text-destructive">
                        {(
                          Number(selectedTransaction.total || 0) -
                          Number(selectedTransaction.paidAmount || 0)
                        ).toLocaleString("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        })}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowTransactionDetail(false)}
                  className="w-full sm:w-auto"
                >
                  Kapat
                </Button>
                <Button asChild className="w-full sm:w-auto">
                  <Link href={`/dashboard/sales/${selectedTransaction.id}`}>
                    Detaylı Görünüm
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Satış Modal */}
      <Dialog open={showSaleModal} onOpenChange={setShowSaleModal}>
        <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ShoppingCart className="w-5 h-5 text-emerald-500" />
              Satış Yap - {customer.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Ürün Arama */}
            <div className="space-y-2">
              <Label>Ürün Ara</Label>
              <div className="relative">
                <Input
                  placeholder="Ürün adı veya kodu ile ara (en az 2 karakter)..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full"
                />

                {/* Arama Sonuçları Dropdown */}
                {productSearch.length >= 2 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                    {isSearching ? (
                      <div className="py-6 text-center text-sm">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Ürün bulunamadı
                      </div>
                    ) : (
                      <div className="py-2">
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
                          Ürünler ({searchResults.length})
                        </div>
                        {searchResults.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => handleSelectProduct(product)}
                            className="w-full px-3 py-3 text-left hover:bg-muted transition-colors border-b last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {product.name}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Kod: {product.code} | Stok: {product.stock}
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className="font-semibold text-emerald-600">
                                  ₺{product.salePrice.toLocaleString("tr-TR")}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {productSearch.length > 0 && productSearch.length < 2 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg">
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      En az 2 karakter girin
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seçili Ürün Ekleme Formu */}
            {selectedProduct && (
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base sm:text-lg truncate">
                          {selectedProduct.name}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                          {selectedProduct.code} | Stok: {selectedProduct.stock}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProduct(null)}
                        className="flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label
                          htmlFor="productQuantity"
                          className="text-xs sm:text-sm"
                        >
                          Adet
                        </Label>
                        <Input
                          id="productQuantity"
                          type="number"
                          min="1"
                          value={productQuantity}
                          onChange={(e) => setProductQuantity(e.target.value)}
                          className="text-center h-10 sm:h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="productPrice"
                          className="text-xs sm:text-sm"
                        >
                          Birim Fiyat (₺)
                        </Label>
                        <Input
                          id="productPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          value={productPrice}
                          onChange={(e) => setProductPrice(e.target.value)}
                          className="text-right h-10 sm:h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs sm:text-sm">Toplam</Label>
                        <div className="h-10 flex items-center justify-center px-2 bg-muted rounded-md font-semibold text-sm">
                          ₺
                          {(
                            Number(productQuantity) * Number(productPrice)
                          ).toLocaleString("tr-TR")}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleAddToCart}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 h-11"
                      disabled={
                        !productQuantity ||
                        !productPrice ||
                        Number(productQuantity) <= 0 ||
                        Number(productPrice) <= 0
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Sepete Ekle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sepet */}
            {cart.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">
                    Sepet ({cart.length} ürün)
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCart([])}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Sepeti Temizle
                  </Button>
                </div>

                {/* Mobil: Card Layout, Desktop: Table */}
                <div className="space-y-3">
                  {/* Desktop Table - Hidden on Mobile */}
                  <div className="hidden sm:block border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-semibold">
                            Ürün
                          </th>
                          <th className="px-4 py-2 text-center text-sm font-semibold w-32">
                            Adet
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold w-32">
                            Birim Fiyat
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold w-32">
                            Toplam
                          </th>
                          <th className="px-4 py-2 text-center text-sm font-semibold w-16">
                            İşlem
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {cart.map((item) => (
                          <tr key={item.productId}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm">
                                {item.productName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.productCode}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateCartItem(
                                    item.productId,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                className="text-center text-sm h-10"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleUpdateCartItem(
                                    item.productId,
                                    "unitPrice",
                                    e.target.value,
                                  )
                                }
                                className="text-right text-sm h-10"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-sm">
                              ₺{item.total.toLocaleString("tr-TR")}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRemoveFromCart(item.productId)
                                }
                                className="text-destructive hover:text-destructive h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card Layout - Hidden on Desktop */}
                  <div className="sm:hidden space-y-3">
                    {cart.map((item) => (
                      <Card key={item.productId} className="border-2">
                        <CardContent className="p-3 space-y-3">
                          {/* Ürün Bilgisi */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">
                                {item.productName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.productCode}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveFromCart(item.productId)
                              }
                              className="text-destructive hover:text-destructive h-8 w-8 p-0 flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Adet ve Fiyat */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Adet</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateCartItem(
                                    item.productId,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                className="text-center text-sm h-9"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Birim Fiyat</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleUpdateCartItem(
                                    item.productId,
                                    "unitPrice",
                                    e.target.value,
                                  )
                                }
                                className="text-right text-sm h-9"
                              />
                            </div>
                          </div>

                          {/* Toplam */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs font-medium text-muted-foreground">
                              Toplam:
                            </span>
                            <span className="text-base font-bold text-emerald-600">
                              ₺{item.total.toLocaleString("tr-TR")}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Toplam ve Ödeme */}
                <div className="space-y-3">
                  {/* Toplam Tutar - Daha Belirgin */}
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-base sm:text-lg font-semibold text-emerald-900">
                        Toplam Tutar:
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-emerald-600">
                        ₺{cartTotal.toLocaleString("tr-TR")}
                      </span>
                    </div>
                  </div>

                  {/* Ödenen Tutar */}
                  <div className="space-y-2">
                    <Label htmlFor="paidAmount" className="text-sm font-medium">
                      Ödenen Tutar (₺) - Opsiyonel
                    </Label>
                    <Input
                      id="paidAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="h-12 text-base"
                    />
                    {paidAmount && Number(paidAmount) > 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-700">
                            Kalan Borç:
                          </span>
                          <span className="text-base font-bold text-blue-600">
                            ₺
                            {Math.max(0, remainingBalance).toLocaleString(
                              "tr-TR",
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Boş Sepet Mesajı */}
            {cart.length === 0 && !selectedProduct && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2">Sepet Boş</p>
                <p className="text-sm">
                  Satış yapmak için yukarıdan ürün arayın ve sepete ekleyin
                </p>
              </div>
            )}

            {/* Action Buttons - Mobil Optimized */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaleModal(false);
                  setCart([]);
                  setProductSearch("");
                  setSearchResults([]);
                  setSelectedProduct(null);
                  setProductQuantity("1");
                  setProductPrice("");
                  setPaidAmount("");
                }}
                className="flex-1 h-11"
                disabled={isProcessing}
              >
                İptal
              </Button>
              <Button
                onClick={handleSale}
                className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 text-base font-semibold"
                disabled={isProcessing || cart.length === 0}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Satışı Tamamla (₺{cartTotal.toLocaleString("tr-TR")})
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tahsilat Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              Tahsilat Yap - {customer.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Tahsilat Tutarı (₺)</Label>
              <Input
                id="paymentAmount"
                type="number"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Ödeme Türü</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Ödeme türü seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Nakit</SelectItem>
                  <SelectItem value="CREDIT_CARD">Kredi Kartı</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Banka Transferi</SelectItem>
                  <SelectItem value="CHECK">Çek</SelectItem>
                  <SelectItem value="PROMISSORY">Senet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">
                Mevcut Bakiye
              </div>
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
            </div>
            {paymentAmount && Number(paymentAmount) > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-700 mb-1">
                  Yeni Bakiye (Tahmini)
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {Number(customer.balance) - Number(paymentAmount) > 0
                    ? "+"
                    : ""}
                  {(
                    Number(customer.balance) - Number(paymentAmount)
                  ).toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  })}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentAmount("");
                  setPaymentMethod("CASH");
                }}
                className="flex-1"
                disabled={isProcessing}
              >
                İptal
              </Button>
              <Button
                onClick={handlePayment}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
                disabled={
                  isProcessing || !paymentAmount || Number(paymentAmount) <= 0
                }
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Tahsilat Yap
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
