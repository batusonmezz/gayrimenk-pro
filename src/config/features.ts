export const USE_CLOUD_STORAGE = true;

// AI ile madde duzenleme (PreviewScreen sohbet kutusu). KAPALI.
// Neden: (1) anthropic-proxy stub durumda, cagri gecersiz JSON donuyor ve
// maddeleriDuzenle catch dalinda orijinal diziyi koruyor — ozellik calismiyor
// ama ekran "guncellendi" diyor. (2) Calisir hale gelse bile model TUM madde
// dizisini yeniden yaziyor; kullanicinin dokunmadigi bir maddeyi sessizce
// degistirebilir ve bu imzalanacak belgeye girer.
// Acmadan once SART: model yalnizca degisen maddeleri dondursun ya da
// uygulanmadan once diff gosterilsin.
export const AI_MADDE_DUZENLEME = false;
