"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { X, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  ShoppingCart,
  Receipt,
  Syringe,
  Calendar,
  Settings,
} from "lucide-react";

const navItems = [
  { title: "Ana Sayfa", href: "/dashboard", icon: LayoutDashboard },
  { title: "Stok", href: "/dashboard/products", icon: Package },
  { title: "Müşteriler", href: "/dashboard/customers", icon: Users },
  { title: "Firmalar", href: "/dashboard/suppliers", icon: Building2 },
  { title: "Satış", href: "/dashboard/sales", icon: ShoppingCart },
  { title: "Satın Alma", href: "/dashboard/purchases", icon: Receipt },
  { title: "Hayvanlar", href: "/dashboard/animals", icon: PawPrint },
  { title: "Protokoller", href: "/dashboard/protocols", icon: Syringe },
  { title: "Takvim", href: "/dashboard/calendar", icon: Calendar },
  { title: "Ayarlar", href: "/dashboard/settings", icon: Settings },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm lg:hidden transition-all duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Sidebar Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-[70] w-72 bg-card border-r border-border shadow-2xl lg:hidden transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                <PawPrint className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">OPTIMUS</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-white shadow-md shadow-primary/20"
                          : "text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-5 h-5",
                          isActive ? "text-white" : "text-slate-500",
                        )}
                      />
                      <span>{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground text-center">
              © 2026 Optimus Vet. v1.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
