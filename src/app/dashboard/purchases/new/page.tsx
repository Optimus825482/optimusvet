"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import {
  Plus as PlusIcon,
  Minus as MinusIcon,
  Trash2 as TrashIcon,
  ArrowLeft as ArrowLeftIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  Building2 as BuildingIcon,
  Calculator as CalculatorIcon,
  CreditCard as CreditCardIcon,
  Banknote as BanknoteIcon,
  Package as PackageIcon,
  ArrowDownLeft as ArrowDownLeftIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  code: string;
  name: string;
  purchasePrice: number;
  vatRate: number;
  stock: number;
  unit: string;
  isService: boolean;
}

interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string;
  balance: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  purchasePrice: number;
  vatRate: number;
  discount: number;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Fetch suppliers
  const { data: suppliersData } = useQuery<{ suppliers: Supplier[] }>({
    queryKey: ["suppliers-search", supplierSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (supplierSearch) params.set("search", supplierSearch);
      params.set("limit", "10");
      const res = await fetch(`/api/suppliers?${params}`);
      return res.json();
    },
    enabled: supplierSearch.length > 0,
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

  const totals = useMemo(() => {
    let subTotal = 0;
    let vatTotal = 0;

    cart.forEach((item) => {
      const lineTotal = item.purchasePrice * item.quantity;
      const lineDiscount = (lineTotal * item.discount) / 100;
      const lineNet = lineTotal - lineDiscount;
      const lineVat = (lineNet * item.vatRate) / 100;

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
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          purchasePrice: Number(product.purchasePrice),
          vatRate: Number(product.vatRate),
          discount: 0,
        },
      ]);
    }
    setProductSearch("");
  };

  const updateCartItem = (productId: string, updates: Partial<CartItem>) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, ...updates } : item,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const handleSubmit = async () => {
    // Prevent double submission
    if (loading) {
      console.warn("[PURCHASES] Duplicate submission prevented");
      return;
    }

    if (!selectedSupplier) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen bir tedarikçi seçin",
      });
      return;
    }
    if (cart.length === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sepet boş",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PURCHASE",
          supplierId: selectedSupplier.id,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.purchasePrice,
            vatRate: item.vatRate,
            discount:
              (item.purchasePrice * item.quantity * item.discount) / 100,
          })),
          discount: totals.discountAmount,
          paidAmount: parseFloat(paidAmount) || 0,
          paymentMethod,
          notes,
        }),
      });

      if (!response.ok) throw new Error("Kayıt başarısız");

      toast({
        variant: "success",
        title: "Başarılı",
        description: "Satın alma kaydedildi",
      });
      router.push("/dashboard/purchases");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "İşlem sırasında bir hata oluştu",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/purchases">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Yeni Satın Alma</h1>
          <p className="text-muted-foreground">
            Tedarikçiden mal alımı gerçekleştirin
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BuildingIcon className="w-5 h-5 text-primary" />
                Tedarikçi Seçimi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSupplier ? (
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div>
                    <div className="font-semibold">{selectedSupplier.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Bakiye: {formatCurrency(selectedSupplier.balance)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSupplier(null)}
                  >
                    Değiştir
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tedarikçi ara..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    className="pl-10"
                  />
                  {supplierSearch && suppliersData?.suppliers && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-xl shadow-lg max-h-60 overflow-auto">
                      {suppliersData.suppliers.map((s) => (
                        <button
                          key={s.id}
                          className="w-full p-3 text-left hover:bg-accent transition-colors border-b last:border-0"
                          onClick={() => setSelectedSupplier(s)}
                        >
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.phone}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-primary" />
                Ürün Ekle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Ürün ara..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
                {productSearch && productsData?.products && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-xl shadow-lg max-h-60 overflow-auto">
                    {productsData.products.map((p) => (
                      <button
                        key={p.id}
                        className="w-full p-3 text-left hover:bg-accent border-b last:border-0"
                        onClick={() => addToCart(p)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Mevcut Stok: {p.stock} {p.unit}
                            </div>
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(p.purchasePrice)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle>Sepet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-accent/20 border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {item.product.name}
                      </div>
                      <Input
                        type="number"
                        className="h-8 w-32 mt-1"
                        value={item.purchasePrice}
                        onChange={(e) =>
                          updateCartItem(item.product.id, {
                            purchasePrice: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateCartItem(item.product.id, {
                            quantity: Math.max(1, item.quantity - 1),
                          })
                        }
                      >
                        <MinusIcon className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateCartItem(item.product.id, {
                            quantity: item.quantity + 1,
                          })
                        }
                      >
                        <PlusIcon className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-right font-bold w-24">
                      {formatCurrency(item.purchasePrice * item.quantity)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Sepet boş
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalculatorIcon className="w-5 h-5" /> Özet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Ara Toplam</span>
                <span>{formatCurrency(totals.subTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>KDV</span>
                <span>{formatCurrency(totals.vatTotal)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>Genel Toplam</span>
                <span className="text-primary">
                  {formatCurrency(totals.grandTotal)}
                </span>
              </div>

              <div className="space-y-2 pt-4">
                <Label>Ödeme Nakit/Kart</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={paymentMethod === "CASH" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("CASH")}
                  >
                    <BanknoteIcon className="w-4 h-4 mr-2" /> Nakit
                  </Button>
                  <Button
                    variant={
                      paymentMethod === "CREDIT_CARD" ? "default" : "outline"
                    }
                    onClick={() => setPaymentMethod("CREDIT_CARD")}
                  >
                    <CreditCardIcon className="w-4 h-4 mr-2" /> Kart
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ödenen Tutar</Label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <Button
                className="w-full h-12"
                onClick={handleSubmit}
                disabled={loading || cart.length === 0}
              >
                <SaveIcon className="w-5 h-5 mr-2" />
                {loading ? "Kaydediliyor..." : "Satın Almayı Kaydet"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
