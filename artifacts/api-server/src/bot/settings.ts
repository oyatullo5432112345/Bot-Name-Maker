import { pool } from "../lib/db.js";
import { logger } from "../lib/logger.js";

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
  kutubxonachi?: string;
}

export interface BotSettings {
  channels: Channel[];
  welcomeMessage: string;
  phoneMappings: PhoneMapping[];
  onboardingVideoFileId?: string;
  apkFileId?: string;
  apkFileName?: string;
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
  roleRegCodes: {
    director: "77d",
    zavuch: "88Z",
    zamDirector: "55B",
    kutubxonachi: "99K",
  },
};

let cache: BotSettings = { ...DEFAULT_SETTINGS, channels: [], phoneMappings: [] };
let initialized = false;

/**
 * Server ishga tushganda bir marta chaqiriladi — bazadan sozlamalarni
 * xotiraga yuklaydi. Shu bilan `loadSettings()` boshqa joylarda hech narsa
 * o'zgartirmasdan sinxron ishlayveradi.
 */
export async function initSettings(): Promise<void> {
  try {
    const result = await pool.query<{ data: BotSettings }>(
      "SELECT data FROM bot_settings WHERE id = 1"
    );
    if (result.rows[0]?.data) {
      const parsed = result.rows[0].data;
      cache = {
        channels: parsed.channels ?? [],
        welcomeMessage: parsed.welcomeMessage ?? DEFAULT_SETTINGS.welcomeMessage,
        phoneMappings: parsed.phoneMappings ?? [],
        onboardingVideoFileId: parsed.onboardingVideoFileId,
        apkFileId: parsed.apkFileId,
        apkFileName: parsed.apkFileName,
        videoUrls: parsed.videoUrls ?? { student: "", teacher: "", staff: "" },
        roleVideoUrls: parsed.roleVideoUrls ?? {},
        staffRegCode: parsed.staffRegCode,
        roleRegCodes: { ...DEFAULT_SETTINGS.roleRegCodes, ...(parsed.roleRegCodes ?? {}) },
      };
    } else {
      await pool.query(
        "INSERT INTO bot_settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING",
        [JSON.stringify(cache)]
      );
    }
    initialized = true;
    logger.info("Bot sozlamalari bazadan yuklandi ✅");
  } catch (err) {
    logger.error({ err }, "Sozlamalarni bazadan yuklashda xato — default holatda ishlaydi");
  }
}

export function loadSettings(): BotSettings {
  return cache;
}

export function saveSettings(settings: BotSettings): void {
  cache = settings;
  // Orqa fonda bazaga yozamiz — chaqiruvchi kutib turmaydi (avvalgi sinxron API saqlanadi).
  void pool
    .query(
      `INSERT INTO bot_settings (id, data, updated_at) VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [JSON.stringify(settings)]
    )
    .catch((err) => logger.warn({ err }, "Sozlamalarni saqlashda xato"));
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

export function setApkFileId(fileId: string, fileName: string): void {
  const settings = loadSettings();
  settings.apkFileId = fileId;
  settings.apkFileName = fileName;
  saveSettings(settings);
}

export function getApkFileId(): { fileId: string; fileName: string } | null {
  const s = loadSettings();
  if (!s.apkFileId) return null;
  return { fileId: s.apkFileId, fileName: s.apkFileName ?? "talim.apk" };
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
  role: "teacher" | "sinf_rahbari" | "director" | "zavuch" | "zam_direktor" | "kutubxonachi";
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
  if (codes.kutubxonachi && trimmed === codes.kutubxonachi)
    return { role: "kutubxonachi", group: "management" };
  const legacyCode = loadSettings().staffRegCode;
  if (legacyCode && trimmed === legacyCode)
    return { role: "teacher", group: "teacher" };
  return null;
}
