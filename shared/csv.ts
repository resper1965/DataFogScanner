export function quoteCsvField(value: unknown): string {
  const str = String(value ?? '');
  return '"' + str.replace(/"/g, '""') + '"';
}

