import Image from "next/image";
import {
  Package,
  Pill,
  Wrench,
  Stethoscope,
  Beaker,
  Wheat,
} from "lucide-react";

type ProductCategory =
  | "MEDICINE"
  | "SERVICE"
  | "MEDICAL_SUPPLY"
  | "PREMIX"
  | "FEED";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  category: ProductCategory;
  size?: "sm" | "md" | "lg" | "xl";
}

const categoryIcons = {
  MEDICINE: Pill,
  SERVICE: Wrench,
  MEDICAL_SUPPLY: Stethoscope,
  PREMIX: Beaker,
  FEED: Wheat,
};

const categoryColors = {
  MEDICINE: "bg-blue-100 text-blue-600",
  SERVICE: "bg-purple-100 text-purple-600",
  MEDICAL_SUPPLY: "bg-green-100 text-green-600",
  PREMIX: "bg-orange-100 text-orange-600",
  FEED: "bg-amber-100 text-amber-600",
};

const sizeConfig = {
  sm: {
    container: "w-10 h-10 sm:w-12 sm:h-12",
    icon: "w-5 h-5 sm:w-6 sm:h-6",
    image: 48,
  },
  md: {
    container: "w-16 h-16 sm:w-20 sm:h-20",
    icon: "w-8 h-8 sm:w-10 sm:h-10",
    image: 80,
  },
  lg: {
    container: "w-24 h-24 sm:w-32 sm:h-32",
    icon: "w-12 h-12 sm:w-16 sm:h-16",
    image: 128,
  },
  xl: {
    container: "w-32 h-32 sm:w-40 sm:h-40",
    icon: "w-16 h-16 sm:w-20 sm:h-20",
    image: 160,
  },
};

export function ProductImage({
  src,
  alt,
  category,
  size = "md",
}: ProductImageProps) {
  const Icon = categoryIcons[category];
  const config = sizeConfig[size];

  // Resim varsa göster
  if (src) {
    return (
      <div
        className={`${config.container} rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 flex-shrink-0`}
      >
        <Image
          src={src}
          alt={alt}
          width={config.image}
          height={config.image}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  // Resim yoksa kategori icon'u göster (fallback)
  return (
    <div
      className={`${config.container} ${categoryColors[category]} rounded-xl flex items-center justify-center flex-shrink-0`}
    >
      <Icon className={config.icon} />
    </div>
  );
}
