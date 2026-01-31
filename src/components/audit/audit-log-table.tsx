"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Eye,
  Plus,
  Edit,
  Trash2,
  User,
  Calendar,
  MapPin,
  Monitor,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { AuditLogDetailModal } from "./audit-log-detail-modal";
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

interface AuditLogTableProps {
  logs: AuditLog[];
}

// Action badge colors
const actionColors: Record<AuditAction, string> = {
  CREATE: "bg-green-500/10 text-green-500 border-green-500/20",
  UPDATE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
  READ: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

// Action icons
const actionIcons: Record<AuditAction, any> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  READ: Eye,
};

// Action labels
const actionLabels: Record<AuditAction, string> = {
  CREATE: "Oluşturma",
  UPDATE: "Güncelleme",
  DELETE: "Silme",
  READ: "Okuma",
};

// Table name translations
const tableNames: Record<string, string> = {
  users: "Kullanıcılar",
  customers: "Müşteriler",
  suppliers: "Tedarikçiler",
  animals: "Hayvanlar",
  products: "Ürünler",
  product_categories: "Ürün Kategorileri",
  transactions: "İşlemler",
  transaction_items: "İşlem Kalemleri",
  payments: "Ödemeler",
  collections: "Tahsilatlar",
  collection_allocations: "Tahsilat Dağıtımları",
  stock_movements: "Stok Hareketleri",
  illnesses: "Hastalıklar",
  treatments: "Tedaviler",
  reminders: "Hatırlatıcılar",
  protocols: "Protokoller",
  protocol_steps: "Protokol Adımları",
  animal_protocols: "Hayvan Protokolleri",
  protocol_records: "Protokol Kayıtları",
  price_history: "Fiyat Geçmişi",
  settings: "Ayarlar",
};

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlem</TableHead>
                  <TableHead>Tablo</TableHead>
                  <TableHead>Kayıt ID</TableHead>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Değişiklikler</TableHead>
                  <TableHead className="text-right">Detay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const ActionIcon = actionIcons[log.action];
                  return (
                    <TableRow key={log.id}>
                      {/* Date */}
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {formatDistanceToNow(new Date(log.createdAt), {
                              addSuffix: true,
                              locale: tr,
                            })}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(log.createdAt).toLocaleString("tr-TR")}
                        </div>
                      </TableCell>

                      {/* Action */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={actionColors[log.action]}
                        >
                          <ActionIcon className="w-3 h-3 mr-1" />
                          {actionLabels[log.action]}
                        </Badge>
                      </TableCell>

                      {/* Table Name */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {tableNames[log.tableName] || log.tableName}
                          </span>
                        </div>
                      </TableCell>

                      {/* Record ID */}
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.recordId.slice(0, 8)}...
                        </code>
                      </TableCell>

                      {/* User */}
                      <TableCell>
                        {log.userName ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">
                                {log.userName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {log.userEmail}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Sistem
                          </span>
                        )}
                      </TableCell>

                      {/* Changed Fields */}
                      <TableCell>
                        {log.changedFields.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {log.changedFields.slice(0, 3).map((field) => (
                              <Badge
                                key={field}
                                variant="secondary"
                                className="text-xs"
                              >
                                {field}
                              </Badge>
                            ))}
                            {log.changedFields.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{log.changedFields.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <AuditLogDetailModal
          log={selectedLog}
          open={!!selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </>
  );
}
