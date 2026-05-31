import { Resvg } from "@resvg/resvg-js";

const ROLE_TEXTS: Record<string, string> = {
  student: "O'quvchi",
  teacher: "O'qituvchi",
  sinf_rahbari: "Sinf rahbari",
  director: "Direktor",
  zam_direktor: "Direktor o'rinbosari",
  zavuch: "Zavuch",
  kutubxonachi: "Kutubxonachi",
  admin: "Administrator",
};

function esc(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface CertParams {
  fullName: string;
  role: string;
  className?: string;
  subjects?: string[];
  date: string;
}

export function generateCertificateSVG(p: CertParams): string {
  const roleText = ROLE_TEXTS[p.role] ?? p.role;
  let extraLine = "";
  if (p.role === "student" && p.className) {
    extraLine = `${p.className} sinf`;
  } else if (
    (p.role === "teacher" || p.role === "sinf_rahbari") &&
    p.subjects &&
    p.subjects.length > 0
  ) {
    extraLine = p.subjects.slice(0, 5).join(", ");
  }

  const name = esc(p.fullName);
  const role = esc(roleText);
  const extra = esc(extraLine);
  const date = esc(p.date);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="840" viewBox="0 0 1200 840">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f6fdf7"/>
      <stop offset="100%" stop-color="#eaf6ec"/>
    </linearGradient>
    <linearGradient id="hdr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#14532d"/>
      <stop offset="50%" stop-color="#15803d"/>
      <stop offset="100%" stop-color="#14532d"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="840" fill="url(#bg)"/>

  <!-- Borders -->
  <rect x="6"  y="6"  width="1188" height="828" fill="none" stroke="#14532d" stroke-width="7" rx="18"/>
  <rect x="16" y="16" width="1168" height="808" fill="none" stroke="#ca8a04" stroke-width="2.5" rx="14"/>
  <rect x="22" y="22" width="1156" height="796" fill="none" stroke="#14532d" stroke-width="1" rx="11"/>

  <!-- Corner ornaments -->
  <polygon points="28,28 78,28 28,78"  fill="#ca8a04" opacity="0.55"/>
  <polygon points="1172,28 1122,28 1172,78" fill="#ca8a04" opacity="0.55"/>
  <polygon points="28,812 78,812 28,762"  fill="#ca8a04" opacity="0.55"/>
  <polygon points="1172,812 1122,812 1172,762" fill="#ca8a04" opacity="0.55"/>

  <!-- Header band -->
  <rect x="28" y="28" width="1144" height="132" fill="url(#hdr)" rx="10"/>

  <!-- School name -->
  <text x="600" y="85"  text-anchor="middle" font-family="Georgia,serif" font-size="31" font-weight="bold" fill="white">TOSHLOQ TUMANI 3-MAKTAB</text>
  <text x="600" y="130" text-anchor="middle" font-family="Georgia,serif" font-size="20" fill="#fde68a" letter-spacing="6">TALIM PLATFORMASI</text>

  <!-- Stars -->
  <text x="170" y="122" text-anchor="middle" font-size="20" fill="#fde68a">&#9733; &#9733; &#9733;</text>
  <text x="1030" y="122" text-anchor="middle" font-size="20" fill="#fde68a">&#9733; &#9733; &#9733;</text>

  <!-- SERTIFIKAT -->
  <text x="600" y="248" text-anchor="middle" font-family="Georgia,serif" font-size="74" font-weight="bold" fill="#14532d" letter-spacing="14">SERTIFIKAT</text>

  <!-- Decorative lines under title -->
  <line x1="140" y1="268" x2="1060" y2="268" stroke="#ca8a04" stroke-width="2.5"/>
  <line x1="190" y1="275" x2="1010" y2="275" stroke="#ca8a04" stroke-width="1"/>

  <!-- Intro text -->
  <text x="600" y="334" text-anchor="middle" font-family="Georgia,serif" font-size="22" font-style="italic" fill="#555">
    Ushbu sertifikat
  </text>

  <!-- Name (large) -->
  <text x="600" y="424" text-anchor="middle" font-family="Georgia,serif" font-size="56" font-weight="bold" fill="#14532d">
    ${name}
  </text>

  <!-- ga beriladi -->
  <text x="600" y="488" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#444">
    ga beriladi. U/Uning Toshloq tumani 3-maktabining
  </text>

  <!-- Role -->
  <text x="600" y="542" text-anchor="middle" font-family="Georgia,serif" font-size="36" font-weight="bold" fill="#14532d">
    ${role}
  </text>

  <!-- Extra info (class / subjects) -->
  ${extra ? `<text x="600" y="590" text-anchor="middle" font-family="Georgia,serif" font-size="21" font-style="italic" fill="#555">${extra}</text>` : ""}

  <!-- Dashed divider -->
  <line x1="200" y1="634" x2="1000" y2="634" stroke="#ca8a04" stroke-width="1.5" stroke-dasharray="8,5"/>

  <!-- Date -->
  <text x="600" y="668" text-anchor="middle" font-family="Georgia,serif" font-size="19" fill="#666">
    Sana: ${date}
  </text>

  <!-- Signature lines -->
  <line x1="130" y1="738" x2="420" y2="738" stroke="#444" stroke-width="1.5"/>
  <text x="275" y="762" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="#555">Maktab direktori</text>

  <line x1="780" y1="738" x2="1070" y2="738" stroke="#444" stroke-width="1.5"/>
  <text x="925" y="762" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="#555">Muhr / M.O'.</text>

  <!-- Bottom watermark -->
  <text x="600" y="808" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="#aaa" letter-spacing="1">
    Toshloq tumani 3-maktab  •  TALIM PLATFORMASI  •  ${date.slice(-4)}
  </text>
</svg>`;
}

export async function generateCertificatePNG(p: CertParams): Promise<Buffer> {
  const svg = generateCertificateSVG(p);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  });
  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}

export function todayUzDate(): string {
  const now = new Date();
  const uz = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const d = uz.getUTCDate().toString().padStart(2, "0");
  const m = (uz.getUTCMonth() + 1).toString().padStart(2, "0");
  const y = uz.getUTCFullYear();
  return `${d}.${m}.${y}`;
}
