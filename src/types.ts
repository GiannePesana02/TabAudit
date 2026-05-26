export interface Tab {
  id: number;
  title: string;
  url: string;
  index: number;
  favIconUrl?: string;
  groupId?: string; // used in mock mode & mapped from tabs
  active?: boolean;
}

export interface Group {
  id: string; // uuid or chrome group id
  name: string;
  color: string; // colors: blue, green, red, yellow, purple, pink, cyan
  tabIds: number[];
}

export interface FrozenSession {
  id: string;
  name: string;
  frozenAt: number;
  tabs: {
    id: number;
    url: string;
    title: string;
    favIconUrl?: string;
  }[];
}

export interface SuggestedGroup {
  name: string;
  color: string;
  tabIds: number[];
  reason: string;
}

export interface FreezeSuggestion {
  groupName: string;
  tabIds: number[];
  reason: string;
}

export interface GeminiSuggestions {
  suggestedGroups: SuggestedGroup[];
  freezeSuggestions: FreezeSuggestion[];
  ungroupedTabIds: number[];
  generatedAt?: number;
}

export interface Settings {
  geminiApiKey: string;
  aggressiveMemoryMode: boolean;
  analysisOnOpen: boolean;
}
