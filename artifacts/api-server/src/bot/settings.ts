import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const SETTINGS_FILE = path.join(DATA_DIR, "bot-settings.json");

export interface Channel {
  id: string;
  name: string;
}

export interface BotSettings {
  channels: Channel[];
  welcomeMessage: string;
}

const DEFAULT_SETTINGS: BotSettings = {
  channels: [],
  welcomeMessage:
    "✅ *Xush kelibsiz!*\n\n" +
    "Toshloq tuman 3-maktab — *TALIM PLATFORM*\n\n" +
    "Platformaga kirish uchun quyidagi tugmani bosing 👇",
};

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadSettings(): BotSettings {
  try {
    ensureDir();
    if (!fs.existsSync(SETTINGS_FILE)) {
      saveSettings(DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS, channels: [] };
    }
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<BotSettings>;
    return {
      channels: parsed.channels ?? [],
      welcomeMessage: parsed.welcomeMessage ?? DEFAULT_SETTINGS.welcomeMessage,
    };
  } catch {
    return { ...DEFAULT_SETTINGS, channels: [] };
  }
}

export function saveSettings(settings: BotSettings): void {
  ensureDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

export function addChannel(channel: Channel): boolean {
  const settings = loadSettings();
  if (settings.channels.find((c) => c.id === channel.id)) return false;
  settings.channels.push(channel);
  saveSettings(settings);
  return true;
}

export function removeChannel(channelId: string): void {
  const settings = loadSettings();
  settings.channels = settings.channels.filter((c) => c.id !== channelId);
  saveSettings(settings);
}

export function setWelcomeMessage(message: string): void {
  const settings = loadSettings();
  settings.welcomeMessage = message;
  saveSettings(settings);
}
