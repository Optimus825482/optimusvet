"use client";

import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  X,
  User,
  Calendar,
  MapPin,
  Monitor,
  FileText,
  Database,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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

interface AuditLogDetailModalProps {
  log: AuditLog;
  open: boolean;
  onClose: () => void;
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

export function AuditLogDetailModal({
  log,
  open,
  onClose,
}: AuditLogDetailModalProps) {
  // Format JSON for display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Audit Log Detayı
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="space-y-6 pr-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">İşlem Tipi</p>
                <Badge variant="outline" className={actionColors[log.action]}>
                  {actionLabels[log.action]}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Tablo</p>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{log.tableName}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Kayıt ID</p>
                <code className="text-xs bg-muted px-2 py-1 rounded block">
                  {log.recordId}
                </code>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Tarih</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">
                      {new Date(log.createdAt).toLocaleString("tr-TR")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                        locale: tr,
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* User Info */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Kullanıcı Bilgileri
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">İsim</p>
                  <p className="text-sm font-medium">
                    {log.userName || "Sistem"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="text-sm font-medium">{log.userEmail || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    IP Adresi
                  </p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {log.ipAddress || "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    User Agent
                  </p>
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium truncate">
                      {log.userAgent || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Request Info */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                İstek Bilgileri
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Method</p>
                  <Badge variant="outline">{log.requestMethod || "-"}</Badge>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Path</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                    {log.requestPath || "-"}
                  </code>
                </div>
              </div>
            </div>

            <Separator />

            {/* Changed Fields */}
            {log.changedFields.length > 0 && (
              <>
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    Değişen Alanlar ({log.changedFields.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {log.changedFields.map((field) => (
                      <Badge key={field} variant="secondary">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Data Changes */}
            {(log.oldValues || log.newValues) && (
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Veri Değişiklikleri
                </h3>

                {/* CREATE - Only new values */}
                {log.action === "CREATE" && log.newValues && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Yeni Değerler:
                    </p>
                    <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                      {JSON.stringify(log.newValues, null, 2)}
                    </pre>
                  </div>
                )}

                {/* DELETE - Only old values */}
                {log.action === "DELETE" && log.oldValues && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Silinen Değerler:
                    </p>
                    <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                      {JSON.stringify(log.oldValues, null, 2)}
                    </pre>
                  </div>
                )}

                {/* UPDATE - Show diff */}
                {log.action === "UPDATE" && log.oldValues && log.newValues && (
                  <div className="space-y-4">
                    {log.changedFields.map((field) => (
                      <div key={field} className="space-y-2">
                        <p className="text-sm font-medium">{field}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Eski Değer
                            </p>
                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded">
                              <pre className="text-xs">
                                {formatValue(log.oldValues[field])}
                              </pre>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Yeni Değer
                            </p>
                            <div className="bg-green-500/10 border border-green-500/20 p-3 rounded">
                              <pre className="text-xs">
                                {formatValue(log.newValues[field])}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
