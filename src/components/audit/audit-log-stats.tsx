"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Activity,
  Database,
  Users,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AuditAction } from "@prisma/client";

interface AuditLogStatsProps {
  filters: {
    tableName?: string;
    action?: AuditAction;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

interface StatsData {
  totalLogs: number;
  actionBreakdown: Array<{ action: AuditAction; count: number }>;
  tableBreakdown: Array<{ tableName: string; count: number }>;
  topUsers: Array<{
    userId: string | null;
    userEmail: string | null;
    userName: string | null;
    activityCount: number;
  }>;
}

// Action labels
const actionLabels: Record<AuditAction, string> = {
  CREATE: "Oluşturma",
  UPDATE: "Güncelleme",
  DELETE: "Silme",
  READ: "Okuma",
};

// Action colors
const actionColors: Record<AuditAction, string> = {
  CREATE: "bg-green-500/10 text-green-500 border-green-500/20",
  UPDATE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
  READ: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

// Table name translations
const tableNames: Record<string, string> = {
  users: "Kullanıcılar",
  customers: "Müşteriler",
  suppliers: "Tedarikçiler",
  animals: "Hayvanlar",
  products: "Ürünler",
  transactions: "İşlemler",
  payments: "Ödemeler",
  collections: "Tahsilatlar",
  illnesses: "Hastalıklar",
  treatments: "Tedaviler",
  reminders: "Hatırlatıcılar",
  protocols: "Protokoller",
  settings: "Ayarlar",
};

export function AuditLogStats({ filters }: AuditLogStatsProps) {
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: StatsData;
  }>({
    queryKey: ["audit-stats", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const res = await fetch(`/api/audit-logs/stats?${params}`);
      if (!res.ok) throw new Error("İstatistikler yüklenemedi");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-destructive">
            İstatistikler yüklenirken hata oluştu
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = data.data;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Genel İstatistikler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">
            {stats.totalLogs.toLocaleString("tr-TR")}
          </div>
          <p className="text-muted-foreground mt-1">Toplam Audit Log</p>
        </CardContent>
      </Card>

      {/* Action Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            İşlem Dağılımı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.actionBreakdown.map((item) => {
              const percentage = (item.count / stats.totalLogs) * 100;
              return (
                <div key={item.action} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={actionColors[item.action]}
                    >
                      {actionLabels[item.action]}
                    </Badge>
                    <div className="text-sm font-medium">
                      {item.count.toLocaleString("tr-TR")} (
                      {percentage.toFixed(1)}%)
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Table Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            En Çok Değişen Tablolar (Top 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.tableBreakdown.map((item, index) => (
              <div
                key={item.tableName}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">
                      {tableNames[item.tableName] || item.tableName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.tableName}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {item.count.toLocaleString("tr-TR")}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            En Aktif Kullanıcılar (Top 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topUsers.map((user, index) => (
              <div
                key={user.userId || index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{user.userName || "Sistem"}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.userEmail || "-"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">
                    {user.activityCount.toLocaleString("tr-TR")}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">aktivite</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
