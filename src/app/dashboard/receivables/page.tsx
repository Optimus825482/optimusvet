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
  Phone,
  Mail,
  Eye,
  FileText,
  Printer,
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
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-primary" />
            Veresiye Defteri
          </h1>
          <p className="text-muted-foreground mt-1">
            Alacaklı müşteriler ve toplam alacak miktarı
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <FileText className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Yazdır
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Alacak</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
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
            <CardTitle className="text-sm font-medium">
              Alacaklı Müşteri
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.stats.totalCustomers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Borcu olan müşteri sayısı
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ortalama Alacak
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
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
            <CardTitle className="text-sm font-medium">
              En Yüksek Alacak
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
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

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sıralama:</span>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balance">Alacak Miktarı</SelectItem>
                <SelectItem value="name">Müşteri Adı</SelectItem>
                <SelectItem value="code">Müşteri Kodu</SelectItem>
              </SelectContent>
            </Select>
            <Select value={order} onValueChange={setOrder}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Azalan</SelectItem>
                <SelectItem value="asc">Artan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alacaklı Müşteriler ({data.customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.customers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">Alacaklı müşteri yok</p>
              <p className="text-sm">Tüm müşterilerin bakiyesi sıfır</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                      İletişim
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      Alacak
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      Bekleyen İşlem
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold print:hidden">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.customers.map((customer, index) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer print:cursor-default"
                      onClick={() => {
                        if (window.innerWidth >= 1024) {
                          window.location.href = `/dashboard/customers/${customer.id}`;
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
                        <div className="flex flex-col gap-1">
                          {customer.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span className="text-xs">{customer.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-destructive">
                          {Number(customer.balance).toLocaleString("tr-TR", {
                            style: "currency",
                            currency: "TRY",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">
                          {customer._count.transactions}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center print:hidden">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/dashboard/customers/${customer.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/50 border-t-2 font-bold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
