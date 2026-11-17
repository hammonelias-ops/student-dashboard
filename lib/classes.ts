// One color per class, used everywhere. Picked to be distinct and calm on a dark background.
export const CLASS_COLORS = [
  "#5b8def", // blue
  "#e8a33d", // amber
  "#4fb286", // green
  "#c774d6", // violet
  "#e0705c", // coral
  "#3fb6c6", // teal
  "#d4c04a", // olive yellow
  "#8b93a7", // slate
] as const;

// The next color no class is using yet (cycles once all are taken)
export function pickColor(used: (string | null)[]) {
  const free = CLASS_COLORS.find((c) => !used.includes(c));
  return free ?? CLASS_COLORS[used.length % CLASS_COLORS.length];
}

// "Chemistry" → "CHM", "English" → "ENG", "AP Biology" → "APB", "Math 2" → "MTH"
// First letter, then the next consonants. Adds a number if the code is taken ("CHM2").
export function shortCode(name: string, taken: (string | null)[] = []) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "");
  let code = letters.slice(0, 1);
  for (const ch of letters.slice(1)) {
    if (code.length === 3) break;
    if (!"AEIOU".includes(ch)) code += ch;
  }
  // Too few consonants ("Art" → "ART"): fill from the original letters
  if (code.length < 3) code = (code + letters.slice(1)).slice(0, 3);
  if (!code) code = "CLS";

  const takenSet = new Set(taken.filter(Boolean).map((c) => c!.toUpperCase()));
  if (!takenSet.has(code)) return code;
  for (let n = 2; ; n++) {
    if (!takenSet.has(`${code}${n}`)) return `${code}${n}`;
  }
}
