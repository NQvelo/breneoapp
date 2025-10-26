import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert numeric user ID to UUID format for Supabase compatibility
export function numericIdToUuid(numericId: string | number): string {
  const id = String(numericId);
  // Create a deterministic UUID from numeric ID
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const hex = id.padStart(8, "0");
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(
    1,
    4
  )}-8${hex.slice(2, 5)}-${hex.slice(0, 12)}`;
}
