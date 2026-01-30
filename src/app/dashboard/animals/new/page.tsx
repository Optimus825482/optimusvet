"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, PawPrint, Save, User, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { animalSchema, type AnimalInput } from "@/lib/validations"
import { toast } from "@/hooks/use-toast"

const speciesOptions = [
    { value: "DOG", label: "Köpek" },
    { value: "CAT", label: "Kedi" },
    { value: "BIRD", label: "Kuş" },
    { value: "RABBIT", label: "Tavşan" },
    { value: "FISH", label: "Balık" },
    { value: "REPTILE", label: "Sürüngen" },
    { value: "RODENT", label: "Kemirgen" },
    { value: "HORSE", label: "At" },
    { value: "CATTLE", label: "Sığır" },
    { value: "SHEEP", label: "Koyun" },
    { value: "GOAT", label: "Keçi" },
    { value: "OTHER", label: "Diğer" },
]

const genderOptions = [
    { value: "MALE", label: "Erkek" },
    { value: "FEMALE", label: "Dişi" },
    
]

interface Customer {
    id: string
    code: string
    name: string
    phone: string
}

export default function NewAnimalPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const preSelectedCustomerId = searchParams.get("customerId")
    const [loading, setLoading] = useState(false)
    const [customerSearch, setCustomerSearch] = useState("")
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<AnimalInput>({
        resolver: zodResolver(animalSchema) as any,
        defaultValues: { species: "DOG" },
    })

    const { data: customersData } = useQuery<{ customers: Customer[] }>({
        queryKey: ["customers-search", customerSearch],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (customerSearch) params.set("search", customerSearch)
            params.set("limit", "10")
            const res = await fetch(`/api/customers?${params}`)
            return res.json()
        },
        enabled: customerSearch.length > 0 || showCustomerDropdown,
    })

    useEffect(() => {
        if (preSelectedCustomerId) {
            fetch(`/api/customers/${preSelectedCustomerId}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.id) {
                        setSelectedCustomer(data)
                        setValue("customerId", data.id)
                    }
                })
        }
    }, [preSelectedCustomerId, setValue])

    const onSubmit = async (data: AnimalInput) => {
        if (!selectedCustomer) {
            toast({ variant: "destructive", title: "Hata", description: "Lütfen bir müşteri seçin" })
            return
        }
        setLoading(true)
        try {
            const response = await fetch("/api/animals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, customerId: selectedCustomer.id }),
            })
            const result = await response.json()
            if (!response.ok) {
                toast({ variant: "destructive", title: "Hata", description: result.error })
                return
            }
            toast({ variant: "success", title: "Başarılı", description: "Hayvan başarıyla eklendi" })
            router.push("/dashboard/animals")
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Hayvan eklenirken bir hata oluştu" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 animate-fadeIn max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild><Link href="/dashboard/animals"><ArrowLeft className="w-5 h-5" /></Link></Button>
                <div><h1 className="text-2xl font-bold">Yeni Hayvan Ekle</h1><p className="text-muted-foreground">Hasta bilgilerini girin</p></div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" />Sahip Bilgisi</CardTitle></CardHeader>
                    <CardContent>{selectedCustomer ? (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                            <div><div className="font-semibold">{selectedCustomer.name}</div><div className="text-sm text-muted-foreground">{selectedCustomer.phone} • {selectedCustomer.code}</div></div>
                            <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedCustomer(null); setCustomerSearch("") }}>Değiştir</Button>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder="Müşteri ara (ad, telefon)..." value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true) }} onFocus={() => setShowCustomerDropdown(true)} className="pl-10" />
                            </div>
                            {showCustomerDropdown && customersData?.customers && (
                                <div className="absolute z-10 w-full mt-1 bg-background border rounded-xl shadow-lg max-h-60 overflow-auto">
                                    {customersData.customers.length === 0 ? (<div className="p-4 text-center text-muted-foreground">Müşteri bulunamadı</div>) : (
                                        customersData.customers.map((customer) => (
                                            <button key={customer.id} type="button" className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b last:border-0"
                                                onClick={() => { setSelectedCustomer(customer); setValue("customerId", customer.id); setShowCustomerDropdown(false); setCustomerSearch("") }}>
                                                <div className="font-medium">{customer.name}</div><div className="text-sm text-muted-foreground">{customer.phone} • {customer.code}</div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}</CardContent>
                </Card>
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><PawPrint className="w-5 h-5 text-primary" />Hayvan Bilgileri</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="name" required>Hayvan Adı</Label><Input id="name" placeholder="Örn: Pamuk, Karabaş" error={errors.name?.message} {...register("name")} /></div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="species" required>Tür</Label><Select defaultValue="DOG" onValueChange={(value) => setValue("species", value as any)}><SelectTrigger><SelectValue placeholder="Tür seçin" /></SelectTrigger><SelectContent>{speciesOptions.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent></Select></div>
                            <div className="space-y-2"><Label htmlFor="gender">Cinsiyet</Label><Select  onValueChange={(value) => setValue("gender", value as any)}><SelectTrigger><SelectValue placeholder="Cinsiyet seçin" /></SelectTrigger><SelectContent>{genderOptions.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent></Select></div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="breed">Irk</Label><Input id="breed" placeholder="Örn: Golden Retriever" {...register("breed")} /></div>
                            <div className="space-y-2"><Label htmlFor="color">Renk</Label><Input id="color" placeholder="Örn: Sarı" {...register("color")} /></div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="birthDate">Doğum Tarihi</Label><Input id="birthDate" type="date" {...register("birthDate")} /></div>
                            <div className="space-y-2"><Label htmlFor="weight">Ağırlık (kg)</Label><Input id="weight" type="number" step="0.1" min="0" placeholder="0.0" {...register("weight")} /></div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="chipNumber">Mikroçip Numarası</Label><Input id="chipNumber" placeholder="15 haneli çip numarası" {...register("chipNumber")} /></div>
                    </CardContent>
                </Card>
                <Card><CardHeader><CardTitle>Notlar</CardTitle></CardHeader>
                    <CardContent><textarea id="notes" className="flex min-h-[100px] w-full rounded-xl border-2 border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200" placeholder="Alerjiler, özel durumlar, dikkat edilmesi gerekenler..." {...register("notes")} /></CardContent>
                </Card>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <Button variant="outline" type="button" asChild><Link href="/dashboard/animals">İptal</Link></Button>
                    <Button type="submit" loading={loading} disabled={!selectedCustomer}><Save className="w-4 h-4 mr-2" />Kaydet</Button>
                </div>
            </form>
            <div className="text-center py-4 border-t"><p className="text-xs text-muted-foreground">© 2026 Optimus Vet. Tüm hakları saklıdır.</p></div>
        </div>
    )
}
