export const lightColors = {
  // ── Arka planlar ─────────────────────────────────────────
  background:     '#f5f5f0',   // ana ekran zemini (sıcak beyaz)
  surface:        '#ffffff',   // kart / modal yüzeyi
  surfaceAlt:     '#fafafa',   // alternatif satır zemini
  surfaceSubtle:  '#f0f0f0',   // bölüm ayıracı / ince arka plan

  // ── Marka renkleri ───────────────────────────────────────
  primary:        '#1a2e1a',   // koyu yeşil — header, buton, ana aksiyonlar
  primaryAccent:  '#0f6e56',   // teal yeşil — vurgu, başarı ögeleri

  // ── Yazı renkleri ─────────────────────────────────────────
  text:           '#1a1a1a',   // birincil metin
  textSecondary:  '#555555',   // ikincil / yardımcı metin
  textMuted:      '#888888',   // etiket, açıklama
  textFaint:      '#aaaaaa',   // üçüncül metin, tarih
  textOnPrimary:  '#ffffff',   // koyu yeşil zemin üstündeki metin
  placeholder:    '#bbbbbb',   // input placeholder

  // ── Kenarlıklar ──────────────────────────────────────────
  border:         '#e0e0e0',   // standart kenarlık
  borderLight:    '#dddddd',   // hafif kenarlık
  borderFaint:    '#eeeeee',   // çok hafif kenarlık / ayıraç

  // ── Durum renkleri — ön plan (yazı / ikon) ───────────────
  success:        '#2e7d32',   // aktif / geçerli (yeşil)
  warning:        '#e65100',   // yakında bitiyor (turuncu)
  error:          '#dc2626',   // süresi dolmuş / sil (kırmızı)

  // ── Durum renkleri — arka plan ───────────────────────────
  successSurface: '#e8f5e9',   // açık yeşil zemin
  warningSurface: '#fff3e0',   // açık turuncu zemin
  errorSurface:   '#ffebee',   // açık kırmızı zemin
  accentSurface:  '#e1f5ee',   // teal tonlu zemin

  // ── Header özel ──────────────────────────────────────────
  badge:          'rgba(255,255,255,0.12)',  // badge arka planı (dark header'da)
  badgeText:      '#9fe1cb',                 // badge yazısı (dark header'da)
  headerMuted:    'rgba(255,255,255,0.50)',  // soluk header yazısı
} as const;

export type ColorKey = keyof typeof lightColors;

export const darkColors: Record<ColorKey, string> = {
  background:     '#121212',
  surface:        '#1e1e1e',
  surfaceAlt:     '#242424',
  surfaceSubtle:  '#2a2a2a',
  primary:        '#0d1f0d',
  primaryAccent:  '#1d9e75',
  text:           '#e8e8e8',
  textSecondary:  '#b0b0b0',
  textMuted:      '#888888',
  textFaint:      '#6a6a6a',
  textOnPrimary:  '#e8e8e8',
  placeholder:    '#5a5a5a',
  border:         '#333333',
  borderLight:    '#3a3a3a',
  borderFaint:    '#2a2a2a',
  success:        '#4caf50',
  warning:        '#ff9800',
  error:          '#ef5350',
  successSurface: '#1b3a1f',
  warningSurface: '#3a2a14',
  errorSurface:   '#3a1f1f',
  accentSurface:  '#13322a',
  badge:          'rgba(255,255,255,0.10)',
  badgeText:      '#9fe1cb',
  headerMuted:    'rgba(255,255,255,0.50)',
};

// Geriye uyumluluk: mevcut statik importlar bozulmasın.
export const colors = lightColors;
