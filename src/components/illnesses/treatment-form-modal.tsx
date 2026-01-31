"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  FormDescription,
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const treatmentFormSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, "Tedavi adı zorunludur"),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  applicationMethod: z.string().optional(),
  notes: z.string().optional(),
  cost: z.coerce.number().nonnegative(),
  status: z.enum(["PLANNED", "ONGOING", "COMPLETED", "PAUSED", "CANCELLED"]),
  nextCheckupDate: z.date().optional(),
});

type TreatmentFormValues = z.infer<typeof treatmentFormSchema>;

interface TreatmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  illnessId: string;
  treatment?: any;
  animalId?: string; // Optional for future use
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
  const [productOpen, setProductOpen] = useState(false);

  // Fetch products for selection
  const { data: products = [] } = useQuery({
    queryKey: ["products", "medicine"],
    queryFn: async () => {
      const res = await fetch("/api/products?category=MEDICINE&isActive=true");
      if (!res.ok) throw new Error("Ürünler yüklenemedi");
      return res.json();
    },
    enabled: open,
  });

  const form = useForm<TreatmentFormValues>({
    resolver: zodResolver(treatmentFormSchema),
    defaultValues: {
      productId: treatment?.productId || "",
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
      cost: treatment?.cost ? Number(treatment.cost) : 0,
      status: treatment?.status || "ONGOING",
      nextCheckupDate: treatment?.nextCheckupDate
        ? new Date(treatment.nextCheckupDate)
        : undefined,
    },
  });

  // Auto-fill product details when product is selected
  const selectedProductId = form.watch("productId");
  useEffect(() => {
    if (selectedProductId && !isEdit) {
      const product = products.find((p: any) => p.id === selectedProductId);
      if (product) {
        form.setValue("name", product.name);
        form.setValue("cost", Number(product.salePrice || 0));
      }
    }
  }, [selectedProductId, products, form, isEdit]);

  const mutation = useMutation({
    mutationFn: async (data: TreatmentFormValues) => {
      const url = isEdit
        ? `/api/treatments/${treatment.id}`
        : `/api/illnesses/${illnessId}/treatments`;

      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          productId: data.productId || null,
          startDate: data.startDate.toISOString(),
          endDate: data.endDate?.toISOString(),
          nextCheckupDate: data.nextCheckupDate?.toISOString(),
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
      toast.success(
        isEdit ? "Tedavi kaydı güncellendi" : "Tedavi kaydı oluşturuldu",
      );
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: TreatmentFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2.5rem] p-8 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
            {isEdit ? "Tedavi Kaydını Düzenle" : "Yeni Tedavi Ekle"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Tedavi detaylarını girin
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-xs font-black uppercase text-slate-600">
                    İlaç / Ürün Seçimi
                  </FormLabel>
                  <Popover open={productOpen} onOpenChange={setProductOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "rounded-xl justify-between",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value
                            ? products.find((p: any) => p.id === field.value)
                                ?.name
                            : "Ürün seçin (opsiyonel)"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Ürün ara..." />
                        <CommandEmpty>Ürün bulunamadı.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {products.map((product: any) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={() => {
                                form.setValue("productId", product.id);
                                setProductOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  product.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <div className="flex-1">
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {product.code} • Stok: {product.stock}{" "}
                                  {product.unit}
                                </p>
                              </div>
                              <span className="text-sm font-bold">
                                ₺{Number(product.salePrice).toFixed(2)}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription className="text-xs">
                    Stoktan ürün seçebilir veya manuel tedavi girebilirsiniz
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase text-slate-600">
                    Tedavi Adı *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Örn: Antibiyotik Tedavisi, Enjeksiyon"
                      className="rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="grid grid-cols-2 gap-4">
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
                        placeholder="Örn: Oral, IV, IM"
                        className="rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase text-slate-600">
                      Maliyet (₺)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                        <FormControl>
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
                      Bitiş
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
                              format(field.value, "dd/MM/yyyy", { locale: tr })
                            ) : (
                              <span>Tarih</span>
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
                name="nextCheckupDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-black uppercase text-slate-600">
                      Kontrol
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
                              format(field.value, "dd/MM/yyyy", { locale: tr })
                            ) : (
                              <span>Tarih</span>
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
                      className="rounded-xl min-h-[80px]"
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
