"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  TrendingUp,
  Users,
  DollarSign,
  ArrowUpDown,
  Eye,
  FileText,
  Printer,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  balance: number;
  lastTransactionDate: string | null;
  lastTransactionType: string | null;
  daysSinceLastTransaction: number | null;
  _count: {
    transactions: number;
  };
}

interface ReceivablesData {
  customers: Customer[];
  stats: {
    totalCustomers: number;
    totalReceivable: number;
    averageReceivable: number;
    highestReceivable: number;
  };
}

export default function ReceivablesPage() {
  const [sortBy, setSortBy] = useState("balance");
  const [order, setOrder] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery<ReceivablesData>({
    queryKey: ["receivables", sortBy, order],
    queryFn: async () => {
      const res = await fetch(
        `/api/reports/receivables?sortBy=${sortBy}&order=${order}`,
      );
      if (!res.ok) throw new Error("Alacaklar yüklenemedi");
      return res.json();
    },
  });

  // Filter customers based on search query
  const filteredCustomers =
    data?.customers.filter((customer) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        customer.name.toLowerCase().includes(query) ||
        customer.code.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query)
      );
    }) || [];

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!data) return;

    // CSV export
    const headers = [
      "Müşteri Kodu",
      "Müşteri Adı",
      "Telefon",
      "Email",
      "Alacak",
      "Bekleyen İşlem",
    ];
    const rows = data.customers.map((c) => [
      c.code,
      c.name,
      c.phone || "",
      c.email || "",
      Number(c.balance).toFixed(2),
      c._count.transactions.toString(),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `veresiye-defteri-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Veri yüklenemedi</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            Veresiye Defteri
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Alacaklı müşteriler ve toplam alacak miktarı
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex-1 sm:flex-initial"
          >
            <FileText className="w-4 h-4 mr-2" />
            <span className="text-sm">Excel</span>
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial"
          >
            <Printer className="w-4 h-4 mr-2" />
            <span className="text-sm">Yazdır</span>
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-center mb-2">
          Veresiye Defteri
        </h1>
        <p className="text-center text-sm text-muted-foreground">
          Tarih: {new Date().toLocaleDateString("tr-TR")}
        </p>
      </div>

      {/* Stats Cards - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Toplam Alacak
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-destructive">
              {data.stats.totalReceivable.toLocaleString("tr-TR", {
                style: "currency",
                currency: "TRY",
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tüm alacakların toplamı
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Alacaklı Müşteri
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {data.stats.totalCustomers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Borcu olan müşteri sayısı
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Ortalama Alacak
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {data.stats.averageReceivable.toLocaleString("tr-TR", {
                style: "currency",
                currency: "TRY",
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Müşteri başına ortalama
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              En Yüksek Alacak
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-destructive">
              {data.stats.highestReceivable.toLocaleString("tr-TR", {
                style: "currency",
                currency: "TRY",
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              En yüksek borç miktarı
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters - Mobile Optimized */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Müşteri adı, kodu, telefon veya email ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sorting Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm font-medium">
                  Sıralama:
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balance">Alacak Miktarı</SelectItem>
                    <SelectItem value="lastTransactionDate">
                      Son İşlem Tarihi
                    </SelectItem>
                    <SelectItem value="name">Müşteri Adı</SelectItem>
                    <SelectItem value="code">Müşteri Kodu</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={order} onValueChange={setOrder}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Azalan</SelectItem>
                    <SelectItem value="asc">Artan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Alacaklı Müşteriler ({filteredCustomers.length}
            {searchQuery && ` / ${data?.customers.length || 0}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
              {searchQuery ? (
                <>
                  <p className="text-lg font-medium mb-2">Sonuç bulunamadı</p>
                  <p className="text-sm">
                    &quot;{searchQuery}&quot; için eşleşen müşteri yok
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">
                    Alacaklı müşteri yok
                  </p>
                  <p className="text-sm">Tüm müşterilerin bakiyesi sıfır</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table - Hidden on Mobile */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Müşteri Kodu
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Müşteri Adı
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold print:hidden">
                        Telefon
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Alacak
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">
                        Son İşlem
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">
                        Geçen Süre
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold print:hidden">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCustomers.map((customer, index) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer print:cursor-default"
                        onClick={() => {
                          if (window.innerWidth >= 1024) {
                            window.location.href = `/dashboard/customers/${customer.id}?from=receivables`;
                          }
                        }}
                      >
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{customer.code}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{customer.name}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground print:hidden">
                          {customer.phone ? (
                            <span>{customer.phone}</span>
                          ) : (
                            <span className="italic">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-destructive">
                            {Number(customer.balance).toLocaleString("tr-TR", {
                              style: "currency",
                              currency: "TRY",
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {customer.lastTransactionDate ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-muted-foreground">
                                {new Date(
                                  customer.lastTransactionDate,
                                ).toLocaleDateString("tr-TR")}
                              </span>
                              <Badge
                                variant="outline"
                                className={
                                  customer.lastTransactionType === "SALE"
                                    ? "text-xs border-emerald-500 text-emerald-600"
                                    : "text-xs border-blue-500 text-blue-600"
                                }
                              >
                                {customer.lastTransactionType === "SALE"
                                  ? "Satış"
                                  : "Tahsilat"}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {customer.daysSinceLastTransaction !== null ? (
                            <Badge
                              variant={
                                customer.daysSinceLastTransaction > 90
                                  ? "destructive"
                                  : customer.daysSinceLastTransaction > 30
                                    ? "secondary"
                                    : "default"
                              }
                              className={
                                customer.daysSinceLastTransaction > 90
                                  ? "bg-red-500 hover:bg-red-600"
                                  : customer.daysSinceLastTransaction > 30
                                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                                    : "bg-green-500 hover:bg-green-600"
                              }
                            >
                              {customer.daysSinceLastTransaction} gün
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center print:hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/dashboard/customers/${customer.id}?from=receivables`}
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 border-t-2 font-bold">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right">
                        TOPLAM:
                      </td>
                      <td className="px-4 py-3 text-right text-destructive">
                        {data.stats.totalReceivable.toLocaleString("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        })}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Card Layout - Hidden on Desktop */}
              <div className="sm:hidden space-y-3">
                {filteredCustomers.map((customer, index) => (
                  <Link
                    key={customer.id}
                    href={`/dashboard/customers/${customer.id}?from=receivables`}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">
                                #{index + 1}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {customer.code}
                              </Badge>
                            </div>
                            <h3 className="font-bold text-base truncate">
                              {customer.name}
                            </h3>
                            {customer.phone && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {customer.phone}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-lg font-bold text-destructive">
                              {Number(customer.balance).toLocaleString(
                                "tr-TR",
                                {
                                  style: "currency",
                                  currency: "TRY",
                                },
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Alacak
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              Son İşlem
                            </div>
                            {customer.lastTransactionDate ? (
                              <>
                                <div className="text-xs font-medium">
                                  {new Date(
                                    customer.lastTransactionDate,
                                  ).toLocaleDateString("tr-TR")}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] mt-1 ${
                                    customer.lastTransactionType === "SALE"
                                      ? "border-emerald-500 text-emerald-600"
                                      : "border-blue-500 text-blue-600"
                                  }`}
                                >
                                  {customer.lastTransactionType === "SALE"
                                    ? "Satış"
                                    : "Tahsilat"}
                                </Badge>
                              </>
                            ) : (
                              <span className="text-xs italic text-muted-foreground">
                                -
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-1">
                              Geçen Süre
                            </div>
                            {customer.daysSinceLastTransaction !== null ? (
                              <Badge
                                variant={
                                  customer.daysSinceLastTransaction > 90
                                    ? "destructive"
                                    : customer.daysSinceLastTransaction > 30
                                      ? "secondary"
                                      : "default"
                                }
                                className={`text-xs ${
                                  customer.daysSinceLastTransaction > 90
                                    ? "bg-red-500 hover:bg-red-600"
                                    : customer.daysSinceLastTransaction > 30
                                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                                      : "bg-green-500 hover:bg-green-600"
                                }`}
                              >
                                {customer.daysSinceLastTransaction} gün
                              </Badge>
                            ) : (
                              <span className="text-xs italic text-muted-foreground">
                                -
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}

                {/* Mobile Total */}
                <Card className="bg-muted/50 border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">TOPLAM ALACAK:</span>
                      <span className="text-xl font-bold text-destructive">
                        {data.stats.totalReceivable.toLocaleString("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
