// Flat home-hero backgrounds in Hooty's style (no outlines, flat colour + one shade), one per painted theme.
// Used instead of the painted art when a child picks Hooty as their guide. Run: node tools/brand/heroes.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const W = 1400, H = 781;
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">${body}</svg>\n`;
const hill = (cx, cy, rx, ry, c) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}"/>`;
const tree = (x, y, k, c = "#78c27a", s = "#62ad66") => `<g transform="translate(${x} ${y}) scale(${k})"><rect x="-7" y="-6" width="14" height="60" rx="5" fill="#a86b3c"/><ellipse cy="-40" rx="44" ry="52" fill="${c}"/><ellipse cx="18" cy="-36" rx="24" ry="44" fill="${s}"/></g>`;
const star = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".8"/>`;

function tower(x, base, w, h, roof, body, shade, flag) {
  return `<rect x="${x - w / 2}" y="${base - h}" width="${w}" height="${h}" fill="${body}"/><rect x="${x + w / 4}" y="${base - h}" width="${w / 4}" height="${h}" fill="${shade}"/>` +
    `<path d="M${x - w / 2 - 8},${base - h} L${x},${base - h - w * 1.1} L${x + w / 2 + 8},${base - h}Z" fill="${roof}"/>` +
    `<path d="M${x},${base - h - w * 1.1} V${base - h - w * 1.1 - 34}" stroke="#7a5a8a" stroke-width="4"/><path d="M${x},${base - h - w * 1.1 - 34} l30,9 l-30,9Z" fill="${flag}"/>` +
    `<rect x="${x - 8}" y="${base - h + 26}" width="16" height="22" rx="8" fill="#fff3c9"/>`;
}

const kingdom = svg(
  `<rect width="${W}" height="${H}" fill="#b9a3e8"/><rect y="250" width="${W}" height="200" fill="#d3b5ea"/><rect y="380" width="${W}" height="140" fill="#f3c3d6"/>` +
  `<circle cx="300" cy="140" r="54" fill="#fff6d8"/><circle cx="326" cy="124" r="50" fill="#b9a3e8"/>` +
  [[120, 80, 3], [520, 60, 2], [700, 150, 3], [880, 70, 2], [1250, 120, 3], [1080, 200, 2]].map(([x, y, r]) => star(x, y, r)).join("") +
  hill(300, 600, 620, 210, "#9ccf8e") + hill(1150, 620, 640, 230, "#8cc47e") +
  `<g>` + tower(980, 480, 70, 170, "#e5735a", "#f3c98b", "#e6b571", "#ff6b8b") + tower(1100, 470, 80, 230, "#7f6bd6", "#f6d6a8", "#e8bf86", "#ffd23f") + tower(1220, 490, 64, 150, "#e5735a", "#f3c98b", "#e6b571", "#6db6ee") +
  `<rect x="950" y="420" width="300" height="80" fill="#f3c98b"/><rect x="1160" y="420" width="90" height="80" fill="#e6b571"/><rect x="1080" y="440" width="44" height="60" rx="22" fill="#9c6334"/></g>` +
  hill(700, 820, 980, 300, "#a9dc8e") + `<path d="M700,${H} Q760,640 1040,520" stroke="#e8d3a6" stroke-width="40" fill="none" stroke-linecap="round"/>` +
  tree(160, 560, 1.1) + tree(560, 590, 0.8) + tree(1320, 580, 1.0)
);

const lagoon = svg(
  `<rect width="${W}" height="${H}" fill="#ffd6c2"/><rect y="200" width="${W}" height="160" fill="#ffe3d2"/><circle cx="1080" cy="300" r="80" fill="#fff3c9"/>` +
  `<g fill="#fff" opacity=".9"><ellipse cx="300" cy="140" rx="90" ry="30"/><ellipse cx="250" cy="150" rx="60" ry="24"/><ellipse cx="760" cy="90" rx="70" ry="22"/></g>` +
  `<rect y="360" width="${W}" height="421" fill="#5cc6d0"/><rect y="420" width="${W}" height="361" fill="#4fb6c4"/><rect y="490" width="${W}" height="291" fill="#43a7b8"/>` +
  `<path d="M0,430 q60,-12 120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0" stroke="#8fdde3" stroke-width="6" fill="none" opacity=".7"/>` +
  `<ellipse cx="330" cy="372" rx="170" ry="34" fill="#7a8a7c"/><ellipse cx="330" cy="366" rx="150" ry="26" fill="#93a593"/>` +
  `<rect x="300" y="190" width="54" height="176" fill="#ffffff"/><rect x="300" y="220" width="54" height="30" fill="#ff6b6b"/><rect x="300" y="290" width="54" height="30" fill="#ff6b6b"/><rect x="292" y="168" width="70" height="26" rx="6" fill="#5a6a7a"/><path d="M290,168 L327,130 L364,168Z" fill="#ff6b6b"/>` +
  `<path d="M440,366 Q446,270 470,220" stroke="#a86b3c" stroke-width="14" fill="none" stroke-linecap="round"/>` + [[-40, -10], [10, -30], [50, 0], [-10, 20]].map(([dx, dy], i) => `<ellipse cx="${470 + dx}" cy="${220 + dy}" rx="56" ry="16" fill="${i % 2 ? "#5fae62" : "#78c27a"}" transform="rotate(${-30 + i * 25} ${470 + dx} ${220 + dy})"/>`).join("") +
  `<path d="M1150,330 L1190,400 L1110,400Z" fill="#ffffff"/><rect x="1105" y="400" width="96" height="16" rx="8" fill="#e5735a"/>` +
  `<path d="M0,620 Q400,540 800,600 T1400,580 V${H} H0Z" fill="#f6dca8"/><path d="M0,690 Q500,630 1400,660 V${H} H0Z" fill="#efcf92"/>`
);

