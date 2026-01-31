import { Badge } from "@/components/ui/badge";
import { Pill, Wrench, Stethoscope, Beaker, Wheat } from "lucide-react";

type ProductCategory =
  | "MEDICINE"
  | "SERVICE"
  | "MEDICAL_SUPPLY"
  | "PREMIX"
  | "FEED";

interface ProductCategoryBadgeProps {
  category: ProductCategory;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const categoryConfig = {
  MEDICINE: {
    label: "İlaç",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Pill,
  },
  SERVICE: {
    label: "Hizmet",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Wrench,
  },
  MEDICAL_SUPPLY: {
    label: "Medikal Malzeme",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: Stethoscope,
  },
  PREMIX: {
    label: "Premix",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Beaker,
  },
  FEED: {
    label: "Yem",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Wheat,
  },
};

export function ProductCategoryBadge({
  category,
  size = "md",
  showIcon = true,
}: ProductCategoryBadgeProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <Badge
      variant="outline"
      className={`${config.color} ${sizeClasses[size]} font-semibold border flex items-center gap-1.5 w-fit`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}
