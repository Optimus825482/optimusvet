"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Weight,
  Palette,
  Cpu,
  User,
  Phone,
  Syringe,
  Heart,
  FileText,
  Plus,
  MoreVertical,
  Clock,
  CheckCircle2,
  AlertCircle,
  Dna,
  History,
  Info,
  Activity,
  ChevronRight,
  PawPrint,
  Pill,
  Stethoscope,
  XCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignProtocolModal } from "@/components/protocols/assign-protocol-modal";
import { IllnessFormModal } from "@/components/illnesses/illness-form-modal";
import { TreatmentFormModal } from "@/components/illnesses/treatment-form-modal";

const speciesIcons: Record<string, string> = {
  DOG: "🐕",
  CAT: "🐈",
  BIRD: "🐦",
  RABBIT: "🐰",
  FISH: "🐟",
  REPTILE: "🦎",
  RODENT: "🐹",
  HORSE: "🐴",
  CATTLE: "🐄",
  SHEEP: "🐑",
  GOAT: "🐐",
  OTHER: "🐾",
};

const speciesLabels: Record<string, string> = {
  DOG: "Köpek",
  CAT: "Kedi",
  BIRD: "Kuş",
  RABBIT: "Tavşan",
  FISH: "Balık",
  REPTILE: "Sürüngen",
  RODENT: "Kemirgen",
  HORSE: "At",
  CATTLE: "Sığır",
  SHEEP: "Koyun",
  GOAT: "Keçi",
  OTHER: "Diğer",
};

const speciesColors: Record<string, string> = {
  DOG: "bg-amber-50 text-amber-600",
  CAT: "bg-orange-50 text-orange-600",
  BIRD: "bg-sky-50 text-sky-600",
  RABBIT: "bg-pink-50 text-pink-600",
  FISH: "bg-blue-50 text-blue-600",
  REPTILE: "bg-green-50 text-green-600",
  RODENT: "bg-yellow-50 text-yellow-600",
  HORSE: "bg-amber-100 text-amber-900 border-amber-200",
  CATTLE: "bg-stone-50 text-stone-600",
  SHEEP: "bg-slate-50 text-slate-600",
  GOAT: "bg-zinc-50 text-zinc-600",
  OTHER: "bg-purple-50 text-purple-600",
};

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function calculateAge(birthDate: string | Date): string {
  const today = new Date();
  const birth = new Date(birthDate);
  const years = today.getFullYear() - birth.getFullYear();
  const months = today.getMonth() - birth.getMonth();

  if (years > 0) {
    const remainingMonths = months < 0 ? 12 + months : months;
    if (remainingMonths > 0) {
      return `${years} yıl ${remainingMonths} ay`;
    }
    return `${years} yıl`;
  } else if (months > 0) {
    return `${months} ay`;
  } else {
    const days = Math.floor(
      (today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24),
    );
    return `${days} gün`;
  }
}

function getProtocolStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return (
        <Badge
          variant="success"
          className="rounded-lg font-black text-[10px] uppercase"
        >
          Tamamlandı
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge
          variant="info"
          className="rounded-lg font-black text-[10px] uppercase"
        >
          Devam Ediyor
        </Badge>
      );
    case "PENDING":
      return (
        <Badge
          variant="warning"
          className="rounded-lg font-black text-[10px] uppercase"
        >
          Bekliyor
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge
          variant="outline"
          className="rounded-lg font-black text-[10px] uppercase opacity-50"
        >
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

export default function AnimalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const animalId = params.id as string;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignProtocolOpen, setAssignProtocolOpen] = useState(false);
  const [illnessModalOpen, setIllnessModalOpen] = useState(false);
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [selectedIllness, setSelectedIllness] = useState<string | null>(null);

  // Fetch animal details
  const { data: animal, isLoading } = useQuery({
    queryKey: ["animal", animalId],
    queryFn: async () => {
      const res = await fetch(`/api/animals/${animalId}`);
      if (!res.ok) throw new Error("Hayvan bulunamadı");
      return res.json();
    },
  });

  // Fetch illnesses
  const { data: illnesses = [], isLoading: illnessesLoading } = useQuery({
    queryKey: ["illnesses", animalId],
    queryFn: async () => {
      const res = await fetch(`/api/animals/${animalId}/illnesses`);
      if (!res.ok) throw new Error("Hastalıklar yüklenemedi");
      return res.json();
    },
    enabled: !!animalId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/animals/${animalId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Silme başarısız");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      router.push("/dashboard/animals");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
          <PawPrint className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-slate-500 font-bold tracking-tight">
          Hayvan bulunamadı
        </p>
        <Button
          variant="outline"
          asChild
          className="rounded-xl border-slate-200"
        >
          <Link href="/dashboard/animals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Hayvanlara Dön
          </Link>
        </Button>
      </div>
    );
  }

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
            <Link href="/dashboard/animals">
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div
              className={`h-16 w-16 rounded-[2rem] flex items-center justify-center text-4xl shadow-lg border border-white/20 transition-transform ${
                speciesColors[animal.species] || "bg-slate-50 text-slate-600"
              }`}
            >
              {speciesIcons[animal.species] || "🐾"}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {animal.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className="text-[10px] font-black uppercase border-slate-200 text-slate-500"
                >
                  {speciesLabels[animal.species] || animal.species}
                </Badge>
                {animal.breed && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-black uppercase bg-slate-100 text-slate-600"
                  >
                    {animal.breed}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            asChild
            className="rounded-xl shadow-sm bg-white border-slate-200"
          >
            <Link href={`/dashboard/animals/${animalId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Düzenle
            </Link>
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
                className="rounded-lg py-2 cursor-pointer"
                onClick={() => setAssignProtocolOpen(true)}
              >
                <Syringe className="h-4 w-4 mr-2 text-primary" />
                Protokol Ata
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-600 rounded-lg py-2 cursor-pointer"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Kaydı Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Genetics & Traits */}
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/20">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500">
              <Dna className="w-4 h-4 text-primary" />
              GENETİK & ÖZELLİKLER
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Cinsiyet
                </label>
                <div className="mt-1">
                  <Badge
                    variant={animal.gender === "MALE" ? "default" : "secondary"}
                    className="rounded-lg font-black text-[10px] uppercase shadow-sm"
                  >
                    {animal.gender === "MALE" ? "♂ Erkek" : "♀ Dişi"}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Renk / Desen
                </label>
                <p className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <Palette className="h-3.5 w-3.5 text-slate-300" />
                  {animal.color || "-"}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary/60" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      YAŞ DURUMU
                    </p>
                    <p className="text-sm font-black text-slate-800 tracking-tight mt-0.5">
                      {calculateAge(animal.birthDate)}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-slate-400">
                  {formatDate(animal.birthDate)}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Weight className="w-4 h-4 text-emerald-500/60" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      AĞIRLIK
                    </p>
                    <p className="text-sm font-black text-slate-800 tracking-tight mt-0.5">
                      {animal.weight || "0"} KG
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-500/60" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      MİKROÇİP NO
                    </p>
                    <p className="text-sm font-black text-slate-800 tracking-tight mt-0.5 font-mono">
                      {animal.microchip || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Protocols Summary (Main Interaction) */}
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-slate-900 text-white">
          <CardContent className="p-8 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-xl">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/60 leading-none mb-1">
                    Sağlık Takibi
                  </h3>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">
                    AKTİF PROTOKOLLER
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-black tracking-tighter text-primary">
                    {animal.protocols?.filter(
                      (p: any) => p.status === "IN_PROGRESS",
                    ).length || 0}
                  </p>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                    DEVAM EDEN
                  </p>
                </div>
                <div className="flex items-center gap-4 py-4 border-t border-white/5 mt-4">
                  <div>
                    <p className="text-xl font-black text-emerald-400 leading-none">
                      {animal.protocols?.filter(
                        (p: any) => p.status === "COMPLETED",
                      ).length || 0}
                    </p>
                    <p className="text-[9px] font-bold text-white/30 uppercase mt-1">
                      BİTEN
                    </p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-rose-400 leading-none">
                      {animal.protocols?.filter(
                        (p: any) => p.status === "CANCELLED",
                      ).length || 0}
                    </p>
                    <p className="text-[9px] font-bold text-white/30 uppercase mt-1">
                      İPTAL
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              asChild
              className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 mt-6"
            >
              <button onClick={() => setAssignProtocolOpen(true)}>
                YENİ PROTOKOL BAŞLAT
              </button>
            </Button>
          </CardContent>
        </Card>

        {/* Owner Info Card */}
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="pb-4 border-b border-slate-50">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500">
              <User className="w-4 h-4 text-emerald-600" />
              SAHİP BİLGİSİ
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 flex-1 flex flex-col">
            {animal.customer ? (
              <div className="space-y-8 flex-1 flex flex-col">
                <Link
                  href={`/dashboard/customers/${animal.customer.id}`}
                  className="flex items-center gap-4 p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all group"
                >
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-emerald-500/20 transition-transform">
                    {animal.customer.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 group-hover:text-primary transition-colors truncate">
                      {animal.customer.name}
                    </p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                      {animal.customer.code}
                    </p>
                  </div>
                </Link>

                <div className="space-y-4 mt-auto">
                  {animal.customer.phone && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          İLETİŞİM
                        </span>
                      </div>
                      <a
                        href={`tel:${animal.customer.phone}`}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {animal.customer.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 flex-1 flex flex-col justify-center bg-slate-50/20 rounded-3xl border border-dashed border-slate-200">
                <User className="h-12 w-12 mx-auto text-slate-200 mb-4" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic leading-relaxed px-6">
                  SAHİP BİLGİSİ ATANMAMIŞ
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Interaction */}
      <Tabs defaultValue="protocols" className="space-y-6">
        <Card className="rounded-[3rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-50 bg-slate-50/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-slate-800 tracking-tight">
                  Sağlık Kayıtları
                </CardTitle>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                  PROTOKOLLER & HASTALIKLAR
                </p>
              </div>
            </div>

            <TabsList className="bg-slate-100/50 p-1 rounded-xl h-10 border border-slate-100">
              <TabsTrigger
                value="protocols"
                className="rounded-lg px-4 text-[10px] font-black uppercase"
              >
                PROTOKOLLER
              </TabsTrigger>
              <TabsTrigger
                value="illnesses"
                className="rounded-lg px-4 text-[10px] font-black uppercase"
              >
                HASTALIKLAR
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-8">
            {/* Protocols Tab */}
            <TabsContent
              value="protocols"
              className="space-y-4 animate-slideUp"
            >
              {animal.protocols?.length > 0 ? (
                <div className="space-y-4">
                  {animal.protocols.map((protocol: any) => (
                    <ProtocolCard key={protocol.id} protocol={protocol} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-50/20 rounded-[3rem] border-2 border-dashed border-slate-100">
                  <Syringe className="h-16 w-16 mx-auto text-slate-100 mb-6" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
                    Henüz protokol kaydı bulunmuyor
                  </p>
                  <Button
                    variant="outline"
                    asChild
                    className="mt-6 rounded-xl border-slate-200 bg-white"
                  >
                    <button onClick={() => setAssignProtocolOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      İlk Protokolü Başlat
                    </button>
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Illnesses Tab */}
            <TabsContent
              value="illnesses"
              className="space-y-4 animate-slideUp"
            >
              {illnessesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : illnesses.length > 0 ? (
                <div className="space-y-4">
                  {illnesses.map((illness: any) => (
                    <IllnessCard
                      key={illness.id}
                      illness={illness}
                      onAddTreatment={(illnessId: string) => {
                        setSelectedIllness(illnessId);
                        setTreatmentModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-50/20 rounded-[3rem] border-2 border-dashed border-slate-100">
                  <Stethoscope className="h-16 w-16 mx-auto text-slate-100 mb-6" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
                    Henüz hastalık kaydı bulunmuyor
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6 rounded-xl border-slate-200 bg-white"
                    onClick={() => setIllnessModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    İlk Hastalık Kaydını Ekle
                  </Button>
                </div>
              )}

              {/* Add Illness Button (when there are illnesses) */}
              {illnesses.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-slate-200 bg-white h-12 font-bold"
                  onClick={() => setIllnessModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Hastalık Kaydı Ekle
                </Button>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Notes Card */}
      {animal.notes && (
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-50">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500 font-mono">
              <FileText className="w-4 h-4" />
              DİĞER NOTLAR
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="p-6 rounded-[2rem] bg-amber-50/30 border border-amber-100/50 text-slate-700 leading-relaxed italic text-sm">
              {animal.notes}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <footer className="text-center py-12 border-t border-slate-100/50 mt-12 bg-white/30 rounded-t-[3rem]">
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
          OPTIMUS VET PE-TARE® ANIMAL MONITORING SYSTEM v1.0
        </p>
      </footer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 max-w-md animate-scaleIn">
          <DialogHeader>
            <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8 text-rose-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
              Kaydı Sil
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium py-4">
              <strong className="text-slate-900 underline decoration-rose-500/30">
                {animal.name}
              </strong>{" "}
              isimli hayvan kaydını silmek istediğinize emin misiniz? Bu işlem
              geri alınamaz.
              {animal.protocols?.length > 0 && (
                <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-100">
                  <p className="text-rose-600 text-[10px] font-black tracking-widest uppercase">
                    KRİTİK UYARI
                  </p>
                  <p className="text-rose-500/80 text-xs mt-1 font-bold">
                    Bu hayvana ait {animal.protocols.length} protokol kaydı da
                    kalıcı olarak silinecektir.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl border-slate-200 font-bold h-12 flex-1"
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="rounded-xl font-bold h-12 flex-1 shadow-lg shadow-rose-500/20"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Kaydı Kalıcı Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Protocol Modal */}
      <AssignProtocolModal
        open={assignProtocolOpen}
        onOpenChange={setAssignProtocolOpen}
        animalId={animalId}
        animalSpecies={animal.species}
      />

      {/* Illness Form Modal */}
      <IllnessFormModal
        open={illnessModalOpen}
        onOpenChange={setIllnessModalOpen}
        animalId={animalId}
      />

      {/* Treatment Form Modal */}
      <TreatmentFormModal
        open={treatmentModalOpen}
        onOpenChange={setTreatmentModalOpen}
        illnessId={selectedIllness || ""}
        animalId={animalId}
      />
    </div>
  );
}

function ProtocolCard({ protocol }: { protocol: any }) {
  const completedSteps =
    protocol.steps?.filter((s: any) => s.status === "COMPLETED").length || 0;
  const totalSteps = protocol.steps?.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const nextStep = protocol.steps?.find((s: any) => s.status !== "COMPLETED");

  return (
    <Link
      href={`/dashboard/protocols/${protocol.id}`}
      className="block p-5 rounded-[2rem] border border-slate-100 bg-white hover:bg-slate-50 transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform ${
              protocol.type === "VACCINATION"
                ? "bg-sky-50 text-sky-600"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            {protocol.type === "VACCINATION" ? (
              <Syringe className="h-6 w-6" />
            ) : (
              <Heart className="h-6 w-6" />
            )}
          </div>
          <div>
            <p className="font-black text-slate-900 text-lg group-hover:text-primary transition-colors tracking-tight">
              {protocol.template?.name ||
                (protocol.type === "VACCINATION"
                  ? "Aşı Protokolü"
                  : "Üreme Protokolü")}
            </p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
              BAŞLANGIÇ: {formatDate(protocol.startDate)}
            </p>
          </div>
        </div>

        {getProtocolStatusBadge(protocol.status)}
      </div>

      {/* Progress Bar with Better Styling */}
      <div className="mt-8 space-y-2">
        <div className="flex justify-between items-end px-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            TAMAMLANMA ORANI
          </span>
          <span className="text-xs font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
            {completedSteps}/{totalSteps}
          </span>
        </div>
        <div className="h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out-expo shadow-inner bg-gradient-to-r ${
              progress === 100
                ? "from-emerald-400 to-emerald-600"
                : "from-primary/60 to-primary shadow-primary/20"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Sub-footer inside card */}
      <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
        {nextStep ? (
          <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform">
            <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              SIRADAKİ: <span className="text-slate-900">{nextStep.name}</span>{" "}
              • {formatDate(nextStep.scheduledDate)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
              TÜM ADIMLAR TAMAMLANDI
            </span>
          </div>
        )}
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

function IllnessCard({
  illness,
  onAddTreatment,
}: {
  illness: any;
  onAddTreatment: (illnessId: string) => void;
}) {
  const severityColors = {
    MILD: "bg-blue-50 text-blue-600 border-blue-100",
    MODERATE: "bg-amber-50 text-amber-600 border-amber-100",
    SEVERE: "bg-rose-50 text-rose-600 border-rose-100",
    CRITICAL: "bg-red-50 text-red-600 border-red-100",
  };

  const statusColors = {
    ACTIVE: "bg-orange-50 text-orange-600",
    RECOVERING: "bg-sky-50 text-sky-600",
    RECOVERED: "bg-emerald-50 text-emerald-600",
    CHRONIC: "bg-purple-50 text-purple-600",
  };

  const statusLabels = {
    ACTIVE: "Aktif",
    RECOVERING: "İyileşiyor",
    RECOVERED: "İyileşti",
    CHRONIC: "Kronik",
  };

  const severityLabels = {
    MILD: "Hafif",
    MODERATE: "Orta",
    SEVERE: "Ciddi",
    CRITICAL: "Kritik",
  };

  return (
    <div className="p-6 rounded-[2rem] border border-slate-100 bg-white hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center shadow-lg">
            <Stethoscope className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg tracking-tight">
              {illness.name}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
              TANI TARİHİ: {formatDate(illness.diagnosisDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            className={`rounded-lg font-black text-[10px] uppercase ${
              statusColors[illness.status as keyof typeof statusColors]
            }`}
          >
            {statusLabels[illness.status as keyof typeof statusLabels]}
          </Badge>
          <Badge
            className={`rounded-lg font-black text-[10px] uppercase border ${
              severityColors[illness.severity as keyof typeof severityColors]
            }`}
          >
            {severityLabels[illness.severity as keyof typeof severityLabels]}
          </Badge>
        </div>
      </div>

      {/* Symptoms */}
      {illness.symptoms && (
        <div className="mb-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
            BELİRTİLER
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {illness.symptoms}
          </p>
        </div>
      )}

      {/* Diagnosis */}
      {illness.diagnosis && (
        <div className="mb-4 p-4 rounded-xl bg-blue-50/30 border border-blue-100">
          <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">
            TANI
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {illness.diagnosis}
          </p>
        </div>
      )}

      {/* Treatments */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              TEDAVİLER ({illness.treatments?.length || 0})
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg h-8 text-[10px] font-black uppercase"
            onClick={() => onAddTreatment(illness.id)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Tedavi Ekle
          </Button>
        </div>

        {illness.treatments && illness.treatments.length > 0 ? (
          <div className="space-y-2">
            {illness.treatments.map((treatment: any) => (
              <div
                key={treatment.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Pill className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {treatment.medication}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {treatment.dosage} • {treatment.frequency}
                    </p>
                  </div>
                </div>
                <Badge
                  className={`rounded-lg font-black text-[10px] uppercase ${
                    treatment.status === "COMPLETED"
                      ? "bg-emerald-50 text-emerald-600"
                      : treatment.status === "IN_PROGRESS"
                        ? "bg-sky-50 text-sky-600"
                        : "bg-slate-50 text-slate-600"
                  }`}
                >
                  {treatment.status === "COMPLETED"
                    ? "Tamamlandı"
                    : treatment.status === "IN_PROGRESS"
                      ? "Devam Ediyor"
                      : "Bekliyor"}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-slate-50/20 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-400 font-medium">
              Henüz tedavi kaydı yok
            </p>
          </div>
        )}
      </div>

      {/* Recovery Date */}
      {illness.recoveryDate && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
            İYİLEŞME TARİHİ: {formatDate(illness.recoveryDate)}
          </span>
        </div>
      )}
    </div>
  );
}
