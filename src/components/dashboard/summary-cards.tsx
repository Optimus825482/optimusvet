'use client'

import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface SummaryCard {
    title: string
    value: string | number
    change?: number
    trend?: 'up' | 'down' | 'neutral'
    icon?: React.ReactNode
    subtext?: string
}

interface SummaryCardsProps {
    cards: SummaryCard[]
}

export function SummaryCards({ cards }: SummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        {card.icon && <div className="text-teal-600">{card.icon}</div>}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{card.value}</div>
                        {card.change !== undefined && (
                            <div className="flex items-center pt-1 text-xs">
                                {card.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-600 mr-1" />}
                                {card.trend === 'down' && <TrendingDown className="w-4 h-4 text-coral-600 mr-1" />}
                                <span className={card.trend === 'up' ? 'text-emerald-600' : card.trend === 'down' ? 'text-coral-600' : ''}>
                                    {card.trend === 'up' ? '+' : ''}{card.change}%
                                </span>
                            </div>
                        )}
                        {card.subtext && <p className="text-xs text-slate-900 pt-1">{card.subtext}</p>}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

interface ChartDataPoint {
    date: string
    value: number
}

interface ChartProps {
    data: ChartDataPoint[]
    title: string
}

export function SimpleChart({ data, title }: ChartProps) {
    const maxValue = Math.max(...data.map(d => d.value))

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-end gap-2 h-40">
                    {data.map((point, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className="w-full bg-gradient-to-t from-teal-600 to-teal-400 rounded-t hover:from-teal-700 hover:to-teal-500 transition-colors"
                                style={{ height: `${(point.value / maxValue) * 160}px` }}
                                title={`${point.date}: ${formatCurrency(point.value)}`}
                            />
                            <span className="text-xs text-slate-900">{point.date}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

interface AlertItemProps {
    title: string
    description: string
    severity: 'info' | 'warning' | 'critical'
    action?: {
        label: string
        href: string
    }
}

export function AlertCard({ title, description, severity, action }: AlertItemProps) {
    const bgColor = {
        info: 'bg-sky-50 border-sky-200',
        warning: 'bg-amber-50 border-amber-200',
        critical: 'bg-coral-50 border-coral-200',
    }[severity]

    const iconColor = {
        info: 'text-sky-600',
        warning: 'text-amber-600',
        critical: 'text-coral-600',
    }[severity]

    return (
        <div className={`border rounded-xl p-4 ${bgColor}`}>
            <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
                <div className="flex-1">
                    <h4 className="font-semibold text-sm text-slate-900">{title}</h4>
                    <p className="text-sm text-slate-900 mt-1">{description}</p>
                    {action && (
                        <a href={action.href} className="text-xs font-semibold mt-2 inline-block text-teal-900 hover:underline">
                            {action.label} →
                        </a>
                    )}
                </div>
            </div>
        </div>
    )
}
