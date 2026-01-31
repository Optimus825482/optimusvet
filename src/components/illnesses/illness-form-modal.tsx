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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const illnessFormSchema = z.object({
  name: z.string().min(1, "Hastalık adı zorunludur"),
  diagnosis: z.string().optional(),
  symptoms: z.string().optional(),
  findings: z.string().optional(),
  notes: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  status: z.enum(["ACTIVE", "RECOVERED", "CHRONIC", "MONITORING", "CANCELLED"]),
  severity: z.enum(["MILD", "MODERATE", "SEVERE", "CRITICAL"]),
});

type IllnessFormValues = z.infer<typeof illnessFormSchema>;

interface IllnessFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animalId: string;
  illness?: any;
}

const statusLabels = {
  ACTIVE: "Aktif Tedavi",
  RECOVERED: "İyileşti",
  CHRONIC: "Kronik",
  MONITORING: "İzleme Altında",
  CANCELLED: "İptal Edildi",
};

const severityLabels = {
  MILD: "Hafif",
  MODERATE: "Orta",
  SEVERE: "Şiddetli",
  CRITICAL: "Kritik",
};

export function IllnessFormModal({
  open,
  onOpenChange,
  animalId,
  illness,
}: IllnessFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!illness;

  const form = useForm<IllnessFormValues>({
    resolver: zodResolver(illnessFormSchema),
    defaultValues: {
      name: illness?.name || "",
      diagnosis: illness?.diagnosis || "",
      symptoms: illness?.symptoms || "",
      findings: illness?.findings || "",
      notes: illness?.notes || "",
      startDate: illness?.startDate ? new Date(illness.startDate) : new Date(),
      endDate: illness?.endDate ? new Date(illness.endDate) : undefined,
      status: illness?.status || "ACTIVE",
      severity: illness?.severity || "MODERATE",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: IllnessFormValues) => {
      const url = isEdit
        ? `/api/animals/${animalId}/illnesses/${illness.id}`
        : `/api/animals/${animalId}/illnesses`;

      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          startDate: data.startDate.toISOString(),
          endDate: data.endDate?.toISOString(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "İşlem başarısız");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animal", animalId] });
      queryClient.invalidateQueries({
        queryKey: ["illnesses", animalId],
      });
      toast.success(
        isEdit ? "Hastalık kaydı güncellendi" : "Hastalık kaydı oluşturuldu",
      );
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: IllnessFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2.5rem] p-8 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
            {isEdit ? "Hastalık Kaydını Düzenle" : "Yeni Hastalık Kaydı"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Hayvanın hastalık bilgilerini girin
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase text-slate-600">
                    Hastalık Adı / Tanı *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Örn: Parvovirus, Kırık, Deri Enfeksiyonu"
                      className="rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase text-slate-600">
                      Şiddet *
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Şiddet seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(severityLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-black uppercase text-slate-600">
                      Başlangıç Tarihi *
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "rounded-xl pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: tr })
                            ) : (
                              <span>Tarih seçin</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
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
                      Bitiş Tarihi
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "rounded-xl pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: tr })
                            ) : (
                              <span>Tarih seçin</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
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

            <FormField
              control={form.control}
              name="symptoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase text-slate-600">
                    Semptomlar / Şikayetler
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Örn: Kusma, ishal, iştahsızlık, ateş"
                      className="rounded-xl min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="findings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase text-slate-600">
                    Muayene Bulguları
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Fiziksel muayene ve test sonuçları"
                      className="rounded-xl min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase text-slate-600">
                    Teşhis / Tanı
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Veteriner teşhisi ve değerlendirmesi"
                      className="rounded-xl min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase text-slate-600">
                    Ek Notlar
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Diğer önemli bilgiler"
                      className="rounded-xl min-h-[60px]"
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
                onClick={() => onOpenChange(false)}
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
    </Dialog>
  );
}
