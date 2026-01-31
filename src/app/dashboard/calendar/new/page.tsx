"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Search,
  User,
  PawPrint,
  Calendar,
  Clock,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function NewAppointmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    type: "VACCINATION",
    dueDate: "",
    message: "",
  });

  const { data: customersData } = useQuery<any>({
    queryKey: ["customers-search", customerSearch],
    queryFn: async () => {
      if (!customerSearch) return { customers: [] };
      const res = await fetch(
        `/api/customers?search=${customerSearch}&limit=5`,
      );
      return res.json();
    },
    enabled: customerSearch.length > 0,
  });

  const { data: animalsData } = useQuery<any>({
    queryKey: ["animals-customer", selectedCustomer?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/animals?customerId=${selectedCustomer?.id}`,
      );
      return res.json();
    },
    enabled: !!selectedCustomer,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.dueDate) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen zorunlu alanları doldurun",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          animalId: selectedAnimal?.id,
          customerId: selectedCustomer?.id,
        }),
      });

      if (!res.ok) throw new Error("Kayıt başarısız");

      toast({
        variant: "success",
        title: "Başarılı",
        description: "Randevu/Hatırlatıcı oluşturuldu",
      });
      router.push("/dashboard/calendar");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "İşlem sırasında bir hata oluştu",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/calendar">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Yeni Hatırlatıcı / Etkinlik</h1>
          <p className="text-muted-foreground">
            Takvime yeni bir hatırlatıcı veya etkinlik ekleyin
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Temel Bilgiler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Başlık/Konu *</Label>
              <Input
                placeholder="Örn: Karma Aşı, Diş Kontrolü"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tür</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VACCINATION">Aşı</SelectItem>
                    <SelectItem value="CHECKUP">Kontrol</SelectItem>
                    <SelectItem value="SURGERY">Operasyon</SelectItem>
                    <SelectItem value="COLLECTION_DUE">
                      Ödeme/Tahsilat
                    </SelectItem>
                    <SelectItem value="OTHER">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tarih ve Saat *</Label>
                <Input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notlar</Label>
              <textarea
                className="w-full min-h-[100px] rounded-xl border-2 p-3 bg-background outline-none focus:ring-2 ring-primary/20 focus:border-primary transition-all"
                placeholder="Randevu detayları..."
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Müşteri & Hayvan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedCustomer ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Müşteri ara..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-10"
                />
                {customerSearch && customersData?.customers && (
                  <div className="absolute z-10 w-full mt-1 bg-card border rounded-xl shadow-lg">
                    {customersData.customers.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full p-3 text-left hover:bg-muted border-b last:border-0"
                        onClick={() => setSelectedCustomer(c)}
                      >
                        <div className="font-bold">{c.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.phone}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold">{selectedCustomer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedCustomer.phone}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setSelectedAnimal(null);
                    }}
                  >
                    Değiştir
                  </Button>
                </div>

                {animalsData?.animals && (
                  <div className="space-y-2">
                    <Label>Hayvan Seçimi</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {animalsData.animals.map((a: any) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setSelectedAnimal(a)}
                          className={cn(
                            "p-3 rounded-xl border-2 text-left transition-all",
                            selectedAnimal?.id === a.id
                              ? "bg-primary/10 border-primary"
                              : "bg-card hover:bg-muted/30",
                          )}
                        >
                          <PawPrint
                            className={cn(
                              "w-4 h-4 mb-2",
                              selectedAnimal?.id === a.id
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                          <div className="font-bold text-sm truncate">
                            {a.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {a.species} / {a.breed}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12"
            onClick={() => router.back()}
          >
            İptal
          </Button>
          <Button
            type="submit"
            className="flex-1 h-12 shadow-lg shadow-primary/20"
            disabled={loading}
          >
            <Save className="w-5 h-5 mr-2" />
            {loading ? "Kaydediliyor..." : "Randevuyu Kaydet"}
          </Button>
        </div>
      </form>
    </div>
  );
}
