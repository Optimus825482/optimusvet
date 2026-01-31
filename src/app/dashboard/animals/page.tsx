"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  PawPrint,
  Eye,
  Edit,
  Loader2,
  Syringe,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Animal {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  gender: string | null;
  birthDate: string | null;
  color: string | null;
  chipNumber: string | null;
  earTag: string | null;
  weight: number | null;
  createdAt: string;
  customer: {
    id: string;
    code: string;
    name: string;
    phone: string;
  };
  _count: {
    protocols: number;
    transactions: number;
  };
}

interface SpeciesStats {
  species: string;
  count: number;
  percentage: number;
}

const speciesLabels: Record<string, string> = {
  DOG: "Köpek",
  CAT: "Kedi",
  BIRD: "Kuş",
  RABBIT: "Tavşan",
  FISH: "Balık",
  REPTILE: "Sürüngen",
  RODENT: "Kemirgen",
  HORSE: "At",
  CATTLE: "Sığır",
  SHEEP: "Koyun",
  GOAT: "Keçi",
  OTHER: "Diğer",
};

const speciesColors: Record<
  string,
  { bg: string; text: string; icon: string }
> = {
  CATTLE: { bg: "bg-amber-100", text: "text-amber-700", icon: "🐮" },
  DOG: { bg: "bg-blue-100", text: "text-blue-700", icon: "🐕" },
  CAT: { bg: "bg-orange-100", text: "text-orange-700", icon: "🐈" },
  SHEEP: { bg: "bg-gray-100", text: "text-gray-700", icon: "🐑" },
  GOAT: { bg: "bg-stone-100", text: "text-stone-700", icon: "🐐" },
  HORSE: { bg: "bg-brown-100", text: "text-brown-700", icon: "🐴" },
  BIRD: { bg: "bg-sky-100", text: "text-sky-700", icon: "🐦" },
  RABBIT: { bg: "bg-pink-100", text: "text-pink-700", icon: "🐰" },
  FISH: { bg: "bg-cyan-100", text: "text-cyan-700", icon: "🐟" },
  REPTILE: { bg: "bg-green-100", text: "text-green-700", icon: "🦎" },
  RODENT: { bg: "bg-yellow-100", text: "text-yellow-700", icon: "🐿️" },
  OTHER: { bg: "bg-slate-100", text: "text-slate-700", icon: "🐾" },
};

