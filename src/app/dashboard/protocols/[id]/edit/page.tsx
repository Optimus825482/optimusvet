"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Minus,
  ArrowLeft,
  Save,
  Activity,
  Info,
  Loader2,
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface Step {
  id?: string;
  name: string;
  dayOffset: number;
  notes: string;
  order: number;
}

interface Protocol {
  id: string;
  name: string;
  type: string;
  species: string[];
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  steps: Step[];
}

export default function EditProtocolPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("VACCINATION");
  const [species, setSpecies] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<Step[]>([
    { name: "", dayOffset: 0, notes: "", order: 0 },
  ]);

  const { data: protocol, isLoading } = useQuery<Protocol>({
    queryKey: ["protocol-template", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/protocol-templates/${params.id}`);
      if (!res.ok) throw new Error("Protokol yüklenemedi");
      return res.json();
    },
  });

  useEffect(() => {
    if (protocol) {
      setName(protocol.name);
      setType(protocol.type);
      setSpecies(protocol.species || []);
      setDescription(protocol.description || "");
      setIsDefault(protocol.isDefault);
      setIsActive(protocol.isActive);
      setSteps(
        protocol.steps.length > 0
          ? protocol.steps
          : [{ name: "", dayOffset: 0, notes: "", order: 0 }],
      );
    }
  }, [protocol]);

  const toggleSpecies = (s: string) => {
    setSpecies((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const addStep = () => {
    setSteps([
      ...steps,
      { name: "", dayOffset: 0, notes: "", order: steps.length },
    ]);
  };

  const removeStep = (index: number) => {
    if (steps.length === 1) return;
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    // Reorder
    newSteps.forEach((step, idx) => {
      step.order = idx;
    });
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
      const res = await fetch(`/api/protocol-templates/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          species,
          description,
          isDefault,
          isActive,
          steps,
        }),
      });

      if (!res.ok) throw new Error("Güncelleme başarısız");

      toast({
        variant: "success",
        title: "Başarılı",
        description: "Protokol şablonu güncellendi",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/protocols">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Protokol Şablonunu Düzenle</h1>
          <p className="text-muted-foreground">
            Protokol şablonunu güncelleyin
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

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDefault"
                  checked={isDefault}
                  onCheckedChange={(checked) =>
                    setIsDefault(checked as boolean)
                  }
                />
                <Label htmlFor="isDefault" className="cursor-pointer">
                  Varsayılan protokol
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked as boolean)}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Aktif
                </Label>
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
            {loading ? "Güncelleniyor..." : "Değişiklikleri Kaydet"}
          </Button>
        </div>
      </form>
    </div>
  );
}
