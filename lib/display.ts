export function commonPrefixParts(paths: string[]): string[] {
  const split = paths.map((p) => p.split('/').filter(Boolean)).filter((p) => p.length > 0);
  if (split.length < 2) return [];
  const ref = split.reduce((a, b) => (a.length <= b.length ? a : b));
  let i = 0;
  while (i < ref.length && split.every((parts) => parts[i] === ref[i])) i++;
  return ref.slice(0, i);
}

export function relativeDisplayPath(projectPath: string, prefixLen: number): string {
  const parts = projectPath.split('/').filter(Boolean);
  const unique = parts.slice(prefixLen);
  return unique.join('/') || parts[parts.length - 1] || projectPath;
}
