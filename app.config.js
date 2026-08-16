const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getPackage = () => {
  if (IS_DEV) return 'com.batusonmez.gayrimenkpro.dev';
  if (IS_PREVIEW) return 'com.batusonmez.gayrimenkpro.preview';
  return 'com.batusonmez.gayrimenkpro';
};

const getName = () => {
  if (IS_DEV) return 'Gayrimenk Pro (Dev)';
  if (IS_PREVIEW) return 'Gayrimenk Pro (Preview)';
  return 'Gayrimenk Pro';
};

export default {
  expo: {
    name: getName(),
    slug: 'gayrimenk-pro',
    version: '7.5.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1a2e1a',
    },
    ios: {
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription: 'Kimlik belgesi ve ödeme dekontu fotoğraflarını sözleşmeye eklemek için fotoğraf arşivinize erişim gerekir. Seçtiğiniz fotoğraflar yalnızca ilgili sözleşme kaydına yüklenir.',
        NSCameraUsageDescription: 'Kimlik belgesi ve ödeme dekontu fotoğrafı çekmek için kameraya erişim gerekir. Çektiğiniz fotoğraflar yalnızca ilgili sözleşme kaydına yüklenir.',
      },
      supportsTablet: false,
      buildNumber: '3',
      bundleIdentifier: getPackage(),
    },
    android: {
      versionCode: 17,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: getPackage(),
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-router', 'expo-secure-store'],
    extra: {
      router: {},
      eas: {
        projectId: '765e960c-ab88-438d-9906-4fdbb9fce8fa',
      },
    },
  },
};
