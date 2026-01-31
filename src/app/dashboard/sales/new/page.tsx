"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ShoppingCart,
  Save,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  PawPrint,
  Calculator,
  CreditCard,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  code: string;
  name: string;
  salePrice: number;
  vatRate: number;
  stock: number;
  unit: string;
  isService: boolean;
}

interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  balance: number;
}

interface Animal {
  id: string;
  name: string;
  species: string;
  breed: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedCustomerId = searchParams.get("customerId");

  const [loading, setLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Müşteri seçim modal'ı için state
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Fetch customers
  const { data: customersData } = useQuery<{ customers: Customer[] }>({
    queryKey: ["customers-search", customerSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (customerSearch) params.set("search", customerSearch);
      params.set("limit", "10");
      const res = await fetch(`/api/customers?${params}`);
      return res.json();
    },
    enabled: customerSearch.length > 0,
  });

  // Fetch animals of selected customer
  const { data: animalsData } = useQuery<{ animals: Animal[] }>({
    queryKey: ["animals-customer", selectedCustomer?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/animals?customerId=${selectedCustomer?.id}&limit=50`,
      );
      return res.json();
    },
    enabled: !!selectedCustomer,
  });

  // Fetch products
  const { data: productsData } = useQuery<{ products: Product[] }>({
    queryKey: ["products-search", productSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (productSearch) params.set("search", productSearch);
      params.set("limit", "20");
      const res = await fetch(`/api/products?${params}`);
      return res.json();
    },
    enabled: productSearch.length > 0,
  });

  // Calculate totals
  const totals = useMemo(() => {
    let subTotal = 0;
    let vatTotal = 0;

    cart.forEach((item) => {
      const lineTotal = item.product.salePrice * item.quantity;
      const lineDiscount = (lineTotal * item.discount) / 100;
      const lineNet = lineTotal - lineDiscount;
      const lineVat = (lineNet * item.product.vatRate) / 100;

      subTotal += lineNet;
      vatTotal += lineVat;
    });

    const discountAmount = (subTotal * globalDiscount) / 100;
    const grandTotal = subTotal - discountAmount + vatTotal;

    return {
      subTotal,
      discountAmount,
      vatTotal,
      grandTotal,
    };
  }, [cart, globalDiscount]);

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);

    if (existing) {
      // Check stock for non-service items
      if (!product.isService && existing.quantity >= product.stock) {
        toast({
          variant: "destructive",
          title: "Stok Yetersiz",
          description: `${product.name} için maksimum stok: ${product.stock}`,
        });
        return;
      }
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      if (!product.isService && product.stock < 1) {
        toast({
          variant: "destructive",
          title: "Stok Yok",
          description: `${product.name} stokta bulunmuyor`,
        });
        return;
      }
      setCart([...cart, { product, quantity: 1, discount: 0 }]);
    }
    setProductSearch("");
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.product.id !== productId) return item;

          const newQuantity = item.quantity + delta;

          if (newQuantity < 1) return null as any;

          if (!item.product.isService && newQuantity > item.product.stock) {
            toast({
              variant: "destructive",
              title: "Stok Yetersiz",
            });
            return item;
          }

          return { ...item, quantity: newQuantity };
        })
        .filter(Boolean),
    );
  };

  const updateItemDiscount = (productId: string, discount: number) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId
          ? { ...item, discount: Math.min(100, Math.max(0, discount)) }
          : item,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sepet boş olamaz",
      });
      return;
    }

    setLoading(true);
    try {
      const items = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.salePrice,
        vatRate: item.product.vatRate,
        discount:
          (item.product.salePrice * item.quantity * item.discount) / 100,
      }));

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SALE",
          customerId: selectedCustomer?.id,
          animalId: selectedAnimal?.id,
          items,
          discount: totals.discountAmount,
          paidAmount: parseFloat(paidAmount) || 0,
          paymentMethod,
          notes,
        }),
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
        description: "Satış başarıyla kaydedildi",
      });
      router.push(`/dashboard/sales/${result.id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Satış kaydedilirken bir hata oluştu",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/sales">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Yeni Satış</h1>
          <p className="text-muted-foreground">
            Ürün ve hizmet satışı oluşturun
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Customer & Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Müşteri (Opsiyonel)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCustomer ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div>
                      <div className="font-semibold">
                        {selectedCustomer.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedCustomer.phone} • Bakiye:{" "}
                        <span
                          className={
                            selectedCustomer.balance > 0
                              ? "text-destructive"
                              : "text-emerald-600"
                          }
                        >
                          {formatCurrency(selectedCustomer.balance)}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setSelectedAnimal(null);
                      }}
                    >
                      Değiştir
                    </Button>
                  </div>

                  {/* Animal Selection */}
                  {animalsData?.animals && animalsData.animals.length > 0 && (
                    <div className="space-y-2">
                      <Label>Hayvan (Opsiyonel)</Label>
                      <Select
                        value={selectedAnimal?.id || ""}
                        onValueChange={(id) => {
                          const animal = animalsData.animals.find(
                            (a) => a.id === id,
                          );
                          setSelectedAnimal(animal || null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Hayvan seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {animalsData.animals.map((animal) => (
                            <SelectItem key={animal.id} value={animal.id}>
                              <div className="flex items-center gap-2">
                                <PawPrint className="w-4 h-4" />
                                {animal.name} - {animal.breed || animal.species}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCustomerModal(true)}
                >
                  <User className="w-4 h-4 mr-2" />
                  Müşteri Seç
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Product Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Ürün/Hizmet Ekle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Ürün veya hizmet ara..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
                {productSearch && productsData?.products && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-xl shadow-lg max-h-80 overflow-auto">
                    {productsData.products.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Ürün bulunamadı
                      </div>
                    ) : (
                      productsData.products.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="w-full p-3 text-left border-b last:border-0"
                          onClick={() => addToCart(product)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {product.code} •{" "}
                                {product.isService
                                  ? "Hizmet"
                                  : `Stok: ${product.stock} ${product.unit}`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-primary">
                                {formatCurrency(product.salePrice)}
                              </div>
                              {product.vatRate > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  +%{product.vatRate} KDV
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle>Sepet ({cart.length} kalem)</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Sepet boş</p>
                  <p className="text-sm">Ürün eklemek için yukarıdan arayın</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const lineTotal = item.product.salePrice * item.quantity;
                    const lineDiscount = (lineTotal * item.discount) / 100;
                    const lineNet = lineTotal - lineDiscount;

                    return (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                      >
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {item.product.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(item.product.salePrice)} /{" "}
                            {item.product.unit}
                          </div>
                        </div>

                        {/* Quantity */}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Line Discount */}
                        <div className="w-20">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) =>
                              updateItemDiscount(
                                item.product.id,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="h-8 text-center text-sm"
                            placeholder="%"
                          />
                        </div>

                        {/* Line Total */}
                        <div className="w-24 text-right font-semibold">
                          {formatCurrency(lineNet)}
                        </div>

                        {/* Remove */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary & Payment */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Özet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ara Toplam</span>
                  <span>{formatCurrency(totals.subTotal)}</span>
                </div>

                {/* Global Discount */}
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm">İndirim (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={globalDiscount}
                    onChange={(e) =>
                      setGlobalDiscount(parseFloat(e.target.value) || 0)
                    }
                    className="w-20 h-8 text-center"
                  />
                </div>

                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>İndirim</span>
                    <span>-{formatCurrency(totals.discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">KDV</span>
                  <span>{formatCurrency(totals.vatTotal)}</span>
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Genel Toplam</span>
                    <span className="text-primary">
                      {formatCurrency(totals.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Ödeme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ödeme Yöntemi</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "CASH", label: "Nakit", icon: Banknote },
                    { value: "CREDIT_CARD", label: "Kart", icon: CreditCard },
                  ].map((method) => (
                    <Button
                      key={method.value}
                      type="button"
                      variant={
                        paymentMethod === method.value ? "default" : "outline"
                      }
                      className="justify-start"
                      onClick={() => setPaymentMethod(method.value)}
                    >
                      <method.icon className="w-4 h-4 mr-2" />
                      {method.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ödenen Tutar</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={formatCurrency(totals.grandTotal)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setPaidAmount(totals.grandTotal.toString())}
                  >
                    Tam Ödeme
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setPaidAmount("0")}
                  >
                    Veresiye
                  </Button>
                </div>
              </div>

              {parseFloat(paidAmount) > 0 &&
                parseFloat(paidAmount) < totals.grandTotal && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
                    Kalan:{" "}
                    {formatCurrency(totals.grandTotal - parseFloat(paidAmount))}{" "}
                    veresiye kalacak
                  </div>
                )}

              {parseFloat(paidAmount) > totals.grandTotal && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 text-sm">
                  Para Üstü:{" "}
                  {formatCurrency(parseFloat(paidAmount) - totals.grandTotal)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notlar</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex min-h-[80px] w-full rounded-xl border-2 border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                placeholder="İşlem hakkında notlar..."
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            className="w-full h-12 text-lg"
            onClick={handleSubmit}
            disabled={loading || cart.length === 0}
          >
            {loading ? "İşleniyor..." : "Satışı Tamamla"}
            <Save className="w-5 h-5 mr-2" />
            Satışı Kaydet
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t">
        <p className="text-xs text-muted-foreground">
          © 2026 Optimus Vet. Tüm hakları saklıdır.
        </p>
      </div>

      {/* Müşteri Seçim Modal'ı */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Müşteri Seç
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Müşteri ara (ad, telefon)..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {customerSearch && customersData?.customers && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {customersData.customers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Müşteri bulunamadı</p>
                  </div>
                ) : (
                  customersData.customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className="w-full p-4 text-left border rounded-xl hover:bg-muted transition-colors"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerSearch("");
                        setShowCustomerModal(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {customer.phone}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div
                            className={`font-semibold ${
                              customer.balance > 0
                                ? "text-destructive"
                                : customer.balance < 0
                                  ? "text-emerald-600"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {formatCurrency(customer.balance)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {customer.balance > 0
                              ? "Alacak"
                              : customer.balance < 0
                                ? "Borç"
                                : "Bakiye Sıfır"}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {!customerSearch && (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">
                  Müşteri aramak için yukarıdaki alana yazın
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
