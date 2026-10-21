import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

const resources = {
  en: {
    translation: {
      login: "Log in",
      signup: "Sign up",
      forgot_password: "Forgot Password?",
      feed: "Feed",
      search: "Search",
      dating: "Dating",
      messages: "Messages",
      whats_on_your_mind: "What's on your mind?",
      follow: "Follow",
      unfollow: "Unfollow",
      settings: "Settings",
      language: "Language",
      logout: "Log out",
      loading: "Loading..."
    }
  },
  fr: {
    translation: {
      login: "Connexion",
      signup: "S'inscrire",
      forgot_password: "Mot de passe oublié?",
      feed: "Fil d'actualité",
      search: "Recherche",
      dating: "Rencontres",
      messages: "Messages",
      whats_on_your_mind: "À quoi pensez-vous?",
      follow: "Suivre",
      unfollow: "Ne plus suivre",
      settings: "Paramètres",
      language: "Langue",
      logout: "Déconnexion",
      loading: "Chargement..."
    }
  },
  tw: {
    translation: {
      login: "Bra mu",
      signup: "Kyerɛw wo din",
      forgot_password: "Wo werɛ afi password?",
      feed: "Nsɛm",
      search: "Hwehwɛ",
      dating: "Nnam",
      messages: "Nkrasɛm",
      whats_on_your_mind: "Dɛn na w'aredi ho?",
      follow: "Di akyi",
      unfollow: "Gyae akyidi",
      settings: "Nhyehyɛe",
      language: "Kasa",
      logout: "Fi mu",
      loading: "Ɛreload..."
    }
  },
  dg: {
    translation: {
      login: "Kpɛma",
      signup: "Zali yuli",
      forgot_password: "A tam password?",
      feed: "Laɣim",
      search: "Bɔhimbu",
      dating: "Yurugu",
      messages: "Yɛlima",
      whats_on_your_mind: "Bɔ n-nyɛ?",
      follow: "Dolim",
      unfollow: "Che ka dolimbu",
      settings: "Sabbu",
      language: "Zilinli",
      logout: "Yi",
      loading: "Di yɛn kpan..."
    }
  }
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: Localization.getLocales()[0].languageCode, // Default to phone's language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false 
    }
  });

// Function to change language and save preference
export const changeLanguage = async (lang) => {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem('@qarota_lang', lang);
};

// Load saved language on startup
export const loadSavedLanguage = async () => {
  try {
    const savedLang = await AsyncStorage.getItem('@qarota_lang');
    if (savedLang && ['en', 'fr', 'tw', 'dg'].includes(savedLang)) {
      await i18n.changeLanguage(savedLang);
    }
  } catch (e) {
    console.log('Failed to load language', e);
  }
};

export default i18n;