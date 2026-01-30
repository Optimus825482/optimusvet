"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Printer,
  Receipt,
  Calendar,
  Building2,
  Package,
  Loader2,
  ChevronRight,
  Info,
  Banknote,
  CreditCard,
  History,
  CheckCircle,
  Clock,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TransactionItem {
  id: string;
  product: {
    name: string;
    code: string;
    unit: string;
  };
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discount: number;
  total: number;
}

interface Transaction {
  id: string;
  code: string;
  type: string;
  status: string;
  subTotal: number;
  discount: number;
  vatTotal: number;
  grandTotal: number;
  paidAmount: number;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: {
    id: string;
    name: string;
    code: string;
    phone: string | null;
    address: string | null;
  } | null;
  items: TransactionItem[];
}

function getStatusBadge(status: string) {
  const isPaid = status === "PAID" || status === "COMPLETED";
  return (
    <Badge
      variant={isPaid ? "success" : "warning"}
      className="rounded-lg font-black text-[10px] uppercase gap-1 px-3 py-1"
    >
      {isPaid ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {isPaid ? "Tamamlandı" : "Ödeme Bekliyor"}
    </Badge>
  );
}

export default function PurchaseDetailPage() {
  const { id } = useParams();

  const {
    data: transaction,
    isLoading,
    error,
  } = useQuery<Transaction>({
    queryKey: ["transaction", id],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/${id}`);
      if (!res.ok) throw new Error("İşlem detayı yüklenemedi");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Receipt className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-slate-500 font-bold tracking-tight text-destructive">
          İşlem detayı yüklenemedi
        </p>
        <Button
          variant="outline"
          asChild
          className="rounded-xl border-slate-200"
        >
          <Link href="/dashboard/purchases">Listeye Dön</Link>
        </Button>
      </div>
    );
  }

  const remainingAmount = transaction.grandTotal - transaction.paidAmount;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="rounded-xl shadow-sm border-slate-200"
          >
            <Link href="/dashboard/purchases">
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-lg border border-orange-100/50">
              <Receipt className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {transaction.code}
                </h1>
                {getStatusBadge(transaction.status)}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                MİKTAR: {formatDate(transaction.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-xl font-bold bg-white border-slate-200 shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2" />
            Yazdır
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Info Card */}
          <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden group">
            <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/20">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500">
                <Building2 className="w-4 h-4 text-orange-600" />
                TEDARİKÇİ BİLGİLERİ
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              {transaction.supplier ? (
                <Link
                  href={`/dashboard/suppliers/${transaction.supplier.id}`}
                  className="flex items-center gap-4 p-5 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-orange-300 transition-all group/link shadow-sm"
                >
                  <div className="h-14 w-14 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20 group-hover/link:scale-105 transition-transform">
                    <span className="text-xl font-black text-white">
                      {transaction.supplier.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 group-hover/link:text-orange-600 transition-colors truncate">
                      {transaction.supplier.name}
                    </p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate leading-none mt-1">
                      {transaction.supplier.code}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover/link:text-orange-500 transition-colors" />
                </Link>
              ) : (
                <div className="text-center py-6 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                  <Building2 className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Tedarikçi Bilgisi Yok
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Table Card */}
          <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/20">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500">
                <Package className="w-4 h-4 text-orange-600" />
                ALIM SATIRLARI
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/10 border-b border-slate-50 uppercase text-[9px] font-black tracking-widest text-slate-400">
                    <tr>
                      <th className="px-8 py-5">Ürün</th>
                      <th className="px-4 py-5 text-right">Miktar</th>
                      <th className="px-4 py-5 text-right">Birim Fiyat</th>
                      <th className="px-4 py-5 text-right">KDV</th>
                      <th className="px-8 py-5 text-right">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/50">
                    {transaction.items.map((item, index) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/30 transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-black text-xs">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 tracking-tight leading-none mb-1">
                                {item.product.name}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-[8px] font-black uppercase border-slate-100 text-slate-400 h-4"
                              >
                                {item.product.code}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-6 text-right font-bold text-slate-600">
                          {item.quantity}{" "}
                          <span className="text-[9px] uppercase tracking-wider text-slate-400">
                            {item.product.unit}
                          </span>
                        </td>
                        <td className="px-4 py-6 text-right font-bold text-slate-600">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-4 py-6 text-right font-bold">
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-500 rounded font-black text-[9px]"
                          >
                            %{item.vatRate}
                          </Badge>
                        </td>
                        <td className="px-8 py-6 text-right font-black text-slate-900">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          {transaction.notes && (
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="pb-4 border-b border-slate-50">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500 font-mono">
                  <Info className="w-4 h-4" />
                  İşlem Notları
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="p-6 rounded-[2rem] bg-orange-50/30 border border-orange-100/50 text-slate-700 leading-relaxed italic text-sm">
                  {transaction.notes}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Financial Summary Card - Dark Style */}
          <Card className="rounded-[3rem] border-slate-800 shadow-2xl overflow-hidden bg-slate-900 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />

            <CardHeader className="relative pb-6 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-white/40">
                <Receipt className="h-4 w-4 text-orange-500" />
                ÖDEME ÖZETİ
              </CardTitle>
            </CardHeader>
            <CardContent className="relative pt-8 space-y-5">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-white/40 uppercase tracking-widest text-[10px]">
                  Ara Toplam
                </span>
                <span className="text-white/80">
                  {formatCurrency(transaction.subTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-white/40 uppercase tracking-widest text-[10px]">
                  KDV Toplam
                </span>
                <span className="text-white/80">
                  {formatCurrency(transaction.vatTotal)}
                </span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between items-center text-sm font-bold text-rose-400">
                  <span className="uppercase tracking-widest text-[10px]">
                    İndirim
                  </span>
                  <span>-{formatCurrency(transaction.discount)}</span>
                </div>
              )}

              <div className="pt-6 border-t border-white/5 space-y-1">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">
                  GENEL TOPLAM
                </p>
                <p className="text-5xl font-black tracking-tighter text-white">
                  {formatCurrency(transaction.grandTotal)}
                </p>
              </div>

              <div className="pt-6 italic">
                {remainingAmount > 0 ? (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-black uppercase tracking-widest flex items-center justify-between">
                    <span>BORÇ BAKİYE</span>
                    <span className="text-lg">
                      {formatCurrency(remainingAmount)}
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-between">
                    <span>TAMAMI ÖDENDİ</span>
                    <CheckCircle className="h-4 w-4" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Details */}
          <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-slate-50/50">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500">
                <CreditCard className="h-5 w-5 text-orange-600" />
                ÖDEME DETAYI
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Ödenen
                </span>
                <span className="text-lg font-black text-emerald-600 tracking-tight">
                  {formatCurrency(transaction.paidAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* System Records Card */}
          <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-400">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                    İŞLEM NO
                  </p>
                  <p className="font-mono text-xs font-bold text-slate-700 truncate">
                    {transaction.id}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Kayıt
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600">
                    {formatDate(transaction.createdAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-10 border-t border-slate-100/50 mt-12 px-6">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
          OPTIMUS VET TEDARİK ZİNCİRİ MODÜLÜ v1.0 • EFYS™ ALTYAPISI
        </p>
      </footer>
    </div>
  );
}
