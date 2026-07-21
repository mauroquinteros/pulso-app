/**
 * Derives what a Perfil shows. Initials are computed at display time and never
 * stored, so `Profile` holds a name and nothing spelled out of it.
 */

/** First letter of the first two words, uppercased. */
export function initialsFrom(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}