const jungle = svg(
  `<rect width="${W}" height="${H}" fill="#d8f2c8"/><circle cx="700" cy="120" r="90" fill="#fff6c4"/>` +
  [0, 1, 2, 3, 4, 5].map((i) => `<path d="M700,120 L${380 + i * 130},${H} L${430 + i * 130},${H}Z" fill="#fffbe0" opacity=".35"/>`).join("") +
  `<rect y="520" width="${W}" height="261" fill="#9ed486"/>` +
  [[80, 0.9], [300, 1.2], [1100, 1.1], [1320, 0.9]].map(([x, k]) => tree(x, 560, k * 1.6, "#5fae62", "#4d9a50")).join("") +
  [[-40, 200, -40, "#4d9a50"], [120, 120, -20, "#5fae62"], [1300, 160, 30, "#4d9a50"], [1460, 260, 50, "#5fae62"], [60, 420, -60, "#78c27a"], [1360, 440, 60, "#78c27a"]].map(([x, y, r, c]) =>
    `<g transform="translate(${x} ${y}) rotate(${r})"><ellipse rx="150" ry="62" fill="${c}"/><path d="M-150,0 H150" stroke="#3f8a44" stroke-width="6"/></g>`).join("") +
  `<g transform="translate(1000 260)"><ellipse cx="-14" rx="18" ry="26" fill="#ffa94d" transform="rotate(-20)"/><ellipse cx="14" rx="18" ry="26" fill="#ffa94d" transform="rotate(20)"/><rect x="-3" y="-20" width="6" height="40" rx="3" fill="#2b1349"/></g>` +
  `<path d="M0,640 Q350,580 700,620 T1400,600 V${H} H0Z" fill="#8fd17a"/>`
);

for (const [id, body] of [["enchanted-kingdom", kingdom], ["calm-lagoon", lagoon], ["jungle-canopy", jungle]]) {
  fs.writeFileSync(path.join(ROOT, "public/themes", id, "assets/hero-hooty.svg"), body);
  console.log("wrote", id);
}
