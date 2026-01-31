"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  PawPrint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const animalSchema = z.object({
  name: z.string().min(1, "Hayvan adı zorunludur"),
  species: z.string().min(1, "Tür seçiniz"),
  breed: z.string().optional(),
  gender: z.string().min(1, "Cinsiyet seçiniz"),
  birthDate: z.string().optional(),
  color: z.string().optional(),
  weight: z.string().optional(),
  chipNumber: z.string().optional(),
  earTag: z.string().optional(),
  notes: z.string().optional(),
});

type AnimalFormData = z.infer<typeof animalSchema>;

const speciesOptions = [
  { value: "CATTLE", label: "Sığır", icon: "🐮" },
  { value: "DOG", label: "Köpek", icon: "dog" },
  { value: "CAT", label: "Kedi", icon: "cat" },
  { value: "SHEEP", label: "Koyun", icon: "🐑" },
  { value: "GOAT", label: "Keçi", icon: "🐐" },
  { value: "HORSE", label: "At", icon: "🐴" },
  { value: "BIRD", label: "Kuş", icon: "bird" },
  { value: "RABBIT", label: "Tavşan", icon: "rabbit" },
  { value: "FISH", label: "Balık", icon: "fish" },
  { value: "REPTILE", label: "Sürüngen", icon: "🦎" },
  { value: "RODENT", label: "Kemirgen", icon: "🐿️" },
  { value: "OTHER", label: "Diğer", icon: "paw" },
];

export default function AnimalEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const animalId = params.id as string;
  const [selectedSpecies, setSelectedSpecies] = useState<string>("CATTLE");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<AnimalFormData>({
    resolver: zodResolver(animalSchema),
  });

  // Fetch animal
  const { data: animal, isLoading } = useQuery({
    queryKey: ["animal", animalId],
    queryFn: async () => {
      const res = await fetch(`/api/animals/${animalId}`);
      if (!res.ok) throw new Error("Hayvan bulunamadı");
      return res.json();
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (animal) {
      setSelectedSpecies(animal.species || "CATTLE");
      reset({
        name: animal.name || "",
        species: animal.species || "",
        breed: animal.breed || "",
        gender: animal.gender || "",
        birthDate: animal.birthDate
          ? new Date(animal.birthDate).toISOString().split("T")[0]
          : "",
        color: animal.color || "",
        weight: animal.weight?.toString() || "",
        chipNumber: animal.chipNumber || "",
        earTag: animal.earTag || "",
        notes: animal.notes || "",
      });
    }
  }, [animal, reset]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: AnimalFormData) => {
      const payload = {
        ...data,
        weight: data.weight ? parseFloat(data.weight) : null,
        birthDate: data.birthDate
          ? new Date(data.birthDate).toISOString()
          : null,
      };

      const res = await fetch(`/api/animals/${animalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Güncelleme başarısız");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      queryClient.invalidateQueries({ queryKey: ["animal", animalId] });
      router.push(`/dashboard/animals/${animalId}`);
    },
  });

  const onSubmit = (data: AnimalFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-slate-500">Hayvan bulunamadı</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/animals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Hayvanlara Dön
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/animals/${animalId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
            Hayvan Düzenle
          </h1>
          <p className="text-sm text-slate-500">{animal.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Temel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Hayvan Adı *
              </label>
              <Input {...register("name")} placeholder="Örn: Pamuk" />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tür *
                </label>
                <Controller
                  name="species"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedSpecies(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tür seçin" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        {speciesOptions.map((opt) => {
                          const IconComponent =
                            opt.icon === "dog"
                              ? Dog
                              : opt.icon === "cat"
                                ? Cat
                                : opt.icon === "bird"
                                  ? Bird
                                  : opt.icon === "rabbit"
                                    ? Rabbit
                                    : opt.icon === "fish"
                                      ? Fish
                                      : opt.icon === "paw"
                                        ? PawPrint
                                        : null;

                          return (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                {IconComponent ? (
                                  <IconComponent className="w-4 h-4" />
                                ) : (
                                  <span className="text-base">{opt.icon}</span>
                                )}
                                <span>{opt.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.species && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.species.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cinsiyet *
                </label>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Cinsiyet seçin" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        <SelectItem value="MALE">Erkek ♂</SelectItem>
                        <SelectItem value="FEMALE">Dişi ♀</SelectItem>
                        <SelectItem value="UNKNOWN">Bilinmiyor</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.gender && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.gender.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Irk
              </label>
              <Input
                {...register("breed")}
                placeholder="Örn: Golden Retriever"
              />
            </div>
          </CardContent>
        </Card>

        {/* Physical Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fiziksel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Doğum Tarihi
                </label>
                <Input {...register("birthDate")} type="date" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ağırlık (kg)
                </label>
                <Input
                  {...register("weight")}
                  type="number"
                  step="0.1"
                  placeholder="Örn: 5.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Renk
                </label>
                <Input {...register("color")} placeholder="Örn: Beyaz, Siyak" />
              </div>

              {/* Büyükbaş hayvanlar için Kulak Küpe Numarası */}
              {["CATTLE", "SHEEP", "GOAT"].includes(selectedSpecies) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kulak Küpe Numarası
                  </label>
                  <Input
                    {...register("earTag")}
                    placeholder="Kulak küpe numarası"
                  />
                </div>
              )}

              {/* Evcil hayvanlar için Mikroçip Numarası */}
              {["DOG", "CAT", "HORSE"].includes(selectedSpecies) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Mikroçip No
                  </label>
                  <Input
                    {...register("chipNumber")}
                    placeholder="15 haneli mikroçip numarası"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notlar</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              {...register("notes")}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Hayvan hakkında notlar..."
            />
          </CardContent>
        </Card>

        {/* Error Message */}
        {updateMutation.isError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {updateMutation.error.message}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            İptal
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Kaydet
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Footer */}
      <footer className="text-center py-4 text-sm text-slate-500 border-t">
        © {new Date().getFullYear()} Optimus Vet. Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
