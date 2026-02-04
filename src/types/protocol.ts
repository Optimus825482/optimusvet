// Shared types between API and Frontend
// This ensures type safety and contract consistency

export interface ProtocolStep {
  id: string;
  name: string;
  description: string | null;
  dayOffset: number;
  scheduledDate: string;
  completedAt: string | null;
  notes: string | null;
}

export interface ProtocolAnimal {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
}

export interface ProtocolTemplate {
  id: string;
  name: string;
  type: string;
}

export interface ProtocolResponse {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  notes: string | null;
  progress: number;
  completedSteps: number;
  totalSteps: number;
  animal: ProtocolAnimal;
  template: ProtocolTemplate | null;
  steps: ProtocolStep[];
}

// Type guard for runtime validation
export function isValidProtocolResponse(
  data: unknown,
): data is ProtocolResponse {
  if (!data || typeof data !== "object") return false;

  const p = data as Record<string, unknown>;

  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.type === "string" &&
    typeof p.status === "string" &&
    typeof p.startDate === "string" &&
    typeof p.progress === "number" &&
    typeof p.completedSteps === "number" &&
    typeof p.totalSteps === "number" &&
    p.animal !== undefined &&
    Array.isArray(p.steps)
  );
}

// Default empty protocol for fallback
export const EMPTY_PROTOCOL: ProtocolResponse = {
  id: "",
  name: "Yükleniyor...",
  type: "OTHER",
  status: "ACTIVE",
  startDate: new Date().toISOString(),
  notes: null,
  progress: 0,
  completedSteps: 0,
  totalSteps: 0,
  animal: {
    id: "",
    name: "",
    species: "OTHER",
    breed: null,
    customer: {
      id: "",
      name: "",
      phone: null,
      email: null,
    },
  },
  template: null,
  steps: [],
};
