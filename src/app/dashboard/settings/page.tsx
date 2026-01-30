"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Building2,
  User,
  Bell,
  Palette,
  Database,
  Save,
  Loader2,
  Check,
  Mail,
  Lock,
  Shield,
  ExternalLink,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("clinic");
  const queryClient = useQueryClient();

  // Clinic settings state
  const [clinicName, setClinicName] = useState("Optimus Veteriner Kliniği");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicCity, setClinicCity] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [taxOffice, setTaxOffice] = useState("");

  // Notification settings
  const [vaccineReminder, setVaccineReminder] = useState(3);
  const [fertilityReminder, setFertilityReminder] = useState(3);
  const [paymentReminder, setPaymentReminder] = useState(7);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);

  // Display settings
  const [currency, setCurrency] = useState("TRY");
  const [dateFormat, setDateFormat] = useState("DD.MM.YYYY");
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // SMTP settings state
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpFrom, setSmtpFrom] = useState("");

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    toast({
      variant: "success",
      title: "Ayarlar Kaydedildi",
      description: "Değişiklikler başarıyla uygulandı",
    });
  };

  const tabs = [
    { id: "clinic", label: "Klinik Bilgileri", icon: Building2 },
    { id: "notifications", label: "Bildirimler", icon: Bell },
    { id: "smtp", label: "Güvenlik & SMTP", icon: Shield },
    { id: "display", label: "Görünüm", icon: Palette },
    { id: "data", label: "Veri Yönetimi", icon: Database },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Ayarlar
        </h1>
        <p className="text-muted-foreground">
          Uygulama ve klinik ayarlarını yapılandırın
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary text-white"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Clinic Info */}
          {activeTab === "clinic" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Klinik Bilgileri
                </CardTitle>
                <CardDescription>
                  Fatura ve raporlarda görünecek klinik bilgileri
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinicName">Klinik Adı</Label>
                    <Input
                      id="clinicName"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="Klinik adı"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicPhone">Telefon</Label>
                    <Input
                      id="clinicPhone"
                      value={clinicPhone}
                      onChange={(e) => setClinicPhone(e.target.value)}
                      placeholder="0XXX XXX XX XX"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinicEmail">E-posta</Label>
                    <Input
                      id="clinicEmail"
                      type="email"
                      value={clinicEmail}
                      onChange={(e) => setClinicEmail(e.target.value)}
                      placeholder="klinik@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicCity">Şehir</Label>
                    <Input
                      id="clinicCity"
                      value={clinicCity}
                      onChange={(e) => setClinicCity(e.target.value)}
                      placeholder="İstanbul"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicAddress">Adres</Label>
                  <textarea
                    id="clinicAddress"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-xl border-2 border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                    placeholder="Açık adres"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxNumber">Vergi Numarası</Label>
                    <Input
                      id="taxNumber"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      placeholder="Vergi numarası"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxOffice">Vergi Dairesi</Label>
                    <Input
                      id="taxOffice"
                      value={taxOffice}
                      onChange={(e) => setTaxOffice(e.target.value)}
                      placeholder="Vergi dairesi adı"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Bildirim Ayarları
                </CardTitle>
                <CardDescription>
                  Hatırlatıcı ve bildirim tercihlerini yapılandırın
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Hatırlatma Süreleri</h4>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vaccineReminder">
                        Aşı Hatırlatma (gün önce)
                      </Label>
                      <Select
                        value={vaccineReminder.toString()}
                        onValueChange={(v) => setVaccineReminder(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 gün</SelectItem>
                          <SelectItem value="2">2 gün</SelectItem>
                          <SelectItem value="3">3 gün</SelectItem>
                          <SelectItem value="5">5 gün</SelectItem>
                          <SelectItem value="7">7 gün</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fertilityReminder">
                        Fertilite Hatırlatma (gün önce)
                      </Label>
                      <Select
                        value={fertilityReminder.toString()}
                        onValueChange={(v) => setFertilityReminder(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 gün</SelectItem>
                          <SelectItem value="2">2 gün</SelectItem>
                          <SelectItem value="3">3 gün</SelectItem>
                          <SelectItem value="5">5 gün</SelectItem>
                          <SelectItem value="7">7 gün</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentReminder">
                        Ödeme Hatırlatma (gün sonra)
                      </Label>
                      <Select
                        value={paymentReminder.toString()}
                        onValueChange={(v) => setPaymentReminder(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 gün</SelectItem>
                          <SelectItem value="7">7 gün</SelectItem>
                          <SelectItem value="14">14 gün</SelectItem>
                          <SelectItem value="30">30 gün</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Bildirim Kanalları</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div>
                        <div className="font-medium">E-posta Bildirimleri</div>
                        <div className="text-sm text-muted-foreground">
                          Hatırlatıcıları e-posta olarak gönder
                        </div>
                      </div>
                      <button
                        onClick={() => setEmailEnabled(!emailEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          emailEnabled ? "bg-primary" : "bg-slate-300"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            emailEnabled ? "translate-x-6" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SMTP & Security */}
          {activeTab === "smtp" && (
            <div className="space-y-6">
              <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        SMTP Ayarları
                      </CardTitle>
                      <CardDescription>
                        İki faktörlü doğrulama ve sistem e-postaları için SMTP
                        yapılandırması
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className="rounded-lg border-emerald-500/20 text-emerald-600 bg-emerald-50 font-black text-[9px] uppercase tracking-widest px-2"
                    >
                      SSL/TLS AKTİF
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP Sunucusu</Label>
                      <Input
                        id="smtpHost"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">Port</Label>
                      <Input
                        id="smtpPort"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="587"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">Kullanıcı Adı (Email)</Label>
                      <Input
                        id="smtpUser"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="ornek@gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPass">Şifre / Uygulama Şifresi</Label>
                      <Input
                        id="smtpPass"
                        type="password"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtpFrom">Gönderen Adı</Label>
                      <Input
                        id="smtpFrom"
                        value={smtpFrom}
                        onChange={(e) => setSmtpFrom(e.target.value)}
                        placeholder="Optimus Vet Bildirim"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSmtpSecure(!smtpSecure)}
                          className={`w-10 h-5 rounded-full transition-colors ${
                            smtpSecure ? "bg-primary" : "bg-slate-300"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              smtpSecure ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                        <span className="text-sm font-medium">
                          Güvenli Bağlantı (SSL/TLS)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 italic">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500"
                    >
                      <Check className="w-3 h-3 mr-2 text-emerald-500" />
                      BAĞLANTIYI TEST ET
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Gmail Guide Card */}
              <Card className="rounded-[2.5rem] border-slate-100 bg-sky-50 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-200/30 rounded-full -mr-16 -mt-16 blur-3xl" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-black text-sky-900 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Gmail SMTP Rehberi
                  </CardTitle>
                  <CardDescription className="text-sky-700/70 font-bold uppercase text-[10px] tracking-widest">
                    UYGULAMA ŞİFRESİ NASIL ALINIR?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm text-sky-900/80 font-medium leading-relaxed">
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-xs font-black text-sky-600 border border-sky-200">
                        1
                      </span>
                      <p>
                        Google Hesabınıza gidin ve <b>"Güvenlik"</b> sekmesini
                        açın.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-xs font-black text-sky-600 border border-sky-200">
                        2
                      </span>
                      <p>
                        <b>"İki adımlı doğrulama"</b>nın aktif olduğundan emin
                        olun.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-xs font-black text-sky-600 border border-sky-200">
                        3
                      </span>
                      <p>
                        Arama çubuğuna <b>"Uygulama Şifreleri"</b> yazın veya
                        Güvenlik sayfasının en altında bu seçeneği bulun.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-xs font-black text-sky-600 border border-sky-200">
                        4
                      </span>
                      <p>
                        Uygulama adı olarak <b>"Optimus Vet"</b> yazın ve
                        "Oluştur" butonuna basın.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-xs font-black text-sky-600 border border-sky-200">
                        5
                      </span>
                      <p>
                        Size verilen <b>16 haneli şifreyi</b> kopyalayın ve
                        yukarıdaki "Şifre" alanına yapıştırın.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-2xl bg-white/50 border border-sky-200 flex items-center justify-between group cursor-pointer hover:bg-white transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                        <ExternalLink className="w-4 h-4 text-sky-600" />
                      </div>
                      <span className="text-xs font-black text-sky-800 uppercase tracking-widest">
                        GOOGLE GÜVENLİK AYARLARI
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-sky-400 -rotate-90" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Display */}
          {activeTab === "display" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Görünüm Ayarları
                </CardTitle>
                <CardDescription>
                  Uygulama görünüm tercihlerini özelleştirin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Para Birimi</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                        <SelectItem value="USD">Amerikan Doları ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tarih Formatı</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD.MM.YYYY">31.12.2024</SelectItem>
                        <SelectItem value="DD/MM/YYYY">31/12/2024</SelectItem>
                        <SelectItem value="YYYY-MM-DD">2024-12-31</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Düşük Stok Eşiği</Label>
                  <Input
                    type="number"
                    min="1"
                    value={lowStockThreshold}
                    onChange={(e) =>
                      setLowStockThreshold(parseInt(e.target.value) || 10)
                    }
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Bu değerin altındaki ürünler düşük stok olarak işaretlenir
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Management */}
          {activeTab === "data" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Veri Yönetimi
                </CardTitle>
                <CardDescription>
                  Veritabanı ve yedekleme işlemleri
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Veri Yedeği Al</div>
                        <div className="text-sm text-muted-foreground">
                          Tüm verileri JSON formatında dışa aktar
                        </div>
                      </div>
                      <Button variant="outline">Yedekle</Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Veri İçe Aktar</div>
                        <div className="text-sm text-muted-foreground">
                          Yedek dosyasından verileri geri yükle
                        </div>
                      </div>
                      <Button variant="outline">İçe Aktar</Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-destructive/20 bg-destructive/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-destructive">
                          Tüm Verileri Sil
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Bu işlem geri alınamaz! Önce yedek alın.
                        </div>
                      </div>
                      <Button variant="destructive">Sil</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving} className="min-w-32">
              <Save className="w-4 h-4 mr-2" />
              Kaydet
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t mt-8">
        <p className="text-xs text-muted-foreground">
          © 2026 Optimus Vet. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  );
}
