"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  Package,
  ShoppingCart,
  FileText,
  Calendar,
  Users,
  Loader2,
  PawPrint,
  Building2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  type: "customer" | "supplier" | "product" | "animal";
  title: string;
  subtitle?: string;
  url: string;
  icon: React.ReactNode;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search customers
      const customersRes = await fetch(
        `/api/customers?search=${encodeURIComponent(searchQuery)}&limit=5`,
      );
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        customersData.customers?.forEach((customer: any) => {
          searchResults.push({
            id: customer.id,
            type: "customer",
            title: customer.name,
            subtitle: customer.phone || customer.email || customer.city,
            url: `/dashboard/customers/${customer.id}`,
            icon: <User className="w-4 h-4" />,
          });
        });
      }

      // Search suppliers (Firmalar)
      const suppliersRes = await fetch(
        `/api/suppliers?search=${encodeURIComponent(searchQuery)}&limit=5`,
      );
      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        suppliersData.suppliers?.forEach((supplier: any) => {
          searchResults.push({
            id: supplier.id,
            type: "supplier",
            title: supplier.name,
            subtitle: supplier.phone || supplier.email || supplier.city,
            url: `/dashboard/suppliers/${supplier.id}`,
            icon: <Building2 className="w-4 h-4" />,
          });
        });
      }

      // Search products
      const productsRes = await fetch(
        `/api/products?search=${encodeURIComponent(searchQuery)}&limit=5`,
      );
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        productsData.products?.forEach((product: any) => {
          searchResults.push({
            id: product.id,
            type: "product",
            title: product.name,
            subtitle: `Stok: ${product.stock} ${product.unit} - ${product.salePrice} ₺`,
            url: `/dashboard/products/${product.id}`,
            icon: <Package className="w-4 h-4" />,
          });
        });
      }

      // Search animals
      const animalsRes = await fetch(
        `/api/animals?search=${encodeURIComponent(searchQuery)}&limit=5`,
      );
      if (animalsRes.ok) {
        const animalsData = await animalsRes.json();
        animalsData.animals?.forEach((animal: any) => {
          searchResults.push({
            id: animal.id,
            type: "animal",
            title: animal.name,
            subtitle: `${animal.species} - ${animal.customer?.name || "Sahip bilinmiyor"}`,
            url: `/dashboard/animals/${animal.id}`,
            icon: <PawPrint className="w-4 h-4" />,
          });
        });
      }

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, results, selectedIndex]);

  // Handle selection
  const handleSelect = (result: SearchResult) => {
    router.push(result.url);
    onOpenChange(false);
    setQuery("");
    setResults([]);
  };

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "customer":
        return "Müşteri";
      case "supplier":
        return "Firma";
      case "product":
        return "Ürün";
      case "animal":
        return "Hayvan";
      default:
        return type;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "customer":
        return "default";
      case "supplier":
        return "outline";
      case "product":
        return "secondary";
      case "animal":
        return "default";
      default:
        return "secondary";
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "customer":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "supplier":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "product":
        return "bg-green-100 text-green-700 border-green-200";
      case "animal":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">Ara</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative border-b">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Müşteri, firma, ürün, hayvan ara..."
            className="border-0 pl-12 pr-4 py-6 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
          )}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {query.length < 2 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Aramak için en az 2 karakter girin</p>
              <p className="text-xs mt-2">
                Müşteri, firma, ürün veya hayvan arayabilirsiniz
              </p>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Sonuç bulunamadı</p>
              <p className="text-xs mt-2">Farklı bir arama deneyin</p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    index === selectedIndex
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">
                        {result.title}
                      </p>
                    </div>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  <Badge
                    className={`text-xs font-bold shrink-0 ${getTypeBadgeColor(result.type)}`}
                  >
                    {getTypeLabel(result.type)}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 text-xs text-muted-foreground flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-background border rounded text-xs">
                ↑↓
              </kbd>
              Gezin
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-background border rounded text-xs">
                Enter
              </kbd>
              Seç
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-background border rounded text-xs">
                Esc
              </kbd>
              Kapat
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
