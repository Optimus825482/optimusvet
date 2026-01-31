"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  PawPrint,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Cat,
  Dog,
  Bird,
  Rabbit,
  Fish,
  Syringe,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";

interface Animal {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  gender: string;
  birthDate: string | null;
  color: string | null;
  microchip: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  _count: {
    protocols: number;
  };
}

const speciesIcons: Record<string, React.ElementType> = {
  DOG: Dog,
  CAT: Cat,
  BIRD: Bird,
  RABBIT: Rabbit,
  FISH: Fish,
};

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

const genderLabels: Record<string, string> = {
  MALE: "Erkek",
  FEMALE: "Dişi",
  UNKNOWN: "Bilinmiyor",
};

export default function AnimalsPage() {
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery<{
    animals: Animal[];
    total: number;
  }>({
    queryKey: ["animals", search, speciesFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (speciesFilter && speciesFilter !== "all")
        params.set("species", speciesFilter);
      params.set("limit", "50");

      const res = await fetch(`/api/animals?${params}`);
      if (!res.ok) throw new Error("Hayvanlar yüklenemedi");
      return res.json();
    },
  });

  const getSpeciesIcon = (species: string) => {
    const Icon = speciesIcons[species] || PawPrint;
    return <Icon className="w-5 h-5" />;
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();

    if (years < 1) {
      const totalMonths = years * 12 + months;
      return totalMonths <= 0 ? "Yenidoğan" : `${totalMonths} aylık`;
    }
    return `${years} yaşında`;
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
            Hasta hayvanları ve tedavi geçmişlerini yönetin
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/animals/new">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Hayvan
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hayvan veya sahip ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tür filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <PawPrint className="w-4 h-4" />
                <span>Tüm Türler</span>
              </div>
            </SelectItem>
            <SelectItem value="CATTLE">
              <div className="flex items-center gap-2">
                <span className="text-base">🐮</span>
                <span>Sığır</span>
              </div>
            </SelectItem>
            <SelectItem value="DOG">
              <div className="flex items-center gap-2">
                <Dog className="w-4 h-4" />
                <span>Köpek</span>
              </div>
            </SelectItem>
            <SelectItem value="CAT">
              <div className="flex items-center gap-2">
                <Cat className="w-4 h-4" />
                <span>Kedi</span>
              </div>
            </SelectItem>
            <SelectItem value="SHEEP">
              <div className="flex items-center gap-2">
                <span className="text-base">🐑</span>
                <span>Koyun</span>
              </div>
            </SelectItem>
            <SelectItem value="GOAT">
              <div className="flex items-center gap-2">
                <span className="text-base">🐐</span>
                <span>Keçi</span>
              </div>
            </SelectItem>
            <SelectItem value="HORSE">
              <div className="flex items-center gap-2">
                <span className="text-base">🐴</span>
                <span>At</span>
              </div>
            </SelectItem>
            <SelectItem value="BIRD">
              <div className="flex items-center gap-2">
                <Bird className="w-4 h-4" />
                <span>Kuş</span>
              </div>
            </SelectItem>
            <SelectItem value="RABBIT">
              <div className="flex items-center gap-2">
                <Rabbit className="w-4 h-4" />
                <span>Tavşan</span>
              </div>
            </SelectItem>
            <SelectItem value="FISH">
              <div className="flex items-center gap-2">
                <Fish className="w-4 h-4" />
                <span>Balık</span>
              </div>
            </SelectItem>
            <SelectItem value="REPTILE">
              <div className="flex items-center gap-2">
                <span className="text-base">🦎</span>
                <span>Sürüngen</span>
              </div>
            </SelectItem>
            <SelectItem value="RODENT">
              <div className="flex items-center gap-2">
                <span className="text-base">🐿️</span>
                <span>Kemirgen</span>
              </div>
            </SelectItem>
            <SelectItem value="OTHER">
              <div className="flex items-center gap-2">
                <PawPrint className="w-4 h-4" />
                <span>Diğer</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Toplam Hayvan</div>
            <div className="text-2xl font-bold">{data.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Köpek</div>
            <div className="text-2xl font-bold text-amber-600">
              {data.animals.filter((a) => a.species === "DOG").length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Kedi</div>
            <div className="text-2xl font-bold text-orange-500">
              {data.animals.filter((a) => a.species === "CAT").length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Diğer</div>
            <div className="text-2xl font-bold text-slate-600">
              {
                data.animals.filter((a) => !["DOG", "CAT"].includes(a.species))
                  .length
              }
            </div>
          </Card>
        </div>
      )}

      {/* Animal List */}
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
            {search || speciesFilter !== "all"
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.animals.map((animal) => (
            <Card
              key={animal.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        animal.species === "DOG"
                          ? "bg-amber-100 text-amber-600"
                          : animal.species === "CAT"
                            ? "bg-orange-100 text-orange-600"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {getSpeciesIcon(animal.species)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{animal.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{speciesLabels[animal.species]}</span>
                        {animal.breed && (
                          <>
                            <span>•</span>
                            <span>{animal.breed}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/animals/${animal.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          Detay
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/animals/${animal.id}/edit`}>
                          <Edit className="w-4 h-4 mr-2" />
                          Düzenle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/dashboard/protocols/new?animalId=${animal.id}`}
                        >
                          <Syringe className="w-4 h-4 mr-2" />
                          Protokol Ekle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Cinsiyet:</span>{" "}
                    <span className="font-medium">
                      {genderLabels[animal.gender]}
                    </span>
                  </div>
                  {animal.birthDate && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Yaş:</span>{" "}
                      <span className="font-medium">
                        {calculateAge(animal.birthDate)}
                      </span>
                    </div>
                  )}
                  {animal.color && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Renk:</span>{" "}
                      <span className="font-medium">{animal.color}</span>
                    </div>
                  )}
                  {animal.microchip && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Çip:</span>{" "}
                      <span className="font-medium truncate">
                        {animal.microchip}
                      </span>
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {animal._count.protocols > 0 && (
                    <Badge variant="info" className="text-xs">
                      <Syringe className="w-3 h-3 mr-1" />
                      {animal._count.protocols} protokol
                    </Badge>
                  )}
                </div>

                {/* Owner */}
                <div className="flex items-center justify-between pt-3 border-t text-sm">
                  <Link
                    href={`/dashboard/customers/${animal.customer.id}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{animal.customer.name}</span>
                  </Link>
                  <span className="text-muted-foreground">
                    {animal.customer.phone}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4 border-t mt-8">
        <p className="text-xs text-muted-foreground">
          © 2026 Optimus Vet. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  );
}
