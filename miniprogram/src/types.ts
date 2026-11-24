export type InterestCode = 'zodiac' | 'almanac' | 'music' | 'film' | 'quote' | 'note' | 'history' | 'weather';
export type ThemeId = 'cream' | 'ink' | 'night' | 'mint';
export interface Preferences { themeId: ThemeId; zodiacSign: string; selectedInterests: InterestCode[] }
export interface UserEvent {
  id: string;
  date: string;
  title: string;
  content: string;
  kind: 'note' | 'todo';
  completed: boolean;
}
export interface DailyContent {
  code: InterestCode;
  title: string;
  payload: { text: string };
  isDemo: boolean;
  sourceName: string;
  availability: 'available' | 'demo' | 'coming-soon' | 'unconfigured';
}
