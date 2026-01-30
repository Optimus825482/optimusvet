"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Download,
  Trash2,
  MoreVertical,
  User,
  Calendar,
  CreditCard,
  Banknote,
  Receipt,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ChevronRight,
  Info,
  Hash,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { printInvoice, type InvoiceData } from "@/lib/pdf";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return (
        <Badge
          variant="success"
          className="rounded-lg font-black text-[10px] uppercase gap-1 px-3 py-1"
        >
          <CheckCircle className="h-3 w-3" />
          Tamamlandı
        </Badge>
      );
    case "PENDING":
      return (
        <Badge
          variant="warning"
          className="rounded-lg font-black text-[10px] uppercase gap-1 px-3 py-1"
        >
          <Clock className="h-3 w-3" />
          Bekliyor
        </Badge>
      );
    case "PARTIAL":
      return (
        <Badge
          variant="info"
          className="rounded-lg font-black text-[10px] uppercase gap-1 px-3 py-1"
        >
          <AlertCircle className="h-3 w-3" />
          Kısmi Ödeme
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge
          variant="outline"
          className="rounded-lg font-black text-[10px] uppercase gap-1 px-3 py-1 opacity-50"
        >
          <XCircle className="h-3 w-3" />
          İptal
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="rounded-lg font-black text-[10px] uppercase"
        >
          {status}
        </Badge>
      );
  }
}

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const saleId = params.id as string;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clinicSettings, setClinicSettings] = useState({
    name: "OPTIMUS VET",
    phone: "",
    email: "",
    address: "",
  });

  // Load clinic settings
  useEffect(() => {
    async function loadSettings() {
      try {
        console.log("🔄 Loading clinic settings...");
        const response = await fetch("/api/settings");
        if (response.ok) {
          const settings = await response.json();
          console.log("✅ Settings loaded:", settings);
          setClinicSettings({
            name: settings.clinicName || "OPTIMUS VET",
            phone: settings.clinicPhone || "",
            email: settings.clinicEmail || "",
            address: settings.clinicAddress || "",
          });
          console.log("✅ Clinic name set to:", settings.clinicName);
        } else {
          console.error("❌ Settings response not OK:", response.status);
        }
      } catch (error) {
        console.error("❌ Failed to load settings:", error);
      }
    }
    loadSettings();
  }, []);

  // Fetch sale details
  const { data: sale, isLoading } = useQuery({
    queryKey: ["sale", saleId],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/${saleId}`);
      if (!res.ok) throw new Error("Satış bulunamadı");
      return res.json();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/transactions/${saleId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Silme başarısız");
      }
    },
    onSuccess: () => {
      setDeleteDialogOpen(false);
      toast({
        title: "✅ Satış Silindi",
        description: `${sale?.code} kodlu satış başarıyla silindi. Stok ve bakiye güncellendi.`,
      });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setTimeout(() => {
        router.push("/dashboard/sales");
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Hata",
        description: error.message || "Satış silinirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handlePrint = () => {
    if (!sale) return;

    console.log("🖨️ Print button clicked");
    console.log("📋 Current clinic settings:", clinicSettings);

    const invoiceData: InvoiceData = {
      invoiceNumber: sale.code,
      date: formatDate(sale.createdAt),
      customer: {
        name: sale.customer?.name || "Anonim Müşteri",
        phone: sale.customer?.phone,
        email: sale.customer?.email,
        address: sale.customer?.address,
        taxId: sale.customer?.taxId,
        taxOffice: sale.customer?.taxOffice,
      },
      clinic: {
        name: clinicSettings.name,
        phone: clinicSettings.phone,
        email: clinicSettings.email,
        address: clinicSettings.address,
      },
      items: sale.items.map((item: any) => ({
        name: item.product?.name || item.description || "Ürün",
        quantity: item.quantity,
        unit: item.product?.unit || "Adet",
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        total: item.total,
      })),
      subTotal: Number(sale.subtotal || 0),
      discount: sale.discount,
      vatTotal: Number(sale.vatTotal || 0),
      total: sale.total,
      paidAmount: sale.paidAmount,
      notes: sale.notes,
    };

    printInvoice(invoiceData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Receipt className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-slate-500 font-bold tracking-tight">
          Satış bulunamadı
        </p>
        <Button
          variant="outline"
          asChild
          className="rounded-xl border-slate-200"
        >
          <Link href="/dashboard/sales">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Satışlara Dön
          </Link>
        </Button>
      </div>
    );
  }

  const remainingAmount =
    Number(sale.total || 0) - Number(sale.paidAmount || 0);

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
            <Link href="/dashboard/sales">
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-lg">
              <Receipt className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {sale.code}
                </h1>
                {getStatusBadge(sale.status)}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                {formatDate(sale.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="rounded-xl shadow-sm bg-white border-slate-200 font-bold"
          >
            <Printer className="h-4 w-4 mr-2" />
            Yazdır
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl shadow-sm bg-white border-slate-200"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-2xl p-2 shadow-xl border-slate-100"
            >
              <DropdownMenuItem
                onClick={handlePrint}
                className="rounded-lg py-2 cursor-pointer font-bold"
              >
                <Download className="h-4 w-4 mr-2 text-primary" />
                PDF Fatura
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-600 rounded-lg py-2 cursor-pointer font-bold"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Satışı Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Linked Entities (Customer & Animal) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden group">
              <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/20">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500">
                  <User className="w-4 h-4 text-primary" />
                  MÜŞTERİ BİLGİLERİ
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8">
                {sale.customer ? (
                  <Link
                    href={`/dashboard/customers/${sale.customer.id}`}
                    className="flex items-center gap-4 p-4 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-primary/30 transition-all"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                      <span className="text-xl font-black text-white">
                        {sale.customer.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 group-hover:text-primary transition-colors truncate">
                        {sale.customer.name}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate leading-none mt-1">
                        {sale.customer.phone || sale.customer.code}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                  </Link>
                ) : (
                  <div className="text-center py-6 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                    <User className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Anonim Satış
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden group">
              <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/20">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  HASTA BİLGİSİ
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8 h-full">
                {sale.animal ? (
                  <Link
                    href={`/dashboard/animals/${sale.animal.id}`}
                    className="flex items-center gap-4 p-4 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-emerald-300 transition-all"
                  >
                    <div className="text-3xl transition-transform group-hover:scale-110">
                      🐾
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                        {sale.animal.name}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate leading-none mt-1">
                        {sale.animal.breed || sale.animal.species}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  </Link>
                ) : (
                  <div className="text-center py-6 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                    <Activity className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Hastası Atanmamış
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Items Table Card */}
          <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/20">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500">
                <Package className="w-4 h-4 text-primary" />
                SATIŞ KALEMLERİ
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/10 border-b border-slate-50 uppercase text-[9px] font-black tracking-widest text-slate-400">
                    <tr>
                      <th className="px-8 py-5">Ürün / Hizmet</th>
                      <th className="px-4 py-5 text-right">Miktar</th>
                      <th className="px-4 py-5 text-right">Birim Fiyat</th>
                      <th className="px-4 py-5 text-right">KDV</th>
                      <th className="px-8 py-5 text-right">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/50">
                    {sale.items.map((item: any, index: number) => (
                      <tr
                        key={item.id || index}
                        className="hover:bg-slate-50/30 transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 tracking-tight leading-none mb-1">
                                {item.product?.name ||
                                  item.description ||
                                  "Ürün"}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-[8px] font-black uppercase border-slate-100 text-slate-400 h-4"
                              >
                                {item.product?.code || "Hizmet"}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-6 text-right font-bold text-slate-600">
                          {item.quantity}{" "}
                          <span className="text-[9px] uppercase tracking-wider text-slate-400">
                            {item.product?.unit || "Adet"}
                          </span>
                        </td>
                        <td className="px-4 py-6 text-right font-bold text-slate-600">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-4 py-6 text-right">
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
          {sale.notes && (
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="pb-4 border-b border-slate-50">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500 font-mono">
                  <Info className="w-4 h-4" />
                  SATIŞ NOTLARI
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="p-6 rounded-[2rem] bg-indigo-50/30 border border-indigo-100/50 text-slate-700 leading-relaxed italic text-sm">
                  {sale.notes}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          {/* Totals Summary Card - King Style */}
          <Card className="rounded-[3rem] border-slate-800 shadow-2xl overflow-hidden bg-slate-900 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16 rounded-full" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 blur-2xl -ml-12 -mb-12 rounded-full" />

            <CardHeader className="relative pb-6 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-white/40">
                <Receipt className="h-4 w-4 text-primary" />
                ÖDEME ÖZETİ
              </CardTitle>
            </CardHeader>
            <CardContent className="relative pt-8 space-y-5">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-white/40 uppercase tracking-widest text-[10px]">
                  Ara Toplam
                </span>
                <span className="text-white/80">
                  {formatCurrency(Number(sale.subtotal || 0))}
                </span>
              </div>
              {Number(sale.discount || 0) > 0 && (
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-rose-400 uppercase tracking-widest text-[10px]">
                    İndirim
                  </span>
                  <span className="text-rose-400">
                    -{formatCurrency(Number(sale.discount || 0))}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-white/40 uppercase tracking-widest text-[10px]">
                  KDV Toplam
                </span>
                <span className="text-white/80">
                  {formatCurrency(Number(sale.vatTotal || 0))}
                </span>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-1">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
                  GENEL TOPLAM
                </p>
                <p className="text-5xl font-black tracking-tighter text-white">
                  {formatCurrency(Number(sale.total || 0))}
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
                <CreditCard className="h-5 w-5 text-primary" />
                ÖDEME DETAYI
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  YÖNTEM
                </span>
                <Badge
                  variant="secondary"
                  className="rounded-lg font-black text-[10px] uppercase gap-1.5 px-3 py-1 bg-white shadow-sm border-slate-100"
                >
                  {sale.paymentMethod === "CASH" ? (
                    <>
                      <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                      NAKİT
                    </>
                  ) : sale.paymentMethod === "CARD" ? (
                    <>
                      <CreditCard className="h-3.5 w-3.5 text-sky-500" />
                      KREDİ KARTI
                    </>
                  ) : (
                    sale.paymentMethod
                  )}
                </Badge>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  ÖDENEN
                </span>
                <span className="text-lg font-black text-emerald-600 tracking-tight">
                  {formatCurrency(Number(sale.paidAmount || 0))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* System Records Card */}
          <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Hash className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                    İŞLEM KODU
                  </p>
                  <p className="font-mono text-xs font-bold text-slate-700 truncate">
                    {sale.id}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Kayit
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600">
                    {formatDate(sale.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Guncelleme
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600">
                    {formatDate(sale.updatedAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-10 border-t border-slate-100/50 mt-12">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
          OPTIMUS VET FINANSMAN MODÜLÜ v1.0 • BİLGİ İŞLEM MERKEZİ
        </p>
      </footer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 max-w-md animate-fadeIn">
          <DialogHeader>
            <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8 text-rose-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
              Satışı İptal Et
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium py-4">
              <strong className="text-slate-900 underline decoration-rose-500/30">
                {sale.code}
              </strong>{" "}
              kodlu satışı silmek istediğinize emin misiniz?
            </DialogDescription>
            <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-100/50">
              <p className="text-rose-600 font-black uppercase text-[10px] tracking-widest mb-1">
                KRİTİK BİLGİ
              </p>
              <p className="text-rose-500/80 text-xs font-bold leading-relaxed">
                Bu işlem stok hareketlerini geri alacak ve müşteri bakiyesini
                etkileyecektir. İşlem kalıcıdır.
              </p>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl font-bold h-12 flex-1 border-slate-200"
            >
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="rounded-xl font-bold h-12 flex-1 shadow-lg shadow-rose-500/20"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Satışı Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
