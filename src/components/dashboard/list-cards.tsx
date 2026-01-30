'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface ListItemProps {
    title: string
    subtitle?: string
    meta?: string
    badge?: {
        label: string
        variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'
    }
    href?: string
}

export function ListCard({ title, subtitle, meta, badge, href }: ListItemProps) {
    const content = (
        <div className="flex items-start justify-between py-3 border-b border-slate-100 last:border-b-0 hover:bg-teal-50/50 transition-colors px-3 -mx-3 rounded-lg">
            <div className="flex-1">
                <p className="font-medium text-sm text-slate-800">{title}</p>
                {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
                {meta && <span className="text-xs font-semibold text-slate-900 whitespace-nowrap">{meta}</span>}
                {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
            </div>
        </div>
    )

    return href ? <Link href={href}>{content}</Link> : content
}

interface ListContainerProps {
    title: string
    items: ListItemProps[]
    emptyText?: string
    viewAllHref?: string
}

export function ListContainer({ title, items, emptyText, viewAllHref }: ListContainerProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base text-slate-800">{title}</CardTitle>
                {viewAllHref && (
                    <Link href={viewAllHref} className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline">
                        Tümü
                    </Link>
                )}
            </CardHeader>
            <CardContent>
                {items.length === 0 ? (
                    <p className="text-center py-6 text-sm text-slate-500">{emptyText || 'Veri bulunamadı'}</p>
                ) : (
                    <div className="-mx-6 -mb-6">
                        {items.map((item, idx) => (
                            <div key={idx}>
                                <ListCard {...item} />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
