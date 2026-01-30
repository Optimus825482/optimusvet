"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Calendar,
} from "lucide-react";

const mobileNavItems = [
  {
    title: "Ana Sayfa",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Stok",
    href: "/dashboard/products",
    icon: Package,
  },
  {
    title: "Müşteri",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    title: "Satış",
    href: "/dashboard/sales",
    icon: ShoppingCart,
  },
  {
    title: "Takvim",
    href: "/dashboard/calendar",
    icon: Calendar,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border pb-safe shadow-lg">
      <ul className="flex items-center justify-around h-16">
        {mobileNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isActive && "scale-110",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isActive && "font-semibold",
                  )}
                >
                  {item.title}
                </span>
                {isActive && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary shadow-lg shadow-primary/20" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
