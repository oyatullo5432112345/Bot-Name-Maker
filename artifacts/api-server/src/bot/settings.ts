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

export interface PhoneMapping {
  phone: string;
  chatId: number;
}

export interface VideoUrls {
  student: string;
  teacher: string;
  staff: string;
}

export interface RoleVideoUrls {
  student?: string;
  teacher?: string;
  sinfRahbari?: string;
}

export interface RoleRegCodes {
  teacher?: string;
  sinfRahbari?: string;
  director?: string;
  zavuch?: string;
  zamDirector?: string;
}

export interface BotSettings {
  channels: Channel[];
  welcomeMessage: string;
  phoneMappings: PhoneMapping[];
  onboardingVideoFileId?: string;
  videoUrls: VideoUrls;
  roleVideoUrls: RoleVideoUrls;
  staffRegCode?: string;
  roleRegCodes: RoleRegCodes;
}

const DEFAULT_SETTINGS: BotSettings = {
  channels: [],
  welcomeMessage:
    "✅ *Xush kelibsiz!*\n\n" +
    "Toshloq tuman 3-maktab — *TALIM PLATFORM*\n\n" +
    "Platformaga kirish uchun quyidagi tugmani bosing 👇",
  phoneMappings: [],
  onboardingVideoFileId: undefined,
  videoUrls: { student: "", teacher: "", staff: "" },
  roleVideoUrls: {},
  staffRegCode: undefined,
  roleRegCodes: {},
};

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadSettings(): BotSettings {
  try {
    ensureDir();
    if (!fs.existsSync(SETTINGS_FILE)) {
      saveSettings(DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS, channels: [], phoneMappings: [] };
    }
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<BotSettings>;
    return {
      channels: parsed.channels ?? [],
      welcomeMessage: parsed.welcomeMessage ?? DEFAULT_SETTINGS.welcomeMessage,
      phoneMappings: parsed.phoneMappings ?? [],
      onboardingVideoFileId: parsed.onboardingVideoFileId,
      videoUrls: parsed.videoUrls ?? { student: "", teacher: "", staff: "" },
      roleVideoUrls: parsed.roleVideoUrls ?? {},
      staffRegCode: parsed.staffRegCode,
      roleRegCodes: parsed.roleRegCodes ?? {},
    };
  } catch {
    return { ...DEFAULT_SETTINGS, channels: [], phoneMappings: [] };
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

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length === 12) return `+${digits}`;
  if (digits.length === 9) return `+998${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+998${digits.slice(1)}`;
  return `+${digits}`;
}

export function linkPhoneToChatId(phone: string, chatId: number): void {
  const settings = loadSettings();
  const normalized = normalizePhone(phone);
  const existing = settings.phoneMappings.findIndex((m) => m.phone === normalized);
  if (existing >= 0) {
    settings.phoneMappings[existing]!.chatId = chatId;
  } else {
    settings.phoneMappings.push({ phone: normalized, chatId });
  }
  saveSettings(settings);
}

export function getChatIdByPhone(phone: string): number | null {
  const normalized = normalizePhone(phone);
  const settings = loadSettings();
  return settings.phoneMappings.find((m) => m.phone === normalized)?.chatId ?? null;
}

export function getPhoneByChatId(chatId: number): string | null {
  const settings = loadSettings();
  return settings.phoneMappings.find((m) => m.chatId === chatId)?.phone ?? null;
}

export function setOnboardingVideo(fileId: string): void {
  const settings = loadSettings();
  settings.onboardingVideoFileId = fileId;
  saveSettings(settings);
}

export function setStaffRegCode(code: string): void {
  const settings = loadSettings();
  settings.staffRegCode = code.trim() || undefined;
  saveSettings(settings);
}

export function getStaffRegCode(): string | undefined {
  return loadSettings().staffRegCode;
}

export function setVideoUrls(urls: VideoUrls): void {
  const settings = loadSettings();
  settings.videoUrls = urls;
  saveSettings(settings);
}

export function getRoleVideoUrls(): RoleVideoUrls {
  return loadSettings().roleVideoUrls;
}

export function setRoleVideoUrls(urls: RoleVideoUrls): void {
  const settings = loadSettings();
  settings.roleVideoUrls = urls;
  saveSettings(settings);
}

export function getRoleRegCodes(): RoleRegCodes {
  return loadSettings().roleRegCodes;
}

export function setRoleRegCode(
  role: keyof RoleRegCodes,
  code: string
): void {
  const settings = loadSettings();
  if (!settings.roleRegCodes) settings.roleRegCodes = {};
  if (code.trim()) {
    settings.roleRegCodes[role] = code.trim();
  } else {
    delete settings.roleRegCodes[role];
  }
  saveSettings(settings);
}

export function findRoleByCode(code: string): {
  role: "teacher" | "sinf_rahbari" | "director" | "zavuch" | "zam_direktor";
  group: "teacher" | "sinf_rahbari" | "management";
} | null {
  const codes = loadSettings().roleRegCodes;
  const trimmed = code.trim();
  if (!trimmed) return null;
  if (codes.teacher && trimmed === codes.teacher)
    return { role: "teacher", group: "teacher" };
  if (codes.sinfRahbari && trimmed === codes.sinfRahbari)
    return { role: "sinf_rahbari", group: "sinf_rahbari" };
  if (codes.director && trimmed === codes.director)
    return { role: "director", group: "management" };
  if (codes.zavuch && trimmed === codes.zavuch)
    return { role: "zavuch", group: "management" };
  if (codes.zamDirector && trimmed === codes.zamDirector)
    return { role: "zam_direktor", group: "management" };
  const legacyCode = loadSettings().staffRegCode;
  if (legacyCode && trimmed === legacyCode)
    return { role: "teacher", group: "teacher" };
  return null;
}
