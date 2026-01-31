"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, X, Calendar, Database, Activity, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditAction } from "@prisma/client";

interface AuditLogFiltersProps {
  filters: {
    tableName?: string;
    action?: AuditAction;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  onFiltersChange: (filters: any) => void;
  onReset: () => void;
}

// Table options
const tableOptions = [
  { value: "users", label: "Kullanıcılar" },
  { value: "customers", label: "Müşteriler" },
  { value: "suppliers", label: "Tedarikçiler" },
  { value: "animals", label: "Hayvanlar" },
  { value: "products", label: "Ürünler" },
  { value: "transactions", label: "İşlemler" },
  { value: "payments", label: "Ödemeler" },
  { value: "collections", label: "Tahsilatlar" },
  { value: "illnesses", label: "Hastalıklar" },
  { value: "treatments", label: "Tedaviler" },
  { value: "reminders", label: "Hatırlatıcılar" },
  { value: "protocols", label: "Protokoller" },
  { value: "settings", label: "Ayarlar" },
];

// Action options
const actionOptions: { value: AuditAction; label: string }[] = [
  { value: "CREATE", label: "Oluşturma" },
  { value: "UPDATE", label: "Güncelleme" },
  { value: "DELETE", label: "Silme" },
  { value: "READ", label: "Okuma" },
];

export function AuditLogFilters({
  filters,
  onFiltersChange,
  onReset,
}: AuditLogFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch users for filter
  const { data: usersData } = useQuery<{
    users: Array<{ id: string; name: string; email: string }>;
  }>({
    queryKey: ["users-for-filter"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Kullanıcılar yüklenemedi");
      return res.json();
    },
  });

  const handleFilterChange = (key: string, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const activeFilterCount = Object.keys(filters).filter(
    (key) => filters[key as keyof typeof filters],
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtreler
            {activeFilterCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({activeFilterCount} aktif)
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onReset}>
                <X className="w-4 h-4 mr-2" />
                Temizle
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Gizle" : "Göster"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Table Name Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Tablo
              </Label>
              <Select
                value={filters.tableName || ""}
                onValueChange={(value) =>
                  handleFilterChange("tableName", value || undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tüm tablolar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tüm tablolar</SelectItem>
                  {tableOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                İşlem Tipi
              </Label>
              <Select
                value={filters.action || ""}
                onValueChange={(value) =>
                  handleFilterChange("action", value || undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tüm işlemler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tüm işlemler</SelectItem>
                  {actionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Kullanıcı
              </Label>
              <Select
                value={filters.userId || ""}
                onValueChange={(value) =>
                  handleFilterChange("userId", value || undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tüm kullanıcılar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tüm kullanıcılar</SelectItem>
                  {usersData?.users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Başlangıç Tarihi
              </Label>
              <Input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) =>
                  handleFilterChange("dateFrom", e.target.value || undefined)
                }
              />
            </div>

            {/* Date To Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Bitiş Tarihi
              </Label>
              <Input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) =>
                  handleFilterChange("dateTo", e.target.value || undefined)
                }
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
