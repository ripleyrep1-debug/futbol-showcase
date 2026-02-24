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

export async function fetchTodaysFixtures(): Promise<ApiFixture[]> {
  const today = new Date().toISOString().split("T")[0];
  return apiFetch<ApiFixture>("fixtures", {
    date: today,
    timezone: "Europe/Istanbul",
  });
}

export async function fetchOddsByDate(): Promise<ApiOddsResponse[]> {
  const today = new Date().toISOString().split("T")[0];
  return apiFetch<ApiOddsResponse>("odds", {
    date: today,
    timezone: "Europe/Istanbul",
    bookmaker: "8", // Bet365
  });
}

export async function fetchOddsByFixture(fixtureId: number): Promise<ApiOddsResponse[]> {
  return apiFetch<ApiOddsResponse>("odds", {
    fixture: String(fixtureId),
    bookmaker: "8",
  });
}

// Popular league IDs to prioritize
export const POPULAR_LEAGUES = [
  203, // Süper Lig
  39,  // Premier League
  140, // La Liga
  135, // Serie A
  78,  // Bundesliga
  61,  // Ligue 1
  2,   // Champions League
  3,   // Europa League
  848, // Conference League
];
