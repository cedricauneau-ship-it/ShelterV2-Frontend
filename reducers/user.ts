import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Gauge = {
    hunger: number;
    security: number;
    health: number;
    moral: number;
    food: number;
};

export type Choice = {
  text: string;
  effect: {
    hunger: number;
    security: number;
    health: number;
    moral: number;
    food: number;
  };
  consequence?: string | null;
  trigger?: string | null;
  endTrigger?: string | null;
  nextCard?: string | null;
  nextPool?: string | null;
  triggerAchievement?: any | null;
};

export type Conditions = {
  requiredScenario: string[];
  forbiddenScenario: string[];
  minDays: number;
  maxDays: number;
  gauges: Record<string, { min: number; max: number }>;
};

export type Card = {
  id: string;
  key: string;
  pool: string;
  text: string;
  cooldown: number;
  incrementsDay: boolean;
  right: Choice;
  left: Choice;
  conditions: Conditions;
};


export type LevelProgress = {
    level: number;
    label: string;
    currentXp: number;
    xpForCurrentLevel: number;
    xpForNextLevel: number | null;
};

export type UserState= {
    value: {
        email: string | null;
        username: string | null;
        token: string | null;
        refreshToken: string | null;
        stateOfGauges: Gauge | null;
        numberDays: number | null;
        bestScore: number | null;
        currentCard: Card | null;
        btnSoundOn: boolean;
        soundOn: boolean;
        volume: number;
        hapticOn: boolean;
        totalGames: number;
        firstGame: boolean;
        isPremium: boolean;
        referralCode: string | null;
        xp: number;
        level: number;
        levelProgress: LevelProgress | null;
    }
}

const initialState: UserState = {
    value : {email: null, username: null, token: null, refreshToken: null, stateOfGauges: null, numberDays: null, bestScore: null, currentCard: null, btnSoundOn: true, soundOn: true, volume: 50, hapticOn: true, totalGames: 0, firstGame: true, isPremium: false, referralCode: null, xp: 0, level: 1, levelProgress: null},
};

export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        signin:(state, action: PayloadAction<{token:string; refreshToken:string; username: string; email: string}>) => {
            state.value.token = action.payload.token;
            state.value.refreshToken = action.payload.refreshToken;
            state.value.email = action.payload.email;
            state.value.username = action.payload.username;
        },
        updateTokens:(state, action: PayloadAction<{token:string; refreshToken:string;}>) => {
            state.value.token = action.payload.token;
            state.value.refreshToken = action.payload.refreshToken;
        },
        setGameState:(state, action: PayloadAction<{stateOfGauges: Gauge; numberDays: number; currentCard: Card}>) => {
            state.value.stateOfGauges = action.payload.stateOfGauges;
            state.value.numberDays = action.payload.numberDays;
            state.value.currentCard = action.payload.currentCard;
        },
        setGauges:(state, action: PayloadAction<Gauge>) =>{
            state.value.stateOfGauges = action.payload
        },
        setCurrentCard:(state, action: PayloadAction<Card>) =>{
            state.value.currentCard = action.payload
        },
        setCurrentNumberDays:(state, action: PayloadAction<number>) =>{
            state.value.numberDays = action.payload
        },
        setUserData:(state, action: PayloadAction<{bestScore: number; soundOn: boolean; volume: number; btnSoundOn: boolean; hapticOn: boolean; totalGames: number; isPremium?: boolean; referralCode?: string | null; currentGameId?: string | null; xp?: number; level?: number; levelProgress?: LevelProgress | null}>) =>{
            state.value.bestScore = action.payload.bestScore;
            state.value.soundOn = action.payload.soundOn;
            state.value.volume = action.payload.volume;
            state.value.btnSoundOn = action.payload.btnSoundOn;
            state.value.hapticOn = action.payload.hapticOn ?? true;
            state.value.totalGames = action.payload.totalGames ?? 0;
            state.value.isPremium = action.payload.isPremium ?? false;
            state.value.referralCode = action.payload.referralCode ?? null;
            state.value.xp = action.payload.xp ?? 0;
            state.value.level = action.payload.level ?? 1;
            state.value.levelProgress = action.payload.levelProgress ?? null;
        },
        updateBestScore: (state, action: PayloadAction<number>) =>{
            state.value.bestScore = action.payload
        },
        signout:(state) => {
            state.value = initialState.value;
        },
        updateSettings: (state, action: PayloadAction<Partial<{soundOn: boolean; btnSoundOn: boolean; volume: number; hapticOn: boolean}>>) => {
            if (action.payload.soundOn !== undefined) {
                state.value.soundOn = action.payload.soundOn;
            }
            if (action.payload.btnSoundOn !== undefined) {
                state.value.btnSoundOn = action.payload.btnSoundOn;
            }
            if (action.payload.volume !== undefined) {
                state.value.volume = action.payload.volume;
            }
            if (action.payload.hapticOn !== undefined) {
                state.value.hapticOn = action.payload.hapticOn;
            }
        },
        setFirstGame : (state, action: PayloadAction<boolean>) =>{
            state.value.firstGame = action.payload
        },
        setPremium : (state, action: PayloadAction<boolean>) =>{
            state.value.isPremium = action.payload
        },
        setReferralCode : (state, action: PayloadAction<string>) =>{
            state.value.referralCode = action.payload
        },
        setLevelProgress : (state, action: PayloadAction<{xp: number; level: number; levelProgress: LevelProgress}>) =>{
            state.value.xp = action.payload.xp;
            state.value.level = action.payload.level;
            state.value.levelProgress = action.payload.levelProgress;
        }
    }
});

export const { signin, setGameState, setGauges, setCurrentCard, setCurrentNumberDays, setUserData, signout, updateBestScore, updateSettings, updateTokens, setFirstGame, setPremium, setReferralCode, setLevelProgress } = userSlice.actions;
export default userSlice.reducer;