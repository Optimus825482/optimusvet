"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AssignProtocolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animalId: string;
  animalSpecies: string;
}

interface Protocol {
  id: string;
  name: string;
  type: string;
  species: string[];
  description: string | null;
  steps: {
    id: string;
    name: string;
    dayOffset: number;
  }[];
}

export function AssignProtocolModal({
  open,
  onOpenChange,
  animalId,
  animalSpecies,
}: AssignProtocolModalProps) {
  const queryClient = useQueryClient();
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");

  // Fetch available protocols filtered by animal species
  const { data: protocols, isLoading } = useQuery<Protocol[]>({
    queryKey: ["protocols", animalSpecies],
    queryFn: async () => {
      const res = await fetch("/api/protocols");
      if (!res.ok) throw new Error("Protokoller yüklenemedi");
      const data = await res.json();
      // Filter protocols that match animal species or have no species restriction
      return data.filter(
        (p: Protocol) =>
          p.species.length === 0 || p.species.includes(animalSpecies),
      );
    },
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/protocols/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animalId,
          protocolId: selectedProtocolId,
          startDate: startDate.toISOString(),
          notes,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Protokol atanamadı");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animal", animalId] });
      toast({
        variant: "success",
        title: "Başarılı",
        description: "Protokol hayvana atandı",
      });
      onOpenChange(false);
      // Reset form
      setSelectedProtocolId("");
      setStartDate(new Date());
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message,
      });
    },
  });

  const selectedProtocol = protocols?.find((p) => p.id === selectedProtocolId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProtocolId) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen bir protokol seçin",
      });
      return;
    }
    assignMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Protokol Ata</DialogTitle>
          <DialogDescription>
            Hayvana bir protokol atayın ve başlangıç tarihini belirleyin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="protocol">Protokol Seçin *</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <Select
                value={selectedProtocolId}
                onValueChange={setSelectedProtocolId}
              >
                <SelectTrigger id="protocol" className="h-12">
                  <SelectValue placeholder="Protokol seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {protocols?.map((protocol) => (
                    <SelectItem key={protocol.id} value={protocol.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{protocol.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({protocol.steps.length} adım)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  {protocols?.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Bu hayvan türü için uygun protokol bulunamadı
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedProtocol && (
            <div className="p-4 rounded-xl bg-muted/50 space-y-2">
              <p className="text-sm font-medium">Protokol Detayları:</p>
              <p className="text-xs text-muted-foreground">
                {selectedProtocol.description || "Açıklama yok"}
              </p>
              <div className="pt-2">
                <p className="text-xs font-medium mb-2">Adımlar:</p>
                <div className="space-y-1">
                  {selectedProtocol.steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="text-xs text-muted-foreground flex items-center gap-2"
                    >
                      <span className="font-bold text-primary">
                        Gün {step.dayOffset}:
                      </span>
                      <span>{step.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Başlangıç Tarihi *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12",
                    !startDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? (
                    format(startDate, "PPP", { locale: tr })
                  ) : (
                    <span>Tarih seçin</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                  locale={tr}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
            <Textarea
              id="notes"
              placeholder="Protokol hakkında notlar..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={assignMutation.isPending || !selectedProtocolId}
              className="flex-1"
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Atanıyor...
                </>
              ) : (
                "Protokolü Ata"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
