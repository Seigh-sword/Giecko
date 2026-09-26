import AsyncStorage from '@react-native-async-storage/async-storage';

export type Account = { name: string; token: string; login: string };

export type SessionRecord = {
  runId: string;
  repo: string;
  stack: string;
  startedAt: string;
  term: string;
  code: string;
  desk: string;
};

export type MobileConfig = {
  accounts: Account[];
  activeAccount: string;
  lastRepo: string;
  sessions: SessionRecord[];
};

const KEY = 'giecko-mobile-config-v1';

export const emptyConfig: MobileConfig = {
  accounts: [],
  activeAccount: '',
  lastRepo: '',
  sessions: [],
};

export async function loadConfig(): Promise<MobileConfig> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...emptyConfig };
    const parsed = JSON.parse(raw) as Partial<MobileConfig>;
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      activeAccount: typeof parsed.activeAccount === 'string' ? parsed.activeAccount : '',
      lastRepo: typeof parsed.lastRepo === 'string' ? parsed.lastRepo : '',
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return { ...emptyConfig };
  }
}

export async function saveConfig(cfg: MobileConfig): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(cfg));
}

export function activeAccount(cfg: MobileConfig): Account | null {
  return cfg.accounts.find((a) => a.name === cfg.activeAccount) || null;
}

export function tokenFor(cfg: MobileConfig): string {
  const a = activeAccount(cfg);
  return a ? a.token : '';
}
