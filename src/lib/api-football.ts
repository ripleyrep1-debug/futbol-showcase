const API_KEY = "1c9e1f18dac735375293eeadbe80e81c";
const BASE_URL = "https://v3.football.api-sports.io";

const headers = {
  "x-apisports-key": API_KEY,
};

export interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string | null;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

export interface ApiOddsValue {
  value: string;
  odd: string;
}

export interface ApiOddsBet {
  id: number;
  name: string;
  values: ApiOddsValue[];
}

export interface ApiOddsBookmaker {
  id: number;
  name: string;
  bets: ApiOddsBet[];
}

export interface ApiOddsResponse {
  fixture: { id: number };
  bookmakers: ApiOddsBookmaker[];
}

// Rate-limit safe sequential fetcher with delay
async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiFetch<T>(endpoint: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { headers });
  const data = await res.json();

  if (data.errors && Object.keys(data.errors).length > 0) {
    const errMsg = typeof data.errors === "object"
      ? Object.values(data.errors).join(", ")
      : String(data.errors);
    throw new Error(errMsg);
  }

  return data.response as T[];
}

// Sequential fetch with delay between requests to avoid rate limits
async function apiFetchSequential<T>(
  endpoint: string,
  paramsList: Record<string, string>[],
  delayMs = 1200
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < paramsList.length; i++) {
    if (i > 0) await delay(delayMs);
    try {
      const data = await apiFetch<T>(endpoint, paramsList[i]);
      results.push(...data);
    } catch {
      // Skip failed requests silently
    }
  }
  return results;
}

export async function fetchTodaysFixtures(): Promise<ApiFixture[]> {
  // Fetch fixtures for today + next 6 days (7 days total)
  // Use sequential fetching with delays to avoid rate limits
  const paramsList: Record<string, string>[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    paramsList.push({
      date: d.toISOString().split("T")[0],
      timezone: "Europe/Istanbul",
    });
  }

  return apiFetchSequential<ApiFixture>("fixtures", paramsList, 1200);
}

export async function fetchOddsByDate(): Promise<ApiOddsResponse[]> {
  // Fetch odds for today + next 2 days
  const paramsList: Record<string, string>[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    paramsList.push({
      date: d.toISOString().split("T")[0],
      timezone: "Europe/Istanbul",
      bookmaker: "8",
    });
  }

  return apiFetchSequential<ApiOddsResponse>("odds", paramsList, 1200);
}

export async function fetchOddsByFixture(fixtureId: number): Promise<ApiOddsResponse[]> {
  return apiFetch<ApiOddsResponse>("odds", {
    fixture: String(fixtureId),
    bookmaker: "8",
  });
}

// Bet type ID to Turkish name mapping
export const BET_TYPE_NAMES: Record<number, string> = {
  1: "Maç Sonucu (1X2)",
  2: "Ev / Deplasman",
  3: "Asya Handikap",
  4: "Alt/Üst Gol",
  5: "Alt/Üst Gol",
  6: "İlk Yarı Alt/Üst Gol",
  7: "Asya Handikap İlk Yarı",
  8: "Karşılıklı Gol (KG)",
  9: "Doğru Skor",
  10: "İlk Yarı / Maç Sonucu (İY-MS)",
  11: "Tek/Çift Gol",
  12: "Çifte Şans",
  13: "İlk Yarı Sonucu",
  14: "Asya Korner",
  15: "Korner Alt/Üst",
  16: "Korner Handikap",
  17: "Takım Gol Alt/Üst",
  18: "Temiz Kale (Clean Sheet)",
  19: "Kazanan Yarı",
  20: "Skor Aralığı",
  21: "Toplam Kart Alt/Üst",
  22: "Handikaplı Maç Sonucu",
  23: "Gol Atılacak Yarı",
  24: "İlk Golü Atan Takım",
  25: "Son Golü Atan Takım",
  26: "Toplam Gol (Tam Sayı)",
  27: "Her İki Yarı Gol",
  28: "Tek/Çift Gol (Ev Sahibi)",
  29: "Tek/Çift Gol (Deplasman)",
  30: "Handikap İlk Yarı Sonucu",
  31: "Çifte Şans İlk Yarı",
  32: "KG / Alt-Üst",
  33: "Korner MS",
  34: "Kart Handikap",
  35: "Kart Alt/Üst (Ev Sahibi)",
  36: "Kart Alt/Üst (Deplasman)",
  37: "Gol Dakika Aralığı",
  38: "İlk Yarı KG",
  39: "Kırmızı Kart Olur mu",
  40: "Penaltı Olur mu",
  41: "Korner (Ev Sahibi Alt/Üst)",
  42: "Korner (Deplasman Alt/Üst)",
  43: "İlk Yarı Korner Alt/Üst",
  44: "Kim Daha Çok Korner Kullanır",
  45: "Toplam Korner",
  46: "Toplam Kart",
  47: "Kim Daha Fazla Kart Görür",
  48: "Ev Gol Alt/Üst",
  49: "Deplasman Gol Alt/Üst",
  50: "Maç Skoru Aralığı",
  51: "Ev Sahibi Gol Yemeden Kazanır",
  52: "Deplasman Gol Yemeden Kazanır",
};

// Value translations
export const VALUE_TRANSLATIONS: Record<string, string> = {
  "Home": "Ev",
  "Draw": "Beraberlik",
  "Away": "Dep",
  "Over": "Üst",
  "Under": "Alt",
  "Yes": "Var",
  "No": "Yok",
  "Odd": "Tek",
  "Even": "Çift",
  "Home/Draw": "1X",
  "Draw/Away": "X2",
  "Home/Away": "12",
  "1st Half": "İlk Yarı",
  "2nd Half": "İkinci Yarı",
  "Equal": "Eşit",
  "No Goal": "Gol Yok",
  "1:0": "1-0",
  "2:0": "2-0",
  "2:1": "2-1",
  "3:0": "3-0",
  "3:1": "3-1",
  "3:2": "3-2",
  "0:0": "0-0",
  "1:1": "1-1",
  "2:2": "2-2",
  "0:1": "0-1",
  "0:2": "0-2",
  "1:2": "1-2",
  "0:3": "0-3",
  "1:3": "1-3",
  "2:3": "2-3",
};

// Bet categories for grouping
export const BET_CATEGORIES: Record<string, { label: string; betIds: number[] }> = {
  main: { label: "⚽ Ana Bahisler", betIds: [1, 12, 5, 8, 22, 11] },
  halfTime: { label: "⏱️ İlk Yarı Bahisleri", betIds: [13, 6, 7, 10, 31, 38, 30] },
  goals: { label: "🥅 Gol Bahisleri", betIds: [9, 20, 24, 25, 26, 17, 48, 49, 23, 27, 37, 50, 51, 52, 28, 29] },
  corners: { label: "🚩 Korner Bahisleri", betIds: [15, 14, 16, 33, 41, 42, 43, 44, 45] },
  cards: { label: "🟨 Kart Bahisleri", betIds: [21, 34, 35, 36, 39, 46, 47] },
  special: { label: "🎯 Özel Bahisler", betIds: [2, 3, 4, 18, 19, 32, 40] },
};

// Primary bet IDs shown by default (before expanding)
export const PRIMARY_BET_IDS = [1, 5, 12];

export function translateValue(value: string): string {
  return VALUE_TRANSLATIONS[value] || value;
}

export function getBetTypeName(betId: number, originalName: string): string {
  return BET_TYPE_NAMES[betId] || originalName;
}

export const POPULAR_LEAGUES = [
  203, 39, 140, 135, 78, 61, 2, 3, 848,
];
