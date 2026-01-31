"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Calendar,
  Check,
  Clock,
  Loader2,
  Pill,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Reminder {
  id: string;
  type: string;
  title: string;
  description: string | null;
  dueDate: string;
  isCompleted: boolean;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  animal: {
    id: string;
    name: string;
    species: string;
  } | null;
}

const reminderTypeConfig = {
  TREATMENT: {
    icon: Pill,
    color: "bg-blue-500",
    label: "Tedavi",
  },
  CHECKUP: {
    icon: Stethoscope,
    color: "bg-emerald-500",
    label: "Kontrol",
  },
  VACCINATION: {
    icon: Stethoscope,
    color: "bg-purple-500",
    label: "Aşı",
  },
  PAYMENT_DUE: {
    icon: Calendar,
    color: "bg-amber-500",
    label: "Ödeme",
  },
  CUSTOM: {
    icon: Bell,
    color: "bg-slate-500",
    label: "Hatırlatma",
  },
};

export function ActiveRemindersPopup() {
  const [open, setOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Fetch active reminders
  const { data, isLoading } = useQuery({
    queryKey: ["reminders", "active"],
    queryFn: async () => {
      const res = await fetch("/api/reminders/active");
      if (!res.ok) throw new Error("Hatırlatmalar yüklenemedi");
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const reminders: Reminder[] = data?.reminders || [];

  // Filter out dismissed reminders
  const activeReminders = reminders.filter((r) => !dismissedIds.has(r.id));

  // Show popup when there are active reminders
  useEffect(() => {
    if (activeReminders.length > 0 && !open) {
      setOpen(true);
    }
  }, [activeReminders.length, open]);

  // Dismiss reminder mutation
  const dismissMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const res = await fetch(`/api/reminders/${reminderId}/dismiss`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Hatırlatma kapatılamadı");
      return res.json();
    },
    onSuccess: (_, reminderId) => {
      setDismissedIds((prev) => new Set(prev).add(reminderId));
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Hatırlatma kapatıldı");
    },
    onError: () => {
      toast.error("Hatırlatma kapatılamadı");
    },
  });

  // Dismiss all reminders
  const dismissAllMutation = useMutation({
    mutationFn: async () => {
      const promises = activeReminders.map((reminder) =>
        fetch(`/api/reminders/${reminder.id}/dismiss`, {
          method: "PATCH",
        }),
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      activeReminders.forEach((r) => {
        setDismissedIds((prev) => new Set(prev).add(r.id));
      });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Tüm hatırlatmalar kapatıldı");
      setOpen(false);
    },
    onError: () => {
      toast.error("Hatırlatmalar kapatılamadı");
    },
  });

  const handleDismiss = (reminderId: string) => {
    dismissMutation.mutate(reminderId);
  };

  const handleDismissAll = () => {
    dismissAllMutation.mutate();
  };

  const handleClose = () => {
    setOpen(false);
  };

  if (isLoading || activeReminders.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="rounded-[2.5rem] p-8 max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                Bekleyen Hatırlatmalar
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                {activeReminders.length} adet hatırlatmanız var
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-3">
            {activeReminders.map((reminder) => {
              const config =
                reminderTypeConfig[
                  reminder.type as keyof typeof reminderTypeConfig
                ] || reminderTypeConfig.CUSTOM;
              const Icon = config.icon;
              const dueDate = new Date(reminder.dueDate);
              const isOverdue = dueDate < new Date();

              return (
                <div
                  key={reminder.id}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all hover:shadow-md",
                    isOverdue
                      ? "bg-red-50 border-red-200"
                      : "bg-white border-slate-200",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                        config.color,
                      )}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h3 className="font-black text-slate-900 text-base leading-tight">
                            {reminder.title}
                          </h3>
                          {reminder.description && (
                            <p className="text-sm text-slate-600 mt-1">
                              {reminder.description}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={isOverdue ? "destructive" : "secondary"}
                          className="rounded-lg font-bold text-xs"
                        >
                          {config.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-semibold">
                            {format(dueDate, "dd MMM yyyy", { locale: tr })}
                          </span>
                          {isOverdue && (
                            <span className="text-red-600 font-bold">
                              (Gecikmiş)
                            </span>
                          )}
                        </div>

                        {reminder.animal && (
                          <div className="flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span className="font-semibold">
                              {reminder.animal.name}
                            </span>
                          </div>
                        )}

                        {reminder.customer && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span className="font-semibold">
                              {reminder.customer.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(reminder.id)}
                      disabled={dismissMutation.isPending}
                      className="rounded-xl h-9 px-3 flex-shrink-0"
                    >
                      {dismissMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1.5" />
                          Kapat
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            className="rounded-xl border-slate-200 font-bold h-12 flex-1"
          >
            Daha Sonra Hatırlat
          </Button>
          <Button
            onClick={handleDismissAll}
            disabled={dismissAllMutation.isPending}
            className="rounded-xl font-bold h-12 flex-1 shadow-lg shadow-primary/20"
          >
            {dismissAllMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kapatılıyor...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Tümünü Kapat
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
