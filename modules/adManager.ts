let InterstitialAd: any = null;
let AdEventType: any = null;
let TestIds: any = null;
let mobileAds: any = null;
let adAvailable = false;

try {
  const admob = require('react-native-google-mobile-ads');
  InterstitialAd = admob.InterstitialAd;
  AdEventType = admob.AdEventType;
  TestIds = admob.TestIds;
  mobileAds = admob.default ?? admob;
  adAvailable = true;
} catch (e) {
  if (__DEV__) console.warn('[AdManager] react-native-google-mobile-ads non disponible :', e);
}

const PROD_AD_UNIT_ID = 'ca-app-pub-8874754604524879/4556272429';

// ⚠️ PUBS DÉSACTIVÉES PENDANT LA BETA — passer à true pour la prod
const ADS_ENABLED = false;

class AdManager {
  private static ad: any = null;
  private static loaded = false;
  private static initialized = false;
  private static gamesStarted = 0;
  private static premium = false; // si true, aucune pub ne s'affiche

  static setPremium(value: boolean): void {
    this.premium = value;
  }

  private static getAdUnitId(): string {
    // TestIds est disponible seulement après le require()
    if (__DEV__ && TestIds?.INTERSTITIAL) return TestIds.INTERSTITIAL;
    return PROD_AD_UNIT_ID;
  }

  static async initialize(): Promise<void> {
    if (!ADS_ENABLED || !adAvailable || this.initialized) return;
    try {
      await mobileAds().initialize();
      this.initialized = true;
      this.createAndLoad();
    } catch (e) {
      if (__DEV__) console.warn('[AdManager] Échec initialisation :', e);
    }
  }

  private static createAndLoad(): void {
    if (!adAvailable || !this.initialized) return;
    try {
      this.ad = InterstitialAd.createForAdRequest(this.getAdUnitId(), {
        requestNonPersonalizedAdsOnly: true,
      });

      this.ad.addAdEventListener(AdEventType.LOADED, () => {
        this.loaded = true;
      });

      this.ad.addAdEventListener(AdEventType.CLOSED, () => {
        this.loaded = false;
        this.createAndLoad();
      });

      this.ad.addAdEventListener(AdEventType.ERROR, () => {
        this.loaded = false;
      });

      this.ad.load();
    } catch (e) {
      if (__DEV__) console.warn('[AdManager] Échec création pub :', e);
    }
  }

  static isLoaded(): boolean {
    return this.loaded;
  }

  // Pub à la 3ème partie, 6ème, 9ème... (toutes les 3 parties à partir de la 3ème)
  // Aucune pub si l'utilisateur est premium
  static shouldShow(): boolean {
    if (!ADS_ENABLED || this.premium) return false;
    this.gamesStarted++;
    return this.gamesStarted >= 3 && this.gamesStarted % 3 === 0;
  }

  static show(onClosed: () => void): void {
    if (!adAvailable || !this.initialized || !this.loaded || !this.ad) {
      onClosed();
      return;
    }
    try {
      this.ad.addAdEventListener(AdEventType.CLOSED, () => {
        onClosed();
      });
      this.ad.show();
    } catch (e) {
      if (__DEV__) console.warn('[AdManager] Échec affichage pub :', e);
      onClosed();
    }
  }
}

export default AdManager;
