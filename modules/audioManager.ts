import { Audio } from 'expo-av';

type SoundKey = 'background' | 'scroll' | 'validate' | 'click' | 'backgroundGame';

const soundFiles: Record<SoundKey, any> = {
  background: require('../assets/sounds/background.mp3'),
  scroll: require('../assets/sounds/scroll.mp3'),
  validate: require('../assets/sounds/validate.mp3'),
  click: require('../assets/sounds/click.mp3'),
  backgroundGame: require('../assets/sounds/backgroundGame.mp3'),
};

type EffectKey = Exclude<SoundKey, 'background' | 'backgroundGame'>;

class AudioManager {
  private static sounds: Partial<Record<SoundKey, Audio.Sound>> = {};
  private static effectPool: Partial<Record<EffectKey, Audio.Sound[]>> = {};
  private static musicMuted = false;
  private static effectsMuted = false;
  private static volume = 0.2;
  private static fadeDuration = 1000;

  static init(settings: { volume: number; soundOn: boolean; btnSoundOn: boolean }) {
    this.volume = settings.volume / 100;
    this.musicMuted = !settings.soundOn;
    this.effectsMuted = !settings.btnSoundOn;

    const bg = this.sounds.background;
    const bgGame = this.sounds.backgroundGame;
    if (bg) bg.setVolumeAsync(this.musicMuted ? 0 : this.volume);
    if (bgGame) bgGame.setVolumeAsync(this.musicMuted ? 0 : this.volume);
  }

  static async preloadAll() {
    // Musiques de fond
    for (const key of ['background', 'backgroundGame'] as SoundKey[]) {
      if (!this.sounds[key]) {
        const sound = new Audio.Sound();
        await sound.loadAsync(soundFiles[key]);
        await sound.setIsLoopingAsync(true);
        await sound.setVolumeAsync(0);
        this.sounds[key] = sound;
      }
    }

    // Pool d'effets sonores pré-chargés (2 instances par effet pour overlap)
    for (const key of ['scroll', 'validate', 'click'] as EffectKey[]) {
      if (!this.effectPool[key]) {
        this.effectPool[key] = [];
        for (let i = 0; i < 2; i++) {
          const sound = new Audio.Sound();
          await sound.loadAsync(soundFiles[key]);
          this.effectPool[key]!.push(sound);
        }
      }
    }
  }

  private static async fadeSound(sound: Audio.Sound, from: number, to: number, duration: number) {
    const steps = 10;
    const stepTime = duration / steps;
    const stepVolume = (to - from) / steps;

    for (let i = 0; i <= steps; i++) {
      await sound.setVolumeAsync(from + stepVolume * i);
      await new Promise((r) => setTimeout(r, stepTime));
    }
  }

  static async playBackground() {
    if (this.musicMuted) return;
    await this.crossFade('backgroundGame', 'background');
  }

  static async pauseBackground() {
    const sound = this.sounds.background;
    if (sound) {
      await this.fadeSound(sound, this.volume, 0, this.fadeDuration);
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) await sound.pauseAsync();
    }
  }

  static async playBackgroundGame() {
    if (this.musicMuted) return;
    await this.crossFade('background', 'backgroundGame');
  }

  static async pauseBackgroundGame() {
    const sound = this.sounds.backgroundGame;
    if (sound) {
      await this.fadeSound(sound, this.volume, 0, this.fadeDuration);
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) await sound.pauseAsync();
    }
  }

  private static async crossFade(fromKey: SoundKey, toKey: SoundKey) {
    const fromSound = this.sounds[fromKey];
    const toSound = this.sounds[toKey];

    if (fromSound) {
      const status = await fromSound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await this.fadeSound(fromSound, this.volume, 0, this.fadeDuration);
        await fromSound.pauseAsync();
      }
    }

    if (toSound) {
      const status = await toSound.getStatusAsync();
      if (!status.isLoaded || !status.isPlaying) {
        await toSound.setPositionAsync(0);
        await toSound.playAsync();
      }
      await this.fadeSound(toSound, 0, this.volume, this.fadeDuration);
    }
  }

  // Effets sonores — réutilise les instances pré-chargées
  static async playEffect(type: EffectKey) {
    if (this.effectsMuted) return;
    const pool = this.effectPool[type];
    if (!pool || pool.length === 0) return;

    // Cherche une instance libre (pas en cours de lecture)
    for (const sound of pool) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await sound.setPositionAsync(0);
          await sound.setVolumeAsync(this.volume);
          await sound.playAsync();
          return;
        }
      } catch {}
    }

    // Toutes les instances sont occupées → force la première
    try {
      const sound = pool[0];
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(this.volume);
      await sound.playAsync();
    } catch (e) {
      if (__DEV__) console.error(`Erreur lecture du son ${type}:`, e);
    }
  }

  static async setMusicMuted(muted: boolean) {
    this.musicMuted = muted;
    if (muted) {
      await this.pauseBackground();
      await this.pauseBackgroundGame();
    } else {
      await this.playBackground();
    }
  }

  static setEffectsMuted(muted: boolean) {
    this.effectsMuted = muted;
  }

  static async setMusicVolume(value: number) {
    this.volume = value / 100;
    const bg = this.sounds.background;
    const bgGame = this.sounds.backgroundGame;
    if (bg) await bg.setVolumeAsync(this.volume);
    if (bgGame) await bgGame.setVolumeAsync(this.volume);
  }

  static async unloadAll() {
    for (const key in this.sounds) {
      await this.sounds[key as SoundKey]?.unloadAsync();
    }
    for (const key in this.effectPool) {
      for (const sound of this.effectPool[key as EffectKey]!) {
        await sound.unloadAsync();
      }
    }
    this.sounds = {};
    this.effectPool = {};
  }
}

export default AudioManager;
