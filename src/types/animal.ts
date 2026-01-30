import {
  Animal,
  Customer,
  AnimalProtocol,
  Protocol,
  ProtocolRecord,
} from "@prisma/client";

export interface AnimalWithRelations extends Animal {
  customer: Customer;
  protocols: (AnimalProtocol & {
    protocol: Protocol;
    records: ProtocolRecord[];
  })[];
}

export interface AnimalFormData {
  name: string;
  species: string;
  breed?: string;
  birthDate?: Date | string;
  gender?: string;
  color?: string;
  weight?: number;
  chipNumber?: string;
  customerId: string;
  notes?: string;
}

export interface ProtocolFormData {
  protocolId: string;
  startDate: Date | string;
  notes?: string;
}

export interface ProtocolRecordFormData {
  animalProtocolId: string;
  notes?: string;
  completedAt?: Date | string;
}
