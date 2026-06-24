# Shelter — Frontend Mobile

Application mobile du jeu narratif **Shelter**, développée en React Native / Expo.  
Jeu de survie post-apocalyptique à choix binaires — chaque décision impacte les jauges du personnage.

→ **[Télécharger sur Google Play](https://play.google.com/store/apps/details?id=com.azulys.shelter)**  
→ **[Backend (Node.js / TypeScript)](https://github.com/cedricauneau-ship-it/ShelterV2-Backend)**

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | React Native (Expo SDK 54) |
| Langage | TypeScript |
| Navigation | React Navigation (stack + tabs) |
| State | Redux Toolkit + redux-persist |
| Auth | JWT + refresh token auto · Google Sign-In |
| Monétisation | AdMob (publicités récompensées) · Achat premium Google Play |
| Build | EAS Build · Google Play Console |

---

## Fonctionnalités

- **Jeu narratif** — Cartes à choix binaires, 5 jauges (faim, moral, santé, sécurité, nourriture)
- **Reprise de partie** — Sauvegarde côté serveur, reprise depuis n'importe quel appareil
- **Auth** — Connexion email/mot de passe ou Google Sign-In
- **Refresh token automatique** — `fetchWithAuth` gère le renouvellement transparent du token
- **Leaderboard** — Classement global en temps réel
- **Succès** — Système de récompenses débloquées côté serveur
- **Parrainage** — Codes uniques et suivi des filleuls
- **Premium** — Achat intégré Google Play, supprime les publicités
- **Publicités récompensées** — Bonus en partie via AdMob (désactivées pour les comptes premium)
- **Son & haptique** — Effets sonores via Expo AV, retours haptiques via Expo Haptics

---

## Structure

```
src/
├── screens/            # Écrans (Game, Home, Profile, Shop, Succès, Leaderboard…)
├── components/         # Composants réutilisables (AnimatedCard, Gauge, CustomSlider…)
├── store/              # Redux slices (user, game)
├── hooks/              # useFetchWithAuth (refresh token auto)
├── navigation/         # Configuration React Navigation
└── utils/              # Helpers, constantes
```

---

## Variables d'environnement

Créer un fichier `.env` à la racine :

```env
API_URL=https://your-backend-url.com
GOOGLE_CLIENT_ID=your_google_client_id
ADMOB_ANDROID_APP_ID=your_admob_id
```

---

## Lancer en local

```bash
# Installer les dépendances
yarn install

# Lancer avec Expo
npx expo start

# Sur Android
npx expo run:android

# Sur iOS
npx expo run:ios
```

> Nécessite un backend Shelter actif et configuré dans `.env`.

---

## Build & déploiement

```bash
# Build Android (Google Play)
eas build --platform android --profile production

# Soumettre sur le Play Store
eas submit --platform android
```

---

## Auteur

**Cédric Auneau** — [cedric-auneau.dev](https://www.cedric-auneau.dev) · [LinkedIn](https://www.linkedin.com/in/cedric-auneau)
