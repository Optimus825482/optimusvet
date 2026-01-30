"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  Phone,
  Mail,
  MapPin,
  Receipt,
  FileText,
  User,
  Wallet,
  Package,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface Transaction {
  id: string;
  code: string;
  type: string;
  total: string | number;
  paidAmount: string | number;
  status: string;
  createdAt: string;
}

interface Supplier {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  balance: string | number;
  notes: string | null;
  transactions: Transaction[];
  _count: {
    transactions: number;
  };
}

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: supplier, isLoading } = useQuery<Supplier>({
    queryKey: ["supplier", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/suppliers/${params.id}`);
      if (!res.ok) throw new Error("Tedarikçi bulunamadı");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/suppliers/${params.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Silinemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      router.push("/dashboard/suppliers");
    },
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
      case "COMPLETED":
        return <Badge variant="success">Ödendi</Badge>;
      case "PARTIAL":
        return <Badge variant="info">Parçalı</Badge>;
      case "PENDING":
        return <Badge variant="warning">Bekliyor</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-500 font-medium">Tedarikçi bulunamadı</p>
        <Button variant="link" asChild className="mt-4">
          <Link href="/dashboard/suppliers">Tedarikçiler'e Dön</Link>
        </Button>
      </div>
    );
  }

  const balance = Number(supplier.balance);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="rounded-xl shadow-sm border-slate-200"
          >
            <Link href="/dashboard/suppliers">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {supplier.name}
            </h1>
            <Badge
              variant="outline"
              className="mt-1 font-mono text-[10px] uppercase border-slate-200 text-slate-500"
            >
              {supplier.code}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            asChild
            className="rounded-xl border-slate-200 shadow-sm bg-white"
          >
            <Link href={`/dashboard/suppliers/${supplier.id}/edit`}>
              <Pencil className="w-4 h-4 mr-2" />
              Düzenle
            </Link>
          </Button>
          <Button
            variant="destructive"
            className="rounded-xl shadow-sm"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Sil
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info Cards */}
        <div className="lg:col-span-1 space-y-6">
          {/* Main Info */}
          <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/30">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="w-4 h-4" />
                </div>
                Firma Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Firma Adı
                </label>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {supplier.name}
                </p>
              </div>
              {supplier.contactName && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      İlgili Kişi
                    </label>
                    <p className="text-sm font-medium text-slate-700">
                      {supplier.contactName}
                    </p>
                  </div>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Telefon
                    </label>
                    <p className="text-sm font-medium text-primary">
                      <a
                        href={`tel:${supplier.phone}`}
                        className="hover:underline"
                      >
                        {supplier.phone}
                      </a>
                    </p>
                  </div>
                </div>
              )}
              {supplier.email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      E-Posta
                    </label>
                    <p className="text-sm font-medium text-primary truncate">
                      <a
                        href={`mailto:${supplier.email}`}
                        className="hover:underline"
                      >
                        {supplier.email}
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address & Tax */}
          <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-50">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <MapPin className="w-4 h-4" />
                </div>
                Adres & Vergi
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {supplier.address || supplier.city ? (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Adres
                  </label>
                  <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                    {supplier.address ? `${supplier.address}` : ""}
                    {supplier.district ? `, ${supplier.district}` : ""}
                    {supplier.city ? ` / ${supplier.city}` : ""}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Adres bilgisi girilmemiştir.
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Vergi No
                  </label>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {supplier.taxNumber || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Vergi Dairesi
                  </label>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {supplier.taxOffice || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cari Durum */}
          <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-slate-900 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400 border border-white/10">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white/60">
                    Cari Durum
                  </h3>
                  <p className="text-[10px] font-bold text-white/40">
                    GÜNCEL BAKİYE
                  </p>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p
                    className={`text-3xl font-black tracking-tighter ${balance > 0 ? "text-rose-400" : "text-emerald-400"}`}
                  >
                    {formatCurrency(Math.abs(balance))}
                  </p>
                  <p className="text-[10px] font-bold text-white/40 mt-1 uppercase tracking-widest">
                    {balance > 0
                      ? "FİRMAYA BORÇ"
                      : balance < 0
                        ? "FİRMADAN ALACAK"
                        : "BAKİYE SIFIR"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white/80">
                    {supplier._count.transactions}
                  </p>
                  <p className="text-[9px] font-black text-white/40 uppercase">
                    İŞLEM ŞU ANA KADAR
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {supplier.notes && (
            <Card className="rounded-3xl border-slate-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-widest">
                  Notlar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-2xl bg-amber-50/30 border border-amber-100/50 text-sm text-slate-700 leading-relaxed italic">
                  {supplier.notes}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Transactions Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-50 bg-slate-50/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 shadow-sm">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">
                    Alım Geçmişi
                  </CardTitle>
                  <p className="text-xs text-slate-500 font-medium">
                    {supplier._count.transactions} işlem listeleniyor
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="rounded-xl shadow-md shadow-primary/20"
              >
                <Link
                  href={`/dashboard/purchases/new?supplierId=${supplier.id}`}
                >
                  Yeni Alım
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {supplier.transactions.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Package className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Henüz alım işlemi bulunmuyor
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          İşlem No
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          Tarih
                        </th>
                        <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">
                          Tutar
                        </th>
                        <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">
                          Ödenen
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">
                          Durum
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {supplier.transactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                          onClick={() =>
                            router.push(
                              `/dashboard/purchases/${transaction.id}`,
                            )
                          }
                        >
                          <td className="px-6 py-4">
                            <span className="text-sm font-black font-mono text-primary group-hover:underline">
                              {transaction.code}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-600">
                            {formatDate(transaction.createdAt)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm font-bold text-slate-900">
                              {formatCurrency(Number(transaction.total))}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm font-bold text-emerald-600">
                              {formatCurrency(Number(transaction.paidAmount))}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {getStatusBadge(transaction.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] border border-slate-100 p-8 max-w-md w-full mx-4 shadow-2xl animate-scaleIn">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              Tedarikçiyi Sil
            </h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-6">
              <strong className="text-slate-900 underline decoration-rose-500/30">
                {supplier.name}
              </strong>{" "}
              firmasını silmek istediğinize emin misiniz? Bu işlem geri
              alınamaz.
            </p>

            {supplier._count.transactions > 0 && (
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 mb-6">
                <p className="text-rose-600 text-xs font-bold leading-tight uppercase flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Kritik Engel
                </p>
                <p className="text-rose-500/80 text-xs mt-1 font-medium">
                  Bu tedarikçiye ait {supplier._count.transactions} işlem
                  bulunduğu için silme işlemi yapılamaz. Önce işlemleri
                  silmelisiniz.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-xl border-slate-200 h-12 font-bold"
              >
                Vazgeç
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={
                  deleteMutation.isPending || supplier._count.transactions > 0
                }
                className="flex-1 rounded-xl h-12 font-bold shadow-lg shadow-rose-500/20"
              >
                {deleteMutation.isPending ? "Siliniyor..." : "Fırmayı Sil"}
              </Button>
            </div>
            {deleteMutation.isError && (
              <p className="text-rose-500 text-xs font-bold mt-4 text-center">
                {(deleteMutation.error as Error).message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-6 border-t border-slate-100 mt-6">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          © 2026 Optimus Vet. Tüm hakları saklıdır.
        </p>
      </footer>
    </div>
  );
}

// Re-using AlertTriangle because it was missing in imports
function AlertTriangle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
