"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Sadeleştirilmiş şema - satış bağlantısı yok
const treatmentFormSchema = z.object({
  name: z.string().min(1, "Tedavi/ilaç adı zorunludur"),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  applicationMethod: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["PLANNED", "ONGOING", "COMPLETED", "PAUSED", "CANCELLED"]),
  nextCheckupDate: z.date().optional(),
});

type TreatmentFormValues = z.infer<typeof treatmentFormSchema>;

interface Treatment {
  id: string;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  startDate: string | Date;
  endDate?: string | Date | null;
  applicationMethod?: string | null;
  notes?: string | null;
  status: "PLANNED" | "ONGOING" | "COMPLETED" | "PAUSED" | "CANCELLED";
  nextCheckupDate?: string | Date | null;
}

interface TreatmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  illnessId: string;
  treatment?: Treatment;
  animalId?: string;
}

const statusLabels = {
  PLANNED: "Planlandı",
  ONGOING: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  PAUSED: "Durduruldu",
  CANCELLED: "İptal Edildi",
};

export function TreatmentFormModal({
  open,
  onOpenChange,
  illnessId,
  treatment,
}: TreatmentFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!treatment;
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [pendingTreatmentData, setPendingTreatmentData] = useState<TreatmentFormValues | null>(null);

  const form = useForm<TreatmentFormValues>({
    resolver: zodResolver(treatmentFormSchema),
    defaultValues: {
      name: treatment?.name || "",
      dosage: treatment?.dosage || "",
      frequency: treatment?.frequency || "",
      duration: treatment?.duration || "",
      startDate: treatment?.startDate
        ? new Date(treatment.startDate)
        : new Date(),
      endDate: treatment?.endDate ? new Date(treatment.endDate) : undefined,
      applicationMethod: treatment?.applicationMethod || "",
      notes: treatment?.notes || "",
      status: treatment?.status || "ONGOING",
      nextCheckupDate: treatment?.nextCheckupDate
        ? new Date(treatment.nextCheckupDate)
        : undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: async (
      data: TreatmentFormValues & { createReminders?: boolean },
    ) => {
      const url = isEdit
        ? `/api/treatments/${treatment.id}`
        : `/api/illnesses/${illnessId}/treatments`;

      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          startDate: data.startDate.toISOString(),
          endDate: data.endDate?.toISOString(),
          nextCheckupDate: data.nextCheckupDate?.toISOString(),
          createReminders: data.createReminders,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "İşlem başarısız");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["illnesses"] });
      queryClient.invalidateQueries({ queryKey: ["treatments", illnessId] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success(
        isEdit ? "Tedavi kaydı güncellendi" : "Tedavi kaydı oluşturuldu",
      );
      handleOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: TreatmentFormValues) => {
    if (!isEdit) {
      setPendingTreatmentData(data);
      setShowReminderDialog(true);
    } else {
      mutation.mutate(data);
    }
  };

  const handleReminderConfirm = (createReminders: boolean) => {
    if (pendingTreatmentData) {
      mutation.mutate({ ...pendingTreatmentData, createReminders });
    }
  };

  // Reset state when modal is opened/closed via callback
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setShowReminderDialog(false);
      setPendingTreatmentData(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-[2.5rem] p-8 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
            {isEdit ? "Tedavi Kaydını Düzenle" : "Yeni Tedavi Ekle"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Hayvanın sağlık geçmişi için tedavi detaylarını girin
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tedavi/İlaç Adı */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase text-slate-600">
                    Tedavi / İlaç Adı *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Örn: Antibiyotik Tedavisi, Amoksisilin, Aşı"
                      className="rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dozaj, Sıklık, Süre */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="dosage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase text-slate-600">
                      Dozaj
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Örn: 2x1 tablet"
                        className="rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase text-slate-600">
                      Sıklık
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Örn: Günde 2 kez"
                        className="rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase text-slate-600">
                      Süre
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Örn: 7 gün"
                        className="rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Uygulama Yöntemi */}
            <FormField
              control={form.control}
              name="applicationMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase text-slate-600">
                    Uygulama Yöntemi
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Örn: Oral, IV, IM, Subkutan"
                      className="rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Durum */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase text-slate-600">
                    Durum *
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Durum seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tarihler */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-black uppercase text-slate-600">
                      Başlangıç *
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "rounded-xl pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: tr })
                          ) : (
                            <span>Tarih</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={tr}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-black uppercase text-slate-600">
                      Bitiş
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "rounded-xl pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: tr })
                          ) : (
                            <span>Tarih</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={tr}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextCheckupDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-black uppercase text-slate-600">
                      Kontrol
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "rounded-xl pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: tr })
                          ) : (
                            <span>Tarih</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={tr}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notlar */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase text-slate-600">
                    Tedavi Notları
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Uygulama detayları, yan etkiler, özel notlar"
                      className="rounded-xl min-h-20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="rounded-xl border-slate-200 font-bold h-12 flex-1"
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-xl font-bold h-12 flex-1 shadow-lg shadow-primary/20"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : isEdit ? (
                  "Güncelle"
                ) : (
                  "Kaydet"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Hatırlatma Onay Dialog'u */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="rounded-[2rem] p-6 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">
              Hatırlatma Oluştur
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium mt-2">
              Bu tedavi için ajandanıza hatırlatma eklemek ister misiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {pendingTreatmentData?.startDate && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Başlangıç
                  </p>
                  <p className="text-sm font-black text-slate-900">
                    {format(pendingTreatmentData.startDate, "dd MMMM yyyy", {
                      locale: tr,
                    })}
                  </p>
                </div>
              </div>
            )}
            {pendingTreatmentData?.endDate && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Bitiş
                  </p>
                  <p className="text-sm font-black text-slate-900">
                    {format(pendingTreatmentData.endDate, "dd MMMM yyyy", {
                      locale: tr,
                    })}
                  </p>
                </div>
              </div>
            )}
            {pendingTreatmentData?.nextCheckupDate && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Kontrol Randevusu
                  </p>
                  <p className="text-sm font-black text-slate-900">
                    {format(
                      pendingTreatmentData.nextCheckupDate,
                      "dd MMMM yyyy",
                      { locale: tr },
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleReminderConfirm(false)}
              className="rounded-xl border-slate-200 font-bold h-11 flex-1"
              disabled={mutation.isPending}
            >
              Sadece Kaydet
            </Button>

            <Button
              onClick={() => handleReminderConfirm(true)}
              className="rounded-xl font-bold h-11 flex-1 shadow-lg shadow-primary/20"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Hatırlatma Ekle"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
