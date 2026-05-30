export const colors = {
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

export type ColorKey = keyof typeof colors;
