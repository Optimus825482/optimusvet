"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Database,
  Activity,
  Loader2,
  FileText,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuditLogTable } from "@/components/audit/audit-log-table";
import { AuditLogFilters } from "@/components/audit/audit-log-filters";
import { AuditLogStats } from "@/components/audit/audit-log-stats";
import type { AuditAction } from "@prisma/client";

interface AuditLog {
  id: string;
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValues: any;
  newValues: any;
  changedFields: string[];
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  createdAt: string;
}

interface AuditLogFiltersType {
  tableName?: string;
  action?: AuditAction;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFiltersType>({});
  const [showStats, setShowStats] = useState(false);
  const limit = 50;

  // Fetch audit logs
  const { data, isLoading, error, refetch } = useQuery<{
    success: boolean;
    data: AuditLog[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["audit-logs", page, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      if (filters.tableName) params.set("tableName", filters.tableName);
      if (filters.action) params.set("action", filters.action);
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const res = await fetch(`/api/audit-logs?${params}`);
      if (!res.ok) throw new Error("Audit logları yüklenemedi");
      return res.json();
    },
  });

  // Export to CSV
  const handleExport = () => {
    if (!data?.data) return;

    const csv = [
      // Header
      [
        "Tarih",
        "İşlem",
        "Tablo",
        "Kayıt ID",
        "Kullanıcı",
        "Email",
        "IP Adresi",
        "Değişen Alanlar",
      ].join(","),
      // Rows
      ...data.data.map((log) =>
        [
          new Date(log.createdAt).toLocaleString("tr-TR"),
          log.action,
          log.tableName,
          log.recordId,
          log.userName || "-",
          log.userEmail || "-",
          log.ipAddress || "-",
          log.changedFields.join("; "),
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${new Date().toISOString()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Audit Logları
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Sistem aktivitelerini ve değişiklikleri izleyin
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {showStats ? "Logları Göster" : "İstatistikler"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Dışa Aktar
          </Button>
        </div>
      </div>

      {/* Statistics View */}
      {showStats ? (
        <AuditLogStats filters={filters} />
      ) : (
        <>
          {/* Filters */}
          <AuditLogFilters
            filters={filters}
            onFiltersChange={setFilters}
            onReset={() => {
              setFilters({});
              setPage(1);
            }}
          />

          {/* Summary Cards */}
          {data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Toplam Log
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.meta.total.toLocaleString("tr-TR")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Bu Sayfada
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.data.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sayfa</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.meta.page} / {data.meta.totalPages}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Aktif Filtre
                  </CardTitle>
                  <Filter className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.keys(filters).length}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Audit Logs Table */}
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-destructive">
                  Audit logları yüklenirken hata oluştu
                </p>
              </CardContent>
            </Card>
          ) : data?.data && data.data.length > 0 ? (
            <>
              <AuditLogTable logs={data.data} />

              {/* Pagination */}
              {data.meta.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Toplam {data.meta.total} kayıt
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Önceki
                    </Button>
                    <span className="text-sm">
                      Sayfa {page} / {data.meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(data.meta.totalPages, p + 1))
                      }
                      disabled={page === data.meta.totalPages}
                    >
                      Sonraki
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Audit log bulunamadı</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
