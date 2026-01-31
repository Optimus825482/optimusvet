"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Plus,
  FileText,
  Activity,
  Syringe,
  ArrowRight,
  Search,
  Loader2,
  Calendar,
  ChevronRight,
  Settings,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProtocolTemplate {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
  steps: {
    id: string;
    name: string;
    dayOffset: number;
    notes: string | null;
  }[];
}

export default function ProtocolsPage() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: protocols, isLoading } = useQuery<ProtocolTemplate[]>({
    queryKey: ["protocols"],
    queryFn: async () => {
      const res = await fetch("/api/protocols");
      if (!res.ok) throw new Error("Protokoller yüklenemedi");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/protocol-templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Silinemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
      toast({
        variant: "success",
        title: "Başarılı",
        description: "Protokol şablonu silindi",
      });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message,
      });
      setDeleteId(null);
    },
  });

  const filteredProtocols = protocols?.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            Protokol Şablonları
          </h1>
          <p className="text-muted-foreground">
            Tekrarlanan aşı ve tedavi şablonlarını yönetin
          </p>
        </div>
        <Button asChild className="shadow-lg shadow-primary/20">
          <Link href="/dashboard/protocols/new">
            <Plus className="w-4 h-4 mr-2" /> Yeni Şablon
          </Link>
        </Button>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-none shadow-xl transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Protokol ismi veya tipine göre ara..."
              className="pl-11 h-12 bg-background border-none shadow-sm text-lg focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="divide-y">
              {filteredProtocols?.map((p) => (
                <div
                  key={p.id}
                  className="p-6 hover:bg-primary/5 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "p-3 rounded-2xl shrink-0 group-hover:scale-110 transition-transform",
                          p.type === "VACCINATION"
                            ? "bg-emerald-100 text-emerald-600"
                            : p.type === "FERTILITY"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-blue-100 text-blue-600",
                        )}
                      >
                        {p.type === "VACCINATION" ? (
                          <Syringe className="w-6 h-6" />
                        ) : (
                          <Activity className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-xl">{p.name}</h3>
                          <Badge variant="outline" className="rounded-full">
                            {p.type === "VACCINATION"
                              ? "Aşılama"
                              : p.type === "FERTILITY"
                                ? "Fertilite"
                                : "Tedavi"}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-1">
                          {p.description || "Açıklama belirtilmemiş"}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {p.steps.map((step, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-md"
                            >
                              <span className="font-bold text-primary">
                                Gün {step.dayOffset}:
                              </span>
                              <span className="text-muted-foreground">
                                {step.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="hover:bg-primary/10"
                      >
                        <Link href={`/dashboard/protocols/${p.id}/edit`}>
                          <Edit className="w-5 h-5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteId(p.id)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                      <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
              {filteredProtocols?.length === 0 && (
                <div className="text-center py-20">
                  <FileText className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Protokol şablonu bulunamadı.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Protokol Şablonunu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu protokol şablonunu silmek istediğinize emin misiniz? Bu işlem
              geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
