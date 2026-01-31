"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, Share, MoreVertical, Plus } from "lucide-react";

interface PWAInstallHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PWAInstallHelpModal({
  open,
  onOpenChange,
}: PWAInstallHelpModalProps) {
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">(
    "desktop",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Uygulamayı Nasıl Yüklerim?
          </DialogTitle>
          <DialogDescription>
            Optimus Vet'i cihazınıza yüklemek için aşağıdaki adımları izleyin
          </DialogDescription>
        </DialogHeader>

        {/* Platform Seçimi */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={platform === "desktop" ? "default" : "outline"}
            size="sm"
            onClick={() => setPlatform("desktop")}
            className="flex-1"
          >
            <Monitor className="w-4 h-4 mr-2" />
            Bilgisayar
          </Button>
          <Button
            variant={platform === "android" ? "default" : "outline"}
            size="sm"
            onClick={() => setPlatform("android")}
            className="flex-1"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            Android
          </Button>
          <Button
            variant={platform === "ios" ? "default" : "outline"}
            size="sm"
            onClick={() => setPlatform("ios")}
            className="flex-1"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            iOS
          </Button>
        </div>

        {/* Desktop Talimatları */}
        {platform === "desktop" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Chrome / Edge / Brave
              </h3>
              <ol className="space-y-2 text-sm text-blue-800">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <span>
                    Tarayıcınızın sağ üst köşesindeki <strong>"Yükle"</strong>{" "}
                    butonuna tıklayın
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <span>
                    Veya adres çubuğunun sağındaki <strong>⊕</strong> (artı)
                    ikonuna tıklayın
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <span>
                    <strong>"Yükle"</strong> veya <strong>"Install"</strong>{" "}
                    butonuna basın
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">4.</span>
                  <span>
                    Uygulama masaüstünüze yüklenecek ve başlat menüsünde
                    görünecektir
                  </span>
                </li>
              </ol>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">💡 İpucu</h3>
              <p className="text-sm text-slate-700">
                Yükleme butonu görünmüyorsa, tarayıcınızın menüsünden (⋮)
                <strong> "Uygulamayı yükle"</strong> veya{" "}
                <strong>"Install app"</strong> seçeneğini arayın.
              </p>
            </div>
          </div>
        )}

        {/* Android Talimatları */}
        {platform === "android" && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Chrome (Android)
              </h3>
              <ol className="space-y-2 text-sm text-green-800">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <span>
                    Tarayıcınızın sağ üst köşesindeki <strong>⋮</strong> (üç
                    nokta) menüsüne tıklayın
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <span>
                    <strong>"Ana ekrana ekle"</strong> veya{" "}
                    <strong>"Add to Home screen"</strong> seçeneğini seçin
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <span>
                    Uygulama adını onaylayın ve <strong>"Ekle"</strong> butonuna
                    basın
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">4.</span>
                  <span>Uygulama ana ekranınıza eklenecektir</span>
                </li>
              </ol>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">
                📱 Alternatif Yöntem
              </h3>
              <p className="text-sm text-slate-700">
                Bazı Android cihazlarda ekranın altında otomatik olarak
                <strong> "Yükle"</strong> banner'ı görünebilir. Bu banner'a
                tıklayarak da yükleyebilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* iOS Talimatları */}
        {platform === "ios" && (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Safari (iPhone/iPad)
              </h3>
              <ol className="space-y-2 text-sm text-purple-800">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <span>Safari'de uygulamayı açın</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <span>
                    Ekranın altındaki <Share className="w-4 h-4 inline mx-1" />{" "}
                    <strong>"Paylaş"</strong> butonuna tıklayın
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <span>
                    Açılan menüden <Plus className="w-4 h-4 inline mx-1" />{" "}
                    <strong>"Ana Ekrana Ekle"</strong> seçeneğini bulun
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">4.</span>
                  <span>
                    Uygulama adını onaylayın ve sağ üstteki{" "}
                    <strong>"Ekle"</strong> butonuna basın
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">5.</span>
                  <span>Uygulama ana ekranınıza eklenecektir</span>
                </li>
              </ol>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 mb-2">
                ⚠️ Önemli Not
              </h3>
              <p className="text-sm text-amber-800">
                iOS'ta PWA yüklemesi <strong>sadece Safari tarayıcısı</strong>{" "}
                ile çalışır. Chrome veya diğer tarayıcılar bu özelliği
                desteklemez.
              </p>
            </div>
          </div>
        )}

        {/* Avantajlar */}
        <div className="mt-6 bg-gradient-to-br from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-4">
          <h3 className="font-semibold text-teal-900 mb-3">
            ✨ Yükleme Avantajları
          </h3>
          <ul className="space-y-2 text-sm text-teal-800">
            <li className="flex items-start gap-2">
              <span className="text-teal-600 mt-0.5">✓</span>
              <span>
                <strong>Hızlı Erişim:</strong> Ana ekranınızdan tek tıkla açın
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600 mt-0.5">✓</span>
              <span>
                <strong>Tam Ekran:</strong> Tarayıcı çubuğu olmadan daha geniş
                alan
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600 mt-0.5">✓</span>
              <span>
                <strong>Offline Çalışma:</strong> İnternet olmadan da bazı
                özellikler kullanılabilir
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600 mt-0.5">✓</span>
              <span>
                <strong>Daha Hızlı:</strong> Önbellek sayesinde daha hızlı
                yüklenir
              </span>
            </li>
          </ul>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={() => onOpenChange(false)}>Anladım</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
