// Settings utility functions
import { prisma } from "./prisma";

export interface ClinicSettings {
  clinicName: string;
  clinicPhone?: string;
  clinicEmail?: string;
  clinicAddress?: string;
  clinicCity?: string;
  taxNumber?: string;
  taxOffice?: string;
}

/**
 * Get clinic settings from database
 * Used for PDF generation and print pages
 */
export async function getClinicSettings(): Promise<ClinicSettings> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "clinicName",
            "clinicPhone",
            "clinicEmail",
            "clinicAddress",
            "clinicCity",
            "taxNumber",
            "taxOffice",
          ],
        },
      },
    });

    const settingsMap = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    return {
      clinicName: settingsMap.clinicName || "OPTIMUS VET",
      clinicPhone: settingsMap.clinicPhone,
      clinicEmail: settingsMap.clinicEmail,
      clinicAddress: settingsMap.clinicAddress,
      clinicCity: settingsMap.clinicCity,
      taxNumber: settingsMap.taxNumber,
      taxOffice: settingsMap.taxOffice,
    };
  } catch (error) {
    console.error("Error fetching clinic settings:", error);
    // Return default values if database fails
    return {
      clinicName: "OPTIMUS VET",
    };
  }
}

/**
 * Get clinic settings for client-side use
 * Fetches from API endpoint
 */
export async function getClinicSettingsClient(): Promise<ClinicSettings> {
  try {
    const response = await fetch("/api/settings");
    if (!response.ok) {
      throw new Error("Failed to fetch settings");
    }
    const data = await response.json();
    return {
      clinicName: data.clinicName || "OPTIMUS VET",
      clinicPhone: data.clinicPhone,
      clinicEmail: data.clinicEmail,
      clinicAddress: data.clinicAddress,
      clinicCity: data.clinicCity,
      taxNumber: data.taxNumber,
      taxOffice: data.taxOffice,
    };
  } catch (error) {
    console.error("Error fetching clinic settings:", error);
    return {
      clinicName: "OPTIMUS VET",
    };
  }
}
