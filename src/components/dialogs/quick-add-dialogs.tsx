'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface QuickAddProductProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function QuickAddProductDialog({ open, onOpenChange, onSuccess }: QuickAddProductProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        category: '',
        unit: 'adet',
        purchasePrice: '',
        salePrice: '',
        criticalLevel: '10',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    purchasePrice: parseFloat(formData.purchasePrice),
                    salePrice: parseFloat(formData.salePrice),
                    criticalLevel: parseInt(formData.criticalLevel),
                }),
            })

            if (response.ok) {
                toast({
                    title: 'Başarılı',
                    description: 'Ürün eklendi',
                })
                onOpenChange(false)
                setFormData({
                    name: '',
                    code: '',
                    category: '',
                    unit: 'adet',
                    purchasePrice: '',
                    salePrice: '',
                    criticalLevel: '10',
                })
                onSuccess?.()
            } else {
                toast({
                    title: 'Hata',
                    description: 'Ürün eklenirken hata oluştu',
                    variant: 'destructive',
                })
            }
        } catch (error) {
            toast({
                title: 'Hata',
                description: 'İstek gönderilirken hata oluştu',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hızlı Ürün Ekle</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Ürün Adı</Label>
                        <Input
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="code">Kod</Label>
                        <Input
                            id="code"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="purchasePrice">Alış Fiyatı</Label>
                            <Input
                                id="purchasePrice"
                                type="number"
                                step="0.01"
                                required
                                value={formData.purchasePrice}
                                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="salePrice">Satış Fiyatı</Label>
                            <Input
                                id="salePrice"
                                type="number"
                                step="0.01"
                                required
                                value={formData.salePrice}
                                onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            İptal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            Ekle
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

interface QuickAddCustomerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function QuickAddCustomerDialog({ open, onOpenChange, onSuccess }: QuickAddCustomerProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (response.ok) {
                toast({
                    title: 'Başarılı',
                    description: 'Müşteri eklendi',
                })
                onOpenChange(false)
                setFormData({ name: '', phone: '', email: '', address: '' })
                onSuccess?.()
            }
        } catch (error) {
            toast({
                title: 'Hata',
                description: 'İstek gönderilirken hata oluştu',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hızlı Müşteri Ekle</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Ad Soyad</Label>
                        <Input
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="email">E-posta</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            İptal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            Ekle
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
