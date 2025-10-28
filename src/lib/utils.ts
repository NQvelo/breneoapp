import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert numeric user ID to UUID format for Supabase compatibility
// Creates a deterministic UUID v4-compatible format
export function numericIdToUuid(numericId: string | number): string {
  const id = String(numericId);
  const numId = parseInt(id, 10);

  // Convert to hex (8 characters max for reasonable IDs)
  const hex = numId.toString(16).padStart(8, "0").toLowerCase();

  // Create a deterministic UUID v4 format by splitting the hex:
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where 4 is version and y is variant (8, 9, a, or b)

  // Build the UUID from the hex string
  const part1 = hex.slice(0, 8);
  const part2 = hex.slice(0, 4); // Repeat first part
  const part3 = "4" + hex.slice(1, 4); // Version 4
  const part4 = "8" + hex.slice(2, 5); // Variant 8
  const part5 = hex + hex + hex + hex; // Extend to 12 chars

  return `${part1}-${part2}-${part3}-${part4}-${part5.slice(0, 12)}`;
}
