'use client'

import { useState } from 'react'
import { Download, FileText, BarChart3, TrendingUp, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

const reportTypes = [
    {
        id: 'sales-summary',
        name: 'Satış Özeti',
        description: 'Aylık/Haftalık satış raporu',
        icon: <TrendingUp className="w-5 h-5" />,
    },
    {
        id: 'customer-extract',
        name: 'Müşteri Cari Ekstresi',
        description: 'Müşteri borç/alacak durumu',
        icon: <FileText className="w-5 h-5" />,
    },
    {
        id: 'stock-inventory',
        name: 'Stok Envanteri',
        description: 'Mevcut stok ve düşük seviye ürünler',
        icon: <BarChart3 className="w-5 h-5" />,
    },
    {
        id: 'payment-tracking',
        name: 'Ödeme Takibi',
        description: 'Vade yaklaşan ve gecikmiş ödemeler',
        icon: <Calendar className="w-5 h-5" />,
    },
]

// Re-export to handle both cases
export { default } from './page'

function ReportsPage() {
    const [selectedReport, setSelectedReport] = useState<string | null>(null)
    const [period, setPeriod] = useState('month')
    const [loading, setLoading] = useState(false)

    const handleGenerateReport = async (reportId: string, format: 'pdf' | 'excel') => {
        setLoading(true)
        try {
            const response = await fetch(`/api/reports/${reportId}?period=${period}&format=${format}`)
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${reportId}_${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
                a.click()
                window.URL.revokeObjectURL(url)
            }
        } catch (error) {
            console.error('Rapor oluşturulurken hata:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Raporlar</h1>
                <p className="text-gray-600 mt-2">Klinik ve finansal verilerinizi indirin ve analiz edin</p>
            </div>

            {/* Filtreler */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="text-sm font-semibold">Dönem</label>
                            <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="week">Bu Hafta</SelectItem>
                                    <SelectItem value="month">Bu Ay</SelectItem>
                                    <SelectItem value="quarter">Çeyrek</SelectItem>
                                    <SelectItem value="year">Yıl</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Rapor Kartları */}
            <div className="grid gap-4 md:grid-cols-2">
                {reportTypes.map((report) => (
                    <Card key={report.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="text-blue-600">{report.icon}</div>
                                    <div>
                                        <CardTitle className="text-lg">{report.name}</CardTitle>
                                        <p className="text-xs text-gray-600 mt-1">{report.description}</p>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    variant="outline"
                                    onClick={() => handleGenerateReport(report.id, 'pdf')}
                                    disabled={loading}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    PDF
                                </Button>
                                <Button
                                    className="flex-1"
                                    variant="outline"
                                    onClick={() => handleGenerateReport(report.id, 'excel')}
                                    disabled={loading}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Excel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Örnek Rapor Çıktısı */}
            <Card>
                <CardHeader>
                    <CardTitle>Son Oluşturulan Raporlar</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[
                            { name: 'Satış Özeti (Ocak)', date: '2026-01-29', type: 'PDF' },
                            { name: 'Müşteri Cari Ekstresi', date: '2026-01-28', type: 'Excel' },
                            { name: 'Stok Envanteri', date: '2026-01-25', type: 'Excel' },
                        ].map((report, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <p className="font-semibold text-sm">{report.name}</p>
                                    <p className="text-xs text-gray-600">{report.date}</p>
                                </div>
                                <Badge variant="outline">{report.type}</Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
