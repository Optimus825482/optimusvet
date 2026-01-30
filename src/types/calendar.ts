import {
  Transaction,
  Reminder,
  Customer,
  Supplier,
  Animal,
} from "@prisma/client";

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "transaction" | "reminder";
  status?: string;
  amount?: number;
  description?: string;
}

export interface CalendarTransaction extends Transaction {
  customer?: Pick<Customer, "id" | "name"> | null;
  supplier?: Pick<Supplier, "id" | "name"> | null;
}

export interface CalendarReminder extends Reminder {
  customer?: Pick<Customer, "id" | "name"> | null;
  animal?: Pick<Animal, "id" | "name"> | null;
}

export interface CalendarData {
  transactions: CalendarTransaction[];
  reminders: CalendarReminder[];
  events: CalendarEvent[];
}

export interface DayData {
  date: Date;
  transactions: CalendarTransaction[];
  reminders: CalendarReminder[];
  totalAmount: number;
  eventCount: number;
}
