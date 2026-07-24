#!/usr/bin/env node
// Talim Platform — APK splash screen generatori
// Ishlatish: node scripts/generate-splash.mjs [output.png]

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharp = require(
  path.resolve(__dirname, "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js")
);

const OUT = process.argv[2] || "/tmp/talim-splash.png";
const LOGO = path.resolve(__dirname, "../artifacts/platform/public/logo.png");
const W = 1080, H = 1920;

// Dot pattern (subtle grid)
const dots = [];
for (let col = 0; col < 7; col++) {
  for (let row = 0; row < 13; row++) {
    dots.push(`<circle cx="${90 + col * 150}" cy="${160 + row * 140}" r="2" fill="#3b82f6" opacity="0.055"/>`);
  }
}
// Right side dots
for (let col = 0; col < 3; col++) {
  for (let row = 0; row < 13; row++) {
    dots.push(`<circle cx="${800 + col * 140}" cy="${160 + row * 140}" r="2" fill="#3b82f6" opacity="0.04"/>`);
  }
}

const SVG = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Main background gradient: deep navy top-left → dark blue bottom-right -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#030811"/>
      <stop offset="45%"  stop-color="#0a1428"/>
      <stop offset="100%" stop-color="#0f1d3d"/>
    </linearGradient>
    <!-- Large radial glow behind logo -->
    <radialGradient id="glow" cx="50%" cy="47%" r="32%">
      <stop offset="0%"   stop-color="#1d4ed8" stop-opacity="0.4"/>
      <stop offset="60%"  stop-color="#1e40af" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0"/>
    </radialGradient>
    <!-- Tight inner glow -->
    <radialGradient id="glow2" cx="50%" cy="47%" r="15%">
      <stop offset="0%"   stop-color="#93c5fd" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#93c5fd" stop-opacity="0"/>
    </radialGradient>
    <!-- Bottom vignette -->
    <linearGradient id="vignette" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="70%"  stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
    </linearGradient>
  </defs>

  <!-- ── Background ── -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- ── Subtle dot grid ── -->
  ${dots.join("\n  ")}

  <!-- ── Decorative corner arcs ── -->
  <circle cx="-90" cy="320"  r="260" stroke="#1d4ed8" stroke-width="1.2" fill="none" opacity="0.18"/>
  <circle cx="-90" cy="320"  r="180" stroke="#2563eb" stroke-width="0.7" fill="none" opacity="0.10"/>
  <circle cx="1170" cy="1600" r="300" stroke="#1d4ed8" stroke-width="1.2" fill="none" opacity="0.15"/>
  <circle cx="1170" cy="1600" r="210" stroke="#2563eb" stroke-width="0.7" fill="none" opacity="0.09"/>
  <circle cx="${W/2}" cy="-80"  r="200" stroke="#1e40af" stroke-width="0.8" fill="none" opacity="0.12"/>
  <circle cx="${W/2}" cy="${H+80}" r="200" stroke="#1e40af" stroke-width="0.8" fill="none" opacity="0.10"/>

  <!-- ── Central glow layers ── -->
  <ellipse cx="${W/2}" cy="900" rx="520" ry="520" fill="url(#glow)"/>
  <ellipse cx="${W/2}" cy="900" rx="280" ry="280" fill="url(#glow2)"/>

  <!-- ── Concentric decorative rings ── -->
  <circle cx="${W/2}" cy="900" r="420" stroke="#3b82f6" stroke-width="1.5" fill="none" opacity="0.10"/>
  <circle cx="${W/2}" cy="900" r="340" stroke="#3b82f6" stroke-width="1"   fill="none" opacity="0.13"/>
  <circle cx="${W/2}" cy="900" r="250" stroke="#60a5fa" stroke-width="0.8" fill="none" opacity="0.16"/>
  <circle cx="${W/2}" cy="900" r="175" stroke="#93c5fd" stroke-width="0.6" fill="none" opacity="0.18"/>

  <!-- ── Horizontal accent lines ── -->
  <line x1="120"      y1="1075" x2="440"      y2="1075" stroke="#3b82f6" stroke-width="1" opacity="0.3"/>
  <line x1="${W-440}" y1="1075" x2="${W-120}"  y2="1075" stroke="#3b82f6" stroke-width="1" opacity="0.3"/>
  <circle cx="${W/2}" cy="1075" r="3" fill="#60a5fa" opacity="0.5"/>

  <!-- ── Vignette overlay ── -->
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>

  <!-- ── App name ── -->
  <text x="${W/2}" y="1130"
    text-anchor="middle"
    font-family="'Segoe UI', Arial, sans-serif"
    font-weight="700"
    font-size="58"
    letter-spacing="2"
    fill="white"
    opacity="0.95">Talim Platform</text>

  <!-- ── Subtitle ── -->
  <text x="${W/2}" y="1198"
    text-anchor="middle"
    font-family="'Segoe UI', Arial, sans-serif"
    font-size="30"
    letter-spacing="1"
    fill="#93c5fd"
    opacity="0.72">Toshloq tumani ta'lim boshqaruvi</text>

  <!-- ── Version ── -->
  <text x="${W/2}" y="1810"
    text-anchor="middle"
    font-family="'Segoe UI', Arial, sans-serif"
    font-size="24"
    fill="#475569"
    opacity="0.6">v1.0</text>
</svg>`;

(async () => {
  // Logoni markazga joylashtirish uchun o'lchamini aniqlash
  const logoBuffer = require("fs").readFileSync(LOGO);
  const logoResized = await sharp(logoBuffer)
    .resize(320, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const meta = await sharp(logoResized).metadata();
  const logoW = meta.width ?? 320;
  const logoH = meta.height ?? 180;

  // Logo markazini 900 px bo'yicha joylashtir
  const top  = Math.round(900 - logoH / 2);
  const left = Math.round(W   / 2 - logoW / 2);

  await sharp(Buffer.from(SVG))
    .composite([{ input: logoResized, top, left }])
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  console.log(`✅ Splash tayyor: ${OUT}`);
})().catch(e => { console.error("❌ Xato:", e.message); process.exit(1); });