export default function AnimalsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{
    animals: Animal[];
    total: number;
  }>({
    queryKey: ["animals", search, selectedSpecies],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedSpecies) params.set("species", selectedSpecies);
      params.set("limit", "100");

      const res = await fetch(`/api/animals?${params}`);
      if (!res.ok) throw new Error("Hayvanlar yüklenemedi");
      return res.json();
    },
  });

  // Tür istatistiklerini hesapla
  const speciesStats: SpeciesStats[] = data
    ? Object.entries(
        data.animals.reduce(
          (acc, animal) => {
            acc[animal.species] = (acc[animal.species] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      )
        .map(([species, count]) => ({
          species,
          count,
          percentage: (count / data.total) * 100,
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();

    if (years < 1) {
      const totalMonths = years * 12 + months;
      return totalMonths <= 0 ? "Yenidoğan" : `${totalMonths} ay`;
    }
    return `${years} yaş`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PawPrint className="w-6 h-6 text-primary" />
            Hayvanlar
          </h1>
          <p className="text-muted-foreground">
            Toplam {data?.total || 0} hayvan kaydı
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/animals/new">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Hayvan
          </Link>
        </Button>
      </div>

      {/* Tür İstatistikleri */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {speciesStats.map((stat) => {
            const colors = speciesColors[stat.species] || speciesColors.OTHER;
            return (
              <Card
                key={stat.species}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedSpecies === stat.species ? "ring-2 ring-primary" : ""
                }`}
                onClick={() =>
                  setSelectedSpecies(
                    selectedSpecies === stat.species ? null : stat.species,
                  )
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center text-2xl shadow-md border-2 border-white dark:border-slate-700`}
                    >
                      {colors.icon}
                    </div>
                    <Badge variant="secondary" className="text-xs font-bold">
                      {stat.percentage.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold mb-1">{stat.count}</div>
                  <div className={`text-sm font-semibold ${colors.text}`}>
                    {speciesLabels[stat.species]}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hayvan adı, sahip adı veya telefon ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedSpecies && (
          <Button
            variant="outline"
            onClick={() => setSelectedSpecies(null)}
            size="sm"
          >
            Filtreyi Temizle
          </Button>
        )}
      </div>

      {/* Hayvan Tablosu */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">Hayvanlar yüklenirken hata oluştu</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Tekrar Dene
          </Button>
        </Card>
      ) : data?.animals.length === 0 ? (
        <Card className="p-8 text-center">
          <PawPrint className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Hayvan Bulunamadı</h3>
          <p className="text-muted-foreground mb-4">
            {search || selectedSpecies
              ? "Arama kriterlerine uygun hayvan yok"
              : "Henüz hayvan kaydı yok"}
          </p>
          <Button asChild>
            <Link href="/dashboard/animals/new">
              <Plus className="w-4 h-4 mr-2" />
              İlk Hayvanı Ekle
            </Link>
          </Button>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Kayıtlı Hayvanlar ({data.animals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b">
                  <tr>
                    <th className="text-center p-4 font-semibold text-sm w-40">
                      Tür
                    </th>
                    <th className="text-left p-4 font-semibold text-sm">
                      Hayvan Adı
                    </th>
                    <th className="text-left p-4 font-semibold text-sm">
                      Sahip Adı
                    </th>
                    <th className="text-left p-4 font-semibold text-sm">
                      Telefon
                    </th>
                    <th className="text-left p-4 font-semibold text-sm">
                      Cinsiyet
                    </th>
                    <th className="text-left p-4 font-semibold text-sm">
                      Yaş/Ağırlık
                    </th>
                    <th className="text-center p-4 font-semibold text-sm">
                      Protokol
                    </th>
                    <th className="text-center p-4 font-semibold text-sm">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.animals.map((animal) => {
                    const colors =
                      speciesColors[animal.species] || speciesColors.OTHER;
                    return (
                      <tr
                        key={animal.id}
                        className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        onClick={() =>
                          router.push(`/dashboard/animals/${animal.id}`)
                        }
                      >
                        <td className="p-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <div
                              className={`w-16 h-16 rounded-2xl ${colors.bg} ${colors.text} flex items-center justify-center text-4xl shadow-lg border-2 border-white dark:border-slate-700 transition-transform hover:scale-110`}
                            >
                              {colors.icon}
                            </div>
                            <div
                              className={`text-xs font-bold ${colors.text} uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.bg}`}
                            >
                              {speciesLabels[animal.species]}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-base">
                            {animal.name}
                          </div>
                          {animal.breed && (
                            <div className="text-sm text-muted-foreground">
                              {animal.breed}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{animal.customer.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {animal.customer.code}
                          </div>
                        </td>
                        <td className="p-4 text-sm">{animal.customer.phone}</td>
                        <td className="p-4">
                          {animal.gender === "MALE" ? (
                            <Badge
                              variant="default"
                              className="bg-blue-100 text-blue-700 hover:bg-blue-100 font-semibold"
                            >
                              ♂ Erkek
                            </Badge>
                          ) : animal.gender === "FEMALE" ? (
                            <Badge
                              variant="default"
                              className="bg-pink-100 text-pink-700 hover:bg-pink-100 font-semibold"
                            >
                              ♀ Dişi
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              -
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium">
                            {calculateAge(animal.birthDate) || "-"}
                          </div>
                          {animal.weight && (
                            <div className="text-xs text-muted-foreground">
                              {animal.weight} kg
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {animal._count.protocols > 0 ? (
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-700 hover:bg-green-100 font-semibold"
                            >
                              <Syringe className="w-3 h-3 mr-1" />
                              {animal._count.protocols}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div
                            className="flex items-center justify-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-8 w-8 p-0 hover:bg-primary/10"
                            >
                              <Link href={`/dashboard/animals/${animal.id}`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-8 w-8 p-0 hover:bg-primary/10"
                            >
                              <Link
                                href={`/dashboard/animals/${animal.id}/edit`}
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center py-4 border-t">
        <p className="text-xs text-muted-foreground">
          © 2026 Optimus Vet. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  );
}
