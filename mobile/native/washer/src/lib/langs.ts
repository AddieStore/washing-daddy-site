// The app languages, shared by the onboarding language step and the Profile language sheet.
import type { Lang } from './i18n';

export const LANGS: { code: Lang; label: string; sub: string }[] = [
  { code: 'hinglish', label: 'Hinglish', sub: 'Hindi, English letters mein' },
  { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
  { code: 'en', label: 'English', sub: 'English' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', sub: 'Punjabi' },
  { code: 'mr', label: 'मराठी', sub: 'Marathi' },
  { code: 'gu', label: 'ગુજરાતી', sub: 'Gujarati' },
  { code: 'bn', label: 'বাংলা', sub: 'Bengali' },
  { code: 'ta', label: 'தமிழ்', sub: 'Tamil' },
  { code: 'te', label: 'తెలుగు', sub: 'Telugu' },
];
export const langLabel = (c?: Lang) => (LANGS.find(l => l.code === c) || LANGS[0]).label;
