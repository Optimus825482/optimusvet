"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Package,
  ShoppingCart,
  Receipt,
  Syringe,
  TrendingDown,
  AlertTriangle,
  Calendar,
  ArrowRight,
  PawPrint,
  ChevronRight,
  Activity,
  DollarSign,
  Briefcase,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface DashboardData {
  summary: {
    todaySales: number;
    totalCustomers: number;
    totalAnimals: number;
    pendingPayments: number;
    criticalStock: number;
  };
  todayAppointments: any[];
  upcomingVaccines: any[];
  pendingPaymentsList: any[];
  lowStockItems: any[];
}

import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clinicName, setClinicName] = useState("OPTIMUS VETERİNER KLİNİĞİ");

  // Load clinic name from settings
  useEffect(() => {
    async function loadClinicName() {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const settings = await response.json();
          if (settings.clinicName) {
            setClinicName(settings.clinicName);
          }
        }
      } catch (error) {
        console.error("Failed to load clinic name:", error);
      }
    }
    loadClinicName();
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const stats = await res.json();
          setData(stats);
        }
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-8 animate-pulse p-6">
        <div className="space-y-3">
          <div className="h-10 bg-slate-100 rounded-2xl w-64" />
          <div className="h-4 bg-slate-100 rounded-xl w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-[2rem]" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="h-96 bg-slate-100 rounded-[3rem]" />
          <div className="h-96 bg-slate-100 rounded-[3rem]" />
        </div>
      </div>
    );
  }

  const dashboardData = data || {
    summary: {
      todaySales: 0,
      totalCustomers: 0,
      totalAnimals: 0,
      pendingPayments: 0,
      criticalStock: 0,
    },
    todayAppointments: [],
    upcomingVaccines: [],
    pendingPaymentsList: [],
    lowStockItems: [],
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Page Header - Premium Style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter">
            Hoş Geldin,{" "}
            <span className="text-primary italic">
              {session?.user?.name || "Kullanıcı"}
            </span>{" "}
            👋
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            {clinicName}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            asChild
            className="rounded-2xl h-12 px-6 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 bg-slate-900 hover:bg-slate-800 transition-all border-none"
          >
            <Link href="/dashboard/sales/new">
              <ShoppingCart className="w-4 h-4 mr-2" />
              SATIŞ YAP
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6" />
              </div>
              <Badge
                variant="success"
                className="rounded-lg h-5 font-black text-[9px] uppercase"
              >
                GÜNLÜK
              </Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              BUGÜNKÜ SATIŞ
            </p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">
              {formatCurrency(dashboardData.summary.todaySales)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shadow-sm group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <Badge
                variant="info"
                className="rounded-lg h-5 font-black text-[9px] uppercase"
              >
                TOPLAM
              </Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              KAYITLI MÜŞTERİ
            </p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">
              {dashboardData.summary.totalCustomers}{" "}
              <span className="text-sm font-bold uppercase tracking-widest">
                MÜŞTERİ
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-sm group-hover:scale-110 transition-transform">
                <PawPrint className="w-6 h-6" />
              </div>
              <Badge
                variant="info"
                className="rounded-lg h-5 font-black text-[9px] uppercase bg-purple-500"
              >
                TOPLAM
              </Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              KAYITLI HAYVAN
            </p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">
              {dashboardData.summary.totalAnimals}{" "}
              <span className="text-sm font-bold uppercase tracking-widest">
                HAYVAN
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-sm group-hover:scale-110 transition-transform">
                <Briefcase className="w-6 h-6" />
              </div>
              <Badge
                variant="warning"
                className="rounded-lg h-5 font-black text-[9px] uppercase"
              >
                ALACAK
              </Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              BEKLEYEN ALACAKLAR
            </p>
            <p className="text-2xl font-black text-rose-600 tracking-tighter">
              {formatCurrency(dashboardData.summary.pendingPayments)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <Badge
                variant="destructive"
                className="rounded-lg h-5 font-black text-[9px] uppercase"
              >
                RİSK
              </Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              KRİTİK STOK ADY.
            </p>
            <p className="text-2xl font-black text-rose-600 tracking-tighter">
              {dashboardData.summary.criticalStock}{" "}
              <span className="text-sm font-bold uppercase tracking-widest">
                ÜRÜN
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modern Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            icon: ShoppingCart,
            label: "Hızlı Satış",
            href: "/dashboard/sales/new",
            color: "from-emerald-400 to-emerald-600",
          },
          {
            icon: Receipt,
            label: "Ürün Alımı",
            href: "/dashboard/purchases/new",
            color: "from-sky-400 to-sky-600",
          },
          {
            icon: Users,
            label: "Yeni Müşteri",
            href: "/dashboard/customers/new",
            color: "from-primary/70 to-primary",
          },
          {
            icon: PawPrint,
            label: "Hayvan Kaydı",
            href: "/dashboard/animals/new",
            color: "from-amber-400 to-amber-600",
          },
          {
            icon: Syringe,
            label: "Protokoller",
            href: "/dashboard/protocols",
            color: "from-rose-400 to-rose-600",
          },
          {
            icon: Calendar,
            label: "Ajanda",
            href: "/dashboard/calendar",
            color: "from-indigo-400 to-indigo-600",
          },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group flex flex-col items-center gap-4 p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm transition-all duration-500"
          >
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:rotate-12 transition-all duration-500`}
            >
              <action.icon className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">
              {action.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Main Dynamic Sections */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Appointments Section */}
        <Card className="rounded-[3rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-50 bg-slate-50/20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight">
                  Bugünkü Ajanda
                </CardTitle>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  AKTİF RANDEVULAR
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="rounded-xl hover:bg-white border-none text-primary font-black text-[10px] uppercase tracking-widest"
            >
              <Link
                href="/dashboard/calendar"
                className="flex items-center gap-2"
              >
                HEPSİ <ChevronRight className="w-3 h-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-8 space-y-4">
            {dashboardData.todayAppointments.length > 0 ? (
              dashboardData.todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 p-5 rounded-[2rem] bg-slate-50/50 border border-slate-100"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm font-black text-primary">
                    {apt.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className="text-[8px] font-black uppercase border-primary/20 text-primary px-1.5 h-4"
                      >
                        {apt.type || "MUAYENE"}
                      </Badge>
                      <span className="text-[10px] font-black text-slate-300">
                        •
                      </span>
                      <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">
                        {apt.animal}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 font-bold tracking-tight truncate">
                      {apt.customer}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-200" />
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-slate-50/30 rounded-[2.5rem] border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Calendar className="w-8 h-8 text-slate-100" />
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] italic">
                  BU SAATLİK RANDEVUNUZ BULUNMUYOR
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vaccines / Critical Tasks Section */}
        <Card className="rounded-[3rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-50 bg-slate-50/20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm">
                <Syringe className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight">
                  Kritik Görevler
                </CardTitle>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-rose-500/60">
                  ACİL AŞI & TAKİP
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-4">
            {dashboardData.upcomingVaccines.length > 0 ? (
              dashboardData.upcomingVaccines.map((vac) => (
                <div
                  key={vac.id}
                  className="flex items-center gap-4 p-5 rounded-[2rem] bg-rose-50/20 border border-rose-100/30"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-rose-100 shadow-sm">
                    <Star className="w-6 h-6 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-black text-slate-900 truncate tracking-tight uppercase leading-none">
                        {vac.animal}
                      </p>
                      <Badge className="text-[8px] font-black uppercase px-2 h-4 bg-rose-500 rounded-md">
                        BUGÜN
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-bold tracking-tight truncate flex items-center gap-1.5 mt-1">
                      <span className="w-1 h-1 rounded-full bg-rose-400" />
                      {vac.vaccine} • {vac.owner}
                    </p>
                  </div>
                  <Activity className="w-5 h-5 text-rose-200" />
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-slate-50/30 rounded-[2.5rem] border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Syringe className="w-8 h-8 text-slate-100" />
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] italic">
                  KRİTİK GÖREV KAYDI BULUNMUYOR
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Receivables List */}
        <Card className="rounded-[3rem] border-slate-100 shadow-sm overflow-hidden lg:col-span-1">
          <CardHeader className="pb-6 border-b border-slate-50 bg-slate-50/20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight">
                  Bekleyen Alacaklar
                </CardTitle>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  EN YÜKSEK BAKİYE
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-4">
            {dashboardData.pendingPaymentsList.length > 0 ? (
              dashboardData.pendingPaymentsList.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-4 p-5 rounded-[2rem] bg-slate-50/50 border border-slate-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-900 truncate tracking-tight uppercase">
                      {payment.customer}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-1 h-1 rounded-full bg-rose-500" />
                      <span className="text-[10px] text-rose-600 font-black uppercase tracking-widest leading-none">
                        RİSKLİ BAKİYE
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-rose-600 tracking-tighter tabular-nums">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-emerald-50/30 rounded-[2rem] border border-dashed border-emerald-100">
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em]">
                  TÜM ÖDEMELER GÜNCEL ✨
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Risk Monitor */}
        <Card className="rounded-[3rem] border-slate-100 shadow-sm overflow-hidden lg:col-span-1">
          <CardHeader className="pb-6 border-b border-slate-50 bg-slate-50/20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight">
                  Stok Monitörü
                </CardTitle>
                <p className="text-[10px] font-bold text-rose-500/60 uppercase tracking-widest">
                  TÜKENMEK ÜZERE OLANLAR
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-4">
            {dashboardData.lowStockItems.length > 0 ? (
              dashboardData.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 p-5 rounded-[2rem] bg-white border border-slate-100"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 border border-slate-50 shadow-sm">
                      <Package className="w-6 h-6 text-rose-500 opacity-60" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-slate-900 truncate uppercase tracking-tight mb-1">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                        KRİTİK: {item.critical}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="destructive"
                    className="font-black text-[11px] h-8 px-4 rounded-xl shadow-lg shadow-rose-500/20 flex flex-col items-center justify-center leading-none"
                  >
                    <span>{item.stock}</span>
                    <span className="text-[8px] mt-0.5 opacity-60">KALDI</span>
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-emerald-50/30 rounded-[2rem] border border-dashed border-emerald-100">
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em]">
                  STOKLAR YETERLİ SEVİYEDE
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer System Info */}
      <footer className="text-center py-12 border-t border-slate-100/50 mt-12 bg-white/40 rounded-t-[3rem] px-6">
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mb-2 leading-relaxed">
          OPTIMUS VETERINARY COMMAND CENTER v1.2.0 • AGENTIC SYSTEM ACTIVE
        </p>
        <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.2em] italic">
          DESIGNED FOR PROFESSIONAL CLINICAL EXCELLENCE
        </p>
      </footer>
    </div>
  );
}
