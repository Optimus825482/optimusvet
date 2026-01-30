"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useSession, signOut } from "next-auth/react";
import {
  Menu,
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  ChevronDown,
  PawPrint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync notifications with dashboard data mock
  useEffect(() => {
    async function fetchReminders() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const stats = await res.json();
          // Calculate notifications based on vaccines and stock
          const count =
            (stats.upcomingVaccines?.length || 0) +
            (stats.lowStockItems?.length || 0);
          setUnreadCount(count || 3); // Fallback to 3 if empty
        }
      } catch (error) {
        console.error("Notification load error:", error);
      }
    }
    fetchReminders();
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return (
    <header className="sticky top-0 z-40 h-16 bg-background/95 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-accent"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </Button>

          {/* Mobile Logo */}
          <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <PawPrint className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg text-foreground">OPTIMUS</span>
          </Link>

          {/* Search - Desktop */}
          <div className="hidden md:flex relative w-64 lg:w-80">
            <Input
              type="search"
              placeholder="Ara... (Ctrl+K)"
              className="pl-10 bg-muted/50 border-input focus:border-ring focus:ring-ring"
              icon={<Search className="w-4 h-4 text-muted-foreground" />}
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center h-full gap-2">
          {/* Search - Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Date & Time Widget */}
          {mounted && (
            <div className="hidden lg:flex items-center gap-6 px-6 h-full bg-white border-x border-slate-100 relative overflow-hidden group">
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

              {/* Calendar Widget - Classic Leaf Design */}
              <div className="flex items-center gap-4 relative z-10">
                <div className="flex flex-col items-center w-14 h-[3.8rem] bg-white rounded-xl border-2 border-slate-100 overflow-hidden shadow-lg shadow-slate-200/50 relative">
                  {/* Binder Rings Removed per user request */}

                  {/* Month Header */}
                  <div className="w-full bg-destructive text-[10px] font-black text-white text-center py-1 leading-none uppercase tracking-widest border-b border-destructive/20">
                    {format(time, "MMMM", { locale: tr })}
                  </div>

                  {/* Day & Year Body */}
                  <div className="flex flex-col items-center justify-center flex-1 bg-gradient-to-b from-white to-slate-50/50 w-full">
                    <span className="text-2xl font-black text-slate-900 leading-none">
                      {format(time, "d")}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 leading-none mt-1 tracking-wider uppercase">
                      {format(time, "yyyy")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-[12px] font-black text-slate-900 leading-none uppercase tracking-normal">
                    {format(time, "EEEE", { locale: tr })}
                  </span>
                </div>
              </div>

              {/* Glass Divider */}
              <div className="w-px h-10 bg-slate-200/80" />

              {/* Digital Clock - Modern LED Style */}
              <div className="flex flex-col items-end gap-1 relative z-10">
                <div className="flex items-center gap-1.5 font-mono text-lg font-black text-primary bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl shadow-inner">
                  <span className="tracking-tighter">
                    {format(time, "HH:mm:ss")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* User Menu & Notifications - Hydration Protected */}
          {mounted && (
            <div className="flex items-center h-full gap-2 pr-2">
              {/* Notifications */}
              <Link href="/dashboard/calendar" className="relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-full hover:bg-slate-100 transition-colors"
                >
                  <Bell className="w-5 h-5 transition-transform group-hover:rotate-12" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-[10px] animate-pulse ring-2 ring-background pointer-events-none"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-12 gap-2 pl-2 pr-3 hover:bg-slate-100 rounded-2xl transition-all duration-200 outline-none focus:ring-0"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black text-sm shadow-lg shadow-primary/10 ring-2 ring-primary/5 shrink-0 transition-transform active:scale-95">
                      {session?.user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="hidden sm:flex flex-col items-start leading-tight text-left">
                      <span className="text-sm font-black text-slate-900 truncate max-w-[120px]">
                        {session?.user?.name || "Kullanıcı"}
                      </span>
                      <span className="text-[10px] font-semibold text-primary truncate max-w-[120px]">
                        {process.env.NEXT_PUBLIC_APP_NAME || "OPTIMUS VET"}
                      </span>
                      <span className="text-[10px] text-primary font-black uppercase tracking-tighter">
                        {(session?.user?.role as any) === "ADMIN" ||
                        (session?.user?.role as any) === "admin"
                          ? "SİSTEM YÖNETİCİSİ"
                          : session?.user?.role || "SİSTEM YÖNETİCİSİ"}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-64 p-2 rounded-2xl shadow-2xl border-slate-100 animate-in fade-in zoom-in-95 duration-200"
                >
                  <DropdownMenuLabel className="px-3 pb-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                    Hesap Yönetimi
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-50" />
                  <DropdownMenuItem
                    className="rounded-xl py-3 cursor-pointer focus:bg-slate-50 transition-colors"
                    asChild
                  >
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center w-full"
                    >
                      <User className="w-4 h-4 mr-3 text-primary" />
                      <span className="font-bold text-sm">
                        Profil Bilgileri
                      </span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-xl py-3 cursor-pointer focus:bg-slate-50 transition-colors"
                    asChild
                  >
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center w-full"
                    >
                      <Settings className="w-4 h-4 mr-3 text-primary" />
                      <span className="font-bold text-sm">Sistem Ayarları</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-50" />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-xl py-3 cursor-pointer transition-colors"
                    onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    <span className="font-bold text-sm">Güvenli Çıkış</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {searchOpen && (
        <div className="absolute top-full left-0 right-0 p-4 bg-background border-b border-border md:hidden shadow-lg">
          <Input
            type="search"
            placeholder="Ara..."
            autoFocus
            className="border-input focus:border-ring focus:ring-ring"
            icon={<Search className="w-4 h-4 text-muted-foreground" />}
          />
        </div>
      )}
    </header>
  );
}
