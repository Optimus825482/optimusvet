"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  ShoppingCart,
  ArrowDownLeft,
  Syringe,
  Eye,
  Printer,
  FileText,
  Loader2,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  CalendarPlus,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addWeeks,
  subWeeks,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isToday,
  parseISO,
} from "date-fns";
import { tr } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

// Types
interface Transaction {
  id: string;
  code: string;
  type: "SALE" | "PURCHASE" | "TREATMENT";
  date: string;
  total: number;
  paidAmount: number;
  status: "PENDING" | "PARTIAL" | "PAID";
  createdAt: string;
  customer?: { name: string };
  supplier?: { name: string };
  animal?: { name: string };
}

interface Reminder {
  id: string;
  title: string;
  dueDate: string;
  type: string;
  animal?: { name: string; customer: { name: string } };
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "year">(
    "month",
  );
  const printRef = useRef<HTMLDivElement>(null);
  const [clinicSettings, setClinicSettings] = useState<{ name: string } | null>(
    null,
  );

  // Load clinic settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const settings = await response.json();
          setClinicSettings({ name: settings.clinicName || "OPTIMUS VET" });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
    loadSettings();
  }, []);

  // Data Fetching for the visible range
  const range = useMemo(() => {
    let start, end;
    if (viewMode === "month") {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    } else if (viewMode === "week") {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else if (viewMode === "year") {
      start = startOfYear(currentDate);
      end = endOfYear(currentDate);
    } else {
      start = currentDate;
      end = currentDate;
    }
    return { start, end };
  }, [currentDate, viewMode]);

  const { data: transactions, isLoading: isTxLoading } = useQuery<{
    transactions: Transaction[];
  }>({
    queryKey: ["calendar-tx", range.start, range.end],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("startDate", range.start.toISOString());
      params.set("endDate", range.end.toISOString());
      params.set("limit", "1000");
      params.set("dateField", "date"); // İşlem tarihine göre filtrele
      const res = await fetch(`/api/transactions?${params}`);
      if (!res.ok) throw new Error("İşlemler yüklenemedi");
      return res.json();
    },
  });

  const { data: reminders, isLoading: isRemLoading } = useQuery<{
    reminders: Reminder[];
  }>({
    queryKey: ["calendar-rem", range.start, range.end],
    queryFn: async () => {
      const res = await fetch(
        `/api/reminders?startDate=${range.start.toISOString()}&endDate=${range.end.toISOString()}&limit=1000`,
      );
      if (!res.ok) throw new Error("Hatırlatıcılar yüklenemedi");
      return res.json();
    },
  });

  const isLoading = isTxLoading || isRemLoading;

  // Helper functions
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const txs =
      transactions?.transactions.filter(
        (t) => format(new Date(t.date), "yyyy-MM-dd") === dateStr,
      ) || [];
    const rems =
      reminders?.reminders.filter(
        (r) => format(new Date(r.dueDate), "yyyy-MM-dd") === dateStr,
      ) || [];
    return { txs, rems };
  };

  const nextRange = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
    else if (viewMode === "year")
      setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1));
    else
      setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)));
  };

  const prevRange = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
    else if (viewMode === "year")
      setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1));
    else
      setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)));
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedDayData = useMemo(
    () => getEventsForDate(selectedDate),
    [selectedDate, transactions, reminders],
  );

  const totalsForSelected = useMemo(() => {
    const sales = selectedDayData.txs
      .filter((t) => t.type === "SALE" || t.type === "TREATMENT")
      .reduce((sum, t) => sum + (Number(t.total) || 0), 0);
    const purchases = selectedDayData.txs
      .filter((t) => t.type === "PURCHASE")
      .reduce((sum, t) => sum + (Number(t.total) || 0), 0);
    return { sales, purchases };
  }, [selectedDayData]);

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* Header / Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-primary" />
            Takvim & Ajanda
          </h1>
          <p className="text-muted-foreground">
            İşlemleri ve randevuları takip edin
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Selectors */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarPlus className="w-4 h-4" />
                Hızlı Seç
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  const today = new Date();
                  setCurrentDate(today);
                  setSelectedDate(today);
                  setViewMode("day");
                }}
              >
                📅 Bugün
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setCurrentDate(yesterday);
                  setSelectedDate(yesterday);
                  setViewMode("day");
                }}
              >
                ⏮️ Dün
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const today = new Date();
                  setCurrentDate(today);
                  setViewMode("week");
                }}
              >
                📆 Bu Hafta
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const lastWeek = new Date();
                  lastWeek.setDate(lastWeek.getDate() - 7);
                  setCurrentDate(lastWeek);
                  setViewMode("week");
                }}
              >
                ⏪ Geçen Hafta
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const today = new Date();
                  setCurrentDate(today);
                  setViewMode("month");
                }}
              >
                🗓️ Bu Ay
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const lastMonth = new Date();
                  lastMonth.setMonth(lastMonth.getMonth() - 1);
                  setCurrentDate(lastMonth);
                  setViewMode("month");
                }}
              >
                ◀️ Geçen Ay
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const today = new Date();
                  setCurrentDate(today);
                  setViewMode("year");
                }}
              >
                📅 Bu Yıl
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const lastYear = new Date();
                  lastYear.setFullYear(lastYear.getFullYear() - 1);
                  setCurrentDate(lastYear);
                  setViewMode("year");
                }}
              >
                ⏪ Geçen Yıl
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tabs
            value={viewMode}
            onValueChange={(v: any) => setViewMode(v)}
            className="w-auto"
          >
            <TabsList className="bg-card border h-10 p-1">
              <TabsTrigger value="day" className="px-3">
                Gün
              </TabsTrigger>
              <TabsTrigger value="week" className="px-3">
                Hafta
              </TabsTrigger>
              <TabsTrigger value="month" className="px-3">
                Ay
              </TabsTrigger>
              <TabsTrigger value="year" className="px-3">
                Yıl
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1 bg-card border rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevRange}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="px-2 h-8 font-medium"
            >
              Bugün
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextRange}
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button asChild className="hidden sm:flex">
            <Link href="/dashboard/calendar/new">
              <Plus className="w-4 h-4 mr-2" /> Hatırlatıcı Ekle
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main Calendar View */}
        <Card className="lg:col-span-3 border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="py-4 px-6 border-b bg-muted/30">
            <CardTitle className="text-xl capitalize">
              {format(currentDate, viewMode === "year" ? "yyyy" : "MMMM yyyy", {
                locale: tr,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {viewMode === "month" && (
              <MonthView
                currentDate={currentDate}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                getEvents={getEventsForDate}
                onPrevMonth={() => setCurrentDate(subMonths(currentDate, 1))}
                onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
              />
            )}
            {viewMode === "week" && (
              <WeekView
                currentDate={currentDate}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                getEvents={getEventsForDate}
                onPrevWeek={() => setCurrentDate(subWeeks(currentDate, 1))}
                onNextWeek={() => setCurrentDate(addWeeks(currentDate, 1))}
              />
            )}
            {viewMode === "day" && (
              <DayView
                selectedDate={selectedDate}
                data={selectedDayData}
                onPrevDay={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() - 1);
                  setSelectedDate(newDate);
                  setCurrentDate(newDate);
                }}
                onNextDay={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 1);
                  setSelectedDate(newDate);
                  setCurrentDate(newDate);
                }}
              />
            )}
            {viewMode === "year" && (
              <YearView
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                setViewMode={setViewMode}
              />
            )}

            {isLoading && (
              <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Selected Day Details */}
        <div className="space-y-6 print:hidden">
          <Card className="border-primary/20 shadow-lg border-2">
            <CardHeader className="bg-primary/5 border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {format(selectedDate, "d MMMM EEEE", { locale: tr })}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Printer className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-2" /> Yazdır
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="w-4 h-4 mr-2" /> PDF Kaydet
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              {/* Summary Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">
                    Satışlar
                  </div>
                  <div className="text-lg font-bold text-emerald-700">
                    {formatCurrency(totalsForSelected.sales)}
                  </div>
                  <div className="text-[10px] text-emerald-500">
                    {
                      selectedDayData.txs.filter((t) => t.type !== "PURCHASE")
                        .length
                    }{" "}
                    İşlem
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                  <div className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mb-1">
                    Alımlar
                  </div>
                  <div className="text-lg font-bold text-rose-700">
                    {formatCurrency(totalsForSelected.purchases)}
                  </div>
                  <div className="text-[10px] text-rose-500">
                    {
                      selectedDayData.txs.filter((t) => t.type === "PURCHASE")
                        .length
                    }{" "}
                    İşlem
                  </div>
                </div>
              </div>

              {/* Activity List */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Günlük Akış
                </h4>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                  {/* Appointments / Reminders */}
                  {selectedDayData.rems.map((rem) => (
                    <div
                      key={rem.id}
                      className="flex gap-3 p-3 rounded-lg border bg-blue-50/30 border-blue-100 hover:border-blue-300 transition-colors group"
                    >
                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                        <Syringe className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {rem.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {rem.animal?.name} ({rem.animal?.customer.name})
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Sales/Purchases */}
                  {selectedDayData.txs.map((tx) => {
                    const isPaid = tx.status === "PAID";
                    const isPartial = tx.status === "PARTIAL";
                    const remaining =
                      (Number(tx.total) || 0) - (Number(tx.paidAmount) || 0);

                    return (
                      <Link
                        href={`/dashboard/${tx.type === "PURCHASE" ? "purchases" : "sales"}/${tx.id}`}
                        key={tx.id}
                        className={cn(
                          "flex gap-3 p-3 rounded-lg border transition-colors group",
                          tx.type === "PURCHASE"
                            ? "bg-rose-50/30 border-rose-100 hover:border-rose-300"
                            : "bg-emerald-50/30 border-emerald-100 hover:border-emerald-300",
                        )}
                      >
                        <div
                          className={cn(
                            "p-2 rounded-lg group-hover:scale-110 transition-transform",
                            tx.type === "PURCHASE"
                              ? "bg-rose-100 text-rose-600"
                              : "bg-emerald-100 text-emerald-600",
                          )}
                        >
                          {tx.type === "PURCHASE" ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ShoppingCart className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-sm truncate">
                              {tx.code}
                            </div>
                            <div className="text-xs font-bold whitespace-nowrap">
                              {formatCurrency(tx.total || 0)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[10px] text-muted-foreground truncate">
                              {tx.customer?.name ||
                                tx.supplier?.name ||
                                "Perakende"}
                            </div>
                            {isPartial && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200"
                              >
                                Kısmi: {formatCurrency(remaining)}
                              </Badge>
                            )}
                            {isPaid && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200"
                              >
                                Ödendi
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}

                  {selectedDayData.txs.length === 0 &&
                    selectedDayData.rems.length === 0 && (
                      <div className="text-center py-8">
                        <CalendarCheck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Bugün için kayıt yok
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full border-dashed" asChild>
            <Link href="/dashboard/calendar/new">
              <Plus className="w-4 h-4 mr-2" /> Yeni Hatırlatıcı
            </Link>
          </Button>
        </div>
      </div>

      {/* Print Only Content */}
      <div className="hidden print:block p-8">
        <div className="border-b pb-4 mb-8">
          <h1 className="text-2xl font-bold">
            GÜNLÜK RAPOR - {clinicSettings?.name || "OPTIMUS VET"}
          </h1>
          <p className="text-lg">
            {format(selectedDate, "d MMMM yyyy EEEE", { locale: tr })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="p-4 border rounded">
            <h2 className="font-bold mb-2">SATIŞ ÖZETİ</h2>
            <div className="text-2xl font-bold">
              {formatCurrency(totalsForSelected.sales)}
            </div>
            <p>
              {selectedDayData.txs.filter((t) => t.type !== "PURCHASE").length}{" "}
              İşlem
            </p>
          </div>
          <div className="p-4 border rounded">
            <h2 className="font-bold mb-2">ALIM ÖZETİ</h2>
            <div className="text-2xl font-bold">
              {formatCurrency(totalsForSelected.purchases)}
            </div>
            <p>
              {selectedDayData.txs.filter((t) => t.type === "PURCHASE").length}{" "}
              İşlem
            </p>
          </div>
        </div>

        <h2 className="font-bold text-lg mb-4 border-b">İŞLEM LİSTESİ</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left bg-gray-50">
              <th className="p-2">Kod/İşlem</th>
              <th className="p-2">Müşteri/Tedarikçi</th>
              <th className="p-2">Tür</th>
              <th className="p-2 text-right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {selectedDayData.txs.map((tx) => (
              <tr key={tx.id} className="border-b">
                <td className="p-2">{tx.code}</td>
                <td className="p-2">
                  {tx.customer?.name || tx.supplier?.name || "-"}
                </td>
                <td className="p-2">
                  {tx.type === "PURCHASE" ? "Alım" : "Satış"}
                </td>
                <td className="p-2 text-right font-bold">
                  {formatCurrency(tx.total || 0)}
                  {tx.status === "PARTIAL" && (
                    <span className="text-xs text-amber-600 ml-2">
                      (Kısmi:{" "}
                      {formatCurrency((tx.total || 0) - (tx.paidAmount || 0))})
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {selectedDayData.txs.length === 0 && (
          <p className="py-4 text-center italic">İşlem kaydı bulunmuyor.</p>
        )}
      </div>
    </div>
  );
}

// Sub-components for Views
function MonthView({
  currentDate,
  selectedDate,
  setSelectedDate,
  getEvents,
  onPrevMonth,
  onNextMonth,
}: any) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="bg-card relative">
      {/* Navigation Arrows */}
      <div className="absolute top-2 left-2 right-2 flex justify-between z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevMonth}
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNextMonth}
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day Header */}
      <div className="grid grid-cols-7 border-b pt-12">
        {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d, i) => (
          <div
            key={d}
            className={cn(
              "py-3 text-center text-xs font-bold text-muted-foreground border-r last:border-r-0",
              (i === 5 || i === 6) && "text-rose-500 bg-rose-50/30",
            )}
          >
            {d}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 border-b last:border-b-0">
        {calendarDays.map((date, idx) => {
          const isSelected = isSameDay(date, selectedDate);
          const isCurrentMonth = isSameMonth(date, monthStart);
          const { txs, rems } = getEvents(date);
          const hasActivity = txs.length > 0 || rems.length > 0;

          return (
            <div
              key={date.toString()}
              onClick={() => setSelectedDate(date)}
              className={cn(
                "min-h-[110px] p-2 border-r border-b group transition-all duration-200 cursor-pointer relative",
                !isCurrentMonth
                  ? "bg-muted/10 opacity-40"
                  : "bg-card hover:bg-muted/30",
                isSelected &&
                  "bg-primary/5 ring-1 ring-inset ring-primary z-10",
                idx % 7 === 6 && "border-r-0",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center w-7 h-7 text-sm font-bold rounded-full mb-1",
                  isToday(date)
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : isSelected
                      ? "text-primary"
                      : "text-foreground",
                )}
              >
                {format(date, "d")}
              </span>

              <div className="space-y-1">
                {txs.length > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-medium text-emerald-600">
                      {formatCurrency(
                        txs.reduce(
                          (s: any, t: any) => s + (Number(t.total) || 0),
                          0,
                        ),
                      )}
                    </span>
                  </div>
                )}
                {rems.length > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-medium text-blue-600">
                      {rems.length} Randevu
                    </span>
                  </div>
                )}
              </div>

              {hasActivity && (
                <div className="absolute top-2 right-2 flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  currentDate,
  selectedDate,
  setSelectedDate,
  getEvents,
  onPrevWeek,
  onNextWeek,
}: any) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="relative">
      {/* Navigation Arrows */}
      <div className="absolute top-2 left-2 right-2 flex justify-between z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevWeek}
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNextWeek}
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 min-h-[500px] pt-12">
        {days.map((date, idx) => {
          const { txs, rems } = getEvents(date);
          const isSelected = isSameDay(date, selectedDate);
          return (
            <div
              key={idx}
              className={cn(
                "border-r last:border-r-0 p-4 transition-colors cursor-pointer",
                isSelected ? "bg-primary/5" : "hover:bg-muted/10",
              )}
              onClick={() => setSelectedDate(date)}
            >
              <div className="text-center mb-6">
                <div className="text-xs text-muted-foreground uppercase font-bold mb-1">
                  {format(date, "EEE", { locale: tr })}
                </div>
                <div
                  className={cn(
                    "text-2xl font-black rounded-full w-10 h-10 flex items-center justify-center mx-auto",
                    isToday(date)
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground",
                  )}
                >
                  {format(date, "d")}
                </div>
              </div>

              <div className="space-y-2">
                {rems.map((r: any) => (
                  <div
                    key={r.id}
                    className="text-[10px] bg-blue-100/50 text-blue-700 p-1.5 rounded-md border border-blue-200"
                  >
                    <div className="font-bold truncate">{r.title}</div>
                  </div>
                ))}
                {txs.map((t: any) => (
                  <div
                    key={t.id}
                    className={cn(
                      "text-[10px] p-1.5 rounded-md border",
                      t.type === "PURCHASE"
                        ? "bg-rose-100/50 text-rose-700 border-rose-200"
                        : "bg-emerald-100/50 text-emerald-700 border-emerald-200",
                    )}
                  >
                    <div className="font-bold">
                      {formatCurrency(t.total || 0)}
                    </div>
                    {t.status === "PARTIAL" && (
                      <div className="text-[8px] text-amber-600">Kısmi</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ selectedDate, data, onPrevDay, onNextDay }: any) {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center bg-card relative">
      {/* Navigation Arrows */}
      <div className="absolute top-4 left-4 right-4 flex justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevDay}
          className="h-10 w-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNextDay}
          className="h-10 w-10"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <CalendarRange className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">
        {format(selectedDate, "d MMMM yyyy", { locale: tr })}
      </h2>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Bu gün için {data.txs.length} finansal işlem ve {data.rems.length}{" "}
        randevu kaydı bulunmaktadır.
      </p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <Card className="p-4 bg-muted/20 text-center border-none shadow-none">
          <div className="text-3xl font-black text-primary">
            {data.txs.length}
          </div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            İşlemler
          </div>
        </Card>
        <Card className="p-4 bg-muted/20 text-center border-none shadow-none">
          <div className="text-3xl font-black text-primary">
            {data.rems.length}
          </div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Randevular
          </div>
        </Card>
      </div>
    </div>
  );
}

function YearView({ currentDate, setCurrentDate, setViewMode }: any) {
  const months = eachMonthOfInterval({
    start: startOfYear(currentDate),
    end: endOfYear(currentDate),
  });

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-4 p-6 bg-card">
      {months.map((m) => (
        <button
          key={m.toString()}
          onClick={() => {
            setCurrentDate(m);
            setViewMode("month");
          }}
          className="p-6 rounded-2xl border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 transition-all group flex flex-col items-center justify-center gap-2"
        >
          <div className="text-lg font-bold group-hover:text-primary transition-colors">
            {format(m, "MMMM", { locale: tr })}
          </div>
          <CalendarDays className="w-5 h-5 text-muted-foreground group-hover:text-primary/70 transition-colors" />
        </button>
      ))}
    </div>
  );
}
