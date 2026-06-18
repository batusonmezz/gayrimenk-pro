export function roleLabel(role: string | null): string {
  if (role === 'mal_sahibi') return 'Gayrimenkul Sahibi';
  if (role === 'kiraci')     return 'Kiracı';
  return 'Gayrimenkul Yöneticisi';
}
