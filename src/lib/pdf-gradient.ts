export function parseLinearGradient(value: string) {
  if (!value.startsWith('linear-gradient(') || !value.endsWith(')')) return null;
  const parts: string[] = [];
  let depth = 0; let start = 16;
  for (let index = 16; index < value.length - 1; index++) {
    if (value[index] === '(') depth++;
    if (value[index] === ')') depth--;
    if (value[index] === ',' && depth === 0) { parts.push(value.slice(start, index).trim()); start = index + 1; }
  }
  parts.push(value.slice(start, -1).trim());
  const direction = parts[0].match(/^([\d.-]+)deg$/);
  const angle = direction ? Number(parts.shift()!.slice(0, -3)) : 180;
  const stops = parts.flatMap((part, index) => {
    const match = part.match(/^(rgba?\([^)]*\)|color\([^)]*\)|#[\da-f]+|transparent)(?:\s+([\d.]+)%)?(?:\s+([\d.]+)%)?$/i);
    if (!match) return [];
    const color = match[1].replace(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/g, (_match, r, g, b, a) => `rgba(${Math.round(Number(r) * 255)},${Math.round(Number(g) * 255)},${Math.round(Number(b) * 255)},${a || 1})`);
    const position = match[2] ? Number(match[2]) / 100 : index / Math.max(1, parts.length - 1);
    return [{ color, position }, ...(match[3] ? [{ color, position: Number(match[3]) / 100 }] : [])];
  });
  return Number.isFinite(angle) && stops.length >= 2 && stops.every((stop) => stop.position >= 0 && stop.position <= 1) ? { angle, stops } : null;
}
