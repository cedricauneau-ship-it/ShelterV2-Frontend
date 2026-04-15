let InterstitialAd: any = null;
let AdEventType: any = null;
let TestIds: any = null;
let mobileAds: any = null;
let adAvailable = false;

// Chargement conditionnel — si le module natif est absent, tout est désactivé silencieusement
try {
  const admob = require('react-native-google-mobile-ads');
  InterstitialAd = admob.InterstitialAd;
  AdEventType = admob.AdEventType;
  TestIds = admob.TestIds;
  mobileAds = admob.default ?? admob; // mobileAds est le default export
  adAvailable = true;
} catch (e) {
  console.warn('[AdManager] react-native-google-mobile-ads non disponible :', e);
}

const AD_UNIT_ID = __DEV__
  ? (TestIds?.INTERSTITIAL ?? '')
  : 'ca-app-pub-8874754604524879/4556272429';

class AdManager {
  private static ad: any = null;
  private static loaded = false;
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (!adAvailable || this.initialized) return;
    try {
      await mobileAds().initialize();
      this.initialized = true;
      this.createAndLoad();
    } catch (e) {
      console.warn('[AdManager] Échec initialisation :', e);
    }
  }

  private static createAndLoad(): void {
    if (!adAvailable || !this.initialized) return;
    try {
      this.ad = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      this.ad.addAdEventListener(AdEventType.LOADED, () => {
        this.loaded = true;
      });

      this.ad.addAdEventListener(AdEventType.CLOSED, () => {
        this.loaded = false;
        this.createAndLoad(); // recharge pour la prochaine fois
      });

      this.ad.addAdEventListener(AdEventType.ERROR, () => {
        this.loaded = false;
      });

      this.ad.load();
    } catch (e) {
      console.warn('[AdManager] Échec création pub :', e);
    }
  }

  static isLoaded(): boolean {
    return this.loaded;
  }

  static show(onClosed: () => void): void {
    if (!adAvailable || !this.initialized || !this.loaded || !this.ad) {
      onClosed(); // pas de pub dispo, on continue directement
      return;
    }
    try {
      this.ad.addAdEventListener(AdEventType.CLOSED, () => {
        onClosed();
      });
      this.ad.show();
    } catch (e) {
      console.warn('[AdManager] Échec affichage pub :', e);
      onClosed();
    }
  }

  static shouldShow(totalGames: number): boolean {
    return totalGames >= 2 && totalGames % 2 === 0;
  }
}

export default AdManager;
