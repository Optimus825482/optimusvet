"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  ShoppingCart,
  Receipt,
  PawPrint,
  Syringe,
  Calendar,
  Settings,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  {
    title: "Ana Sayfa",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "text-indigo-500",
  },
  {
    title: "Stok Yönetimi",
    href: "/dashboard/products",
    icon: Package,
    color: "text-blue-500",
  },
  {
    title: "Müşteriler",
    href: "/dashboard/customers",
    icon: Users,
    color: "text-emerald-500",
  },
  {
    title: "Tedarikçiler",
    href: "/dashboard/suppliers",
    icon: Building2,
    color: "text-orange-500",
  },
  {
    title: "Satış İşlemleri",
    href: "/dashboard/sales",
    icon: ShoppingCart,
    color: "text-green-500",
  },
  {
    title: "Alım İşlemleri",
    href: "/dashboard/purchases",
    icon: Receipt,
    color: "text-red-500",
  },
  {
    title: "Hastalar",
    href: "/dashboard/animals",
    icon: PawPrint,
    color: "text-pink-500",
  },
  {
    title: "Protokoller",
    href: "/dashboard/protocols",
    icon: Syringe,
    color: "text-cyan-500",
  },
  {
    title: "Randevular",
    href: "/dashboard/calendar",
    icon: Calendar,
    color: "text-violet-500",
  },
  {
    title: "Sistem Ayarları",
    href: "/dashboard/settings",
    icon: Settings,
    color: "text-slate-500",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return (
    <aside
      id="desktop-sidebar"
      className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50 bg-card border-r border-slate-100 pb-5"
    >
      {/* Logo Section - Always visible to prevent layout shift */}
      <div className="flex items-center justify-center h-30 px-4 mb-2">
        {/* Logo Image */}
        <div className="relative w-56 h-32 hover:scale-105 transition-transform duration-300">
          <img
            src="/logo.png"
            alt="Optimus Vet"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Navigation - Content hydrates after mount */}
      <nav className="flex-1 overflow-y-auto px-6 space-y-4 scrollbar-hide pb-12">
        {mounted ? (
          <>
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href + "/"));

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-4 px-3 py-2 rounded-2xl text-[13px] font-black transition-all duration-300 relative overflow-hidden",
                        isActive
                          ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10"
                          : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 uppercase tracking-tight",
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300",
                          isActive
                            ? "bg-white/10 text-white group-hover:rotate-6"
                            : cn(
                                "group-hover:bg-current/5 group-hover:rotate-3",
                                item.color,
                              ),
                        )}
                      >
                        <item.icon
                          className={cn("w-5 h-5", !isActive && "text-current")}
                        />
                      </div>

                      <span className="relative z-10 font-black">
                        {item.title}
                      </span>

                      {isActive && (
                        <ChevronRight className="ml-auto w-4 h-4 text-primary relative z-10" />
                      )}

                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-10 px-2">
              <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden shadow-2xl group">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-50">
                    Sürüm 1.2.0
                  </p>
                  <p className="text-sm font-black mb-4 leading-tight italic">
                    Premium Özellikler Aktif Edildi.
                  </p>
                  <Link
                    href="/dashboard/settings"
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:gap-3 transition-all"
                  >
                    İNCELE <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-slate-50 rounded-2xl" />
            ))}
          </div>
        )}
      </nav>

      <div className="px-8 mt-auto">
        <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500" />
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
              System Online
            </p>
          </div>
          <p className="text-[8px] font-black text-slate-200 uppercase tracking-widest">
            © 2026
          </p>
        </div>
      </div>
    </aside>
  );
}
