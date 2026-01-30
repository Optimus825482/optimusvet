"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Minus,
  ArrowLeft,
  Save,
  Activity,
  Info,
  GripVertical,
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
import { toast } from "@/hooks/use-toast";

interface Step {
  name: string;
  dayOffset: number;
  notes: string;
}

export default function NewProtocolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("VACCINATION");
  const [species, setSpecies] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<Step[]>([
    { name: "", dayOffset: 0, notes: "" },
  ]);

  const toggleSpecies = (s: string) => {
    setSpecies((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const addStep = () => {
    setSteps([...steps, { name: "", dayOffset: 0, notes: "" }]);
  };

  const removeStep = (index: number) => {
    if (steps.length === 1) return;
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    setSteps(newSteps);
  };

  const updateStep = (index: number, field: keyof Step, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || steps.some((s) => !s.name)) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen protokol adı ve tüm adım isimlerini doldurun",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/protocols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, species, description, steps }),
      });

      if (!res.ok) throw new Error("Kayıt başarısız");

      toast({
        variant: "success",
        title: "Başarılı",
        description: "Protokol şablonu kaydedildi",
      });
      router.push("/dashboard/protocols");
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
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/protocols">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Yeni Protokol Şablonu</h1>
          <p className="text-muted-foreground">
            Tekrarlı işlemler için otomatik plan oluşturun
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" /> Genel Bilgiler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Protokol İsmi *</Label>
                <Input
                  placeholder="Örn: 1 Yaş Köpek Karma Aşı"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Protokol Tipi</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VACCINATION">Aşılama</SelectItem>
                    <SelectItem value="FERTILITY">Fertilite</SelectItem>
                    <SelectItem value="TREATMENT">Tedavi Şablonu</SelectItem>
                    <SelectItem value="CHECKUP">Periyodik Kontrol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                placeholder="Opsiyonel açıklama..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-3 pt-2">
              <Label>Geçerli Türler</Label>
              <div className="flex flex-wrap gap-2">
                {["CAT", "DOG", "CATTLE", "SHEEP", "GOAT", "BIRD", "OTHER"].map(
                  (s) => (
                    <Button
                      key={s}
                      type="button"
                      variant={species.includes(s) ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => toggleSpecies(s)}
                    >
                      {s === "CAT"
                        ? "Kedi"
                        : s === "DOG"
                          ? "Köpek"
                          : s === "CATTLE"
                            ? "Sığır"
                            : s === "SHEEP"
                              ? "Koyun"
                              : s === "GOAT"
                                ? "Keçi"
                                : s === "BIRD"
                                  ? "Kuş"
                                  : "Diğer"}
                    </Button>
                  ),
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Protokol Adımları
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="w-4 h-4 mr-1" /> Adım Ekle
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground mb-4 italic">
              * Gün farkı, protokol başlangıç tarihine göre hesaplanır (0:
              Başlangıç günü).
            </p>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border-2 bg-muted/20 relative group"
                >
                  <div className="flex-1 flex gap-3 h-10">
                    <div className="w-10 flex items-center justify-center shrink-0">
                      <span className="font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                    </div>
                    <Input
                      placeholder="İşlem İsmi (Örn: Karma-1)"
                      value={step.name}
                      onChange={(e) =>
                        updateStep(index, "name", e.target.value)
                      }
                      className="h-10 border-none bg-background shadow-sm"
                    />
                  </div>
                  <div className="flex flex-1 gap-3">
                    <div className="w-24">
                      <Input
                        type="number"
                        placeholder="Gün"
                        value={step.dayOffset}
                        onChange={(e) =>
                          updateStep(
                            index,
                            "dayOffset",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="h-10 text-center font-bold"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Notlar..."
                        value={step.notes}
                        onChange={(e) =>
                          updateStep(index, "notes", e.target.value)
                        }
                        className="h-10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                      className="text-destructive hover:bg-destructive/10"
                      disabled={steps.length === 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
            {loading ? "Kaydediliyor..." : "Şablonu Kaydet"}
          </Button>
        </div>
      </form>
    </div>
  );
}
