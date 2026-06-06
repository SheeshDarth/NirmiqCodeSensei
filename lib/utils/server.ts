/**
 * Server-only utilities for safe FormData extraction.
 *
 * DO NOT import this file from client components — it is intended for
 * Server Actions only. Its exports are pure functions with no Node.js
 * imports, but they semantically belong to the server layer.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Safely extract a string value from FormData.
 * Returns null if the field is missing, empty, or a File object.
 */
export function getString(
  formData: FormData,
  key: string
): string | null {
  const val = formData.get(key);
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Safely extract a UUID from FormData.
 * Returns null if the field is missing or not a valid UUID v4 format.
 * Prevents crafted IDs from reaching the database layer.
 */
export function getUUID(
  formData: FormData,
  key: string
): string | null {
  const val = getString(formData, key);
  if (!val) return null;
  return UUID_RE.test(val) ? val : null;
}
