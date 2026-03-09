import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE = 'public/assets/raptor';
const TERRAIN = join(BASE, 'terrain');

mkdirSync(BASE, { recursive: true });
mkdirSync(TERRAIN, { recursive: true });

async function svgToPng(svgStr, outputPath, width = 256, height = 256) {
  await sharp(Buffer.from(svgStr))
    .resize(width, height)
    .png()
    .toFile(outputPath);
  console.log(`  ✓ ${outputPath}`);
}

// ──────────────────────── PLAYER ────────────────────────
const playerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7EC8E3"/>
      <stop offset="100%" stop-color="#3A6B8C"/>
    </linearGradient>
    <linearGradient id="cockpit" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#A0E7FF"/>
      <stop offset="100%" stop-color="#4FA8C9"/>
    </linearGradient>
    <radialGradient id="thrust" cx="0.5" cy="0" r="0.8">
      <stop offset="0%" stop-color="#00FFFF" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0066CC" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Thrust glow -->
  <ellipse cx="128" cy="220" rx="18" ry="30" fill="url(#thrust)" opacity="0.8"/>
  <ellipse cx="100" cy="215" rx="10" ry="22" fill="url(#thrust)" opacity="0.6"/>
  <ellipse cx="156" cy="215" rx="10" ry="22" fill="url(#thrust)" opacity="0.6"/>
  <!-- Wings -->
  <polygon points="128,30 60,170 75,180 128,130 181,180 196,170" fill="url(#body)" stroke="#2A4F6B" stroke-width="2"/>
  <!-- Wing tips -->
  <polygon points="60,170 45,195 75,180" fill="#5A9BBF" stroke="#2A4F6B" stroke-width="1.5"/>
  <polygon points="196,170 211,195 181,180" fill="#5A9BBF" stroke="#2A4F6B" stroke-width="1.5"/>
  <!-- Fuselage center -->
  <polygon points="128,25 110,80 110,190 128,200 146,190 146,80" fill="url(#body)" stroke="#2A4F6B" stroke-width="2"/>
  <!-- Cockpit -->
  <ellipse cx="128" cy="70" rx="14" ry="22" fill="url(#cockpit)" stroke="#3A7CA5" stroke-width="1.5"/>
  <!-- Detail lines -->
  <line x1="110" y1="110" x2="85" y2="160" stroke="#A0D4ED" stroke-width="1" opacity="0.6"/>
  <line x1="146" y1="110" x2="171" y2="160" stroke="#A0D4ED" stroke-width="1" opacity="0.6"/>
  <!-- Engine pods -->
  <rect x="95" y="160" width="10" height="35" rx="3" fill="#4A8AB0" stroke="#2A4F6B" stroke-width="1"/>
  <rect x="151" y="160" width="10" height="35" rx="3" fill="#4A8AB0" stroke="#2A4F6B" stroke-width="1"/>
</svg>`;

// ──────────────────────── ENEMIES ────────────────────────
const enemyScoutSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="scoutBody" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#CC3333"/>
      <stop offset="100%" stop-color="#661111"/>
    </linearGradient>
    <radialGradient id="scoutGlow" cx="0.5" cy="1" r="0.6">
      <stop offset="0%" stop-color="#FF4444" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#660000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="128" cy="60" rx="12" ry="20" fill="url(#scoutGlow)" opacity="0.5"/>
  <polygon points="128,50 88,180 108,170 128,200 148,170 168,180" fill="url(#scoutBody)" stroke="#991111" stroke-width="2"/>
  <polygon points="88,180 65,150 80,175" fill="#AA2222" stroke="#881111" stroke-width="1"/>
  <polygon points="168,180 191,150 176,175" fill="#AA2222" stroke="#881111" stroke-width="1"/>
  <ellipse cx="128" cy="120" rx="10" ry="14" fill="#FF6666" stroke="#CC3333" stroke-width="1.5" opacity="0.9"/>
  <circle cx="128" cy="116" r="5" fill="#FFAAAA" opacity="0.7"/>
</svg>`;

const enemyFighterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="fBody" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#33AA44"/>
      <stop offset="100%" stop-color="#115522"/>
    </linearGradient>
  </defs>
  <polygon points="128,40 70,130 55,190 85,175 128,210 171,175 201,190 186,130" fill="url(#fBody)" stroke="#0D3D15" stroke-width="2"/>
  <polygon points="55,190 40,210 70,195" fill="#228833" stroke="#0D3D15" stroke-width="1.5"/>
  <polygon points="201,190 216,210 186,195" fill="#228833" stroke="#0D3D15" stroke-width="1.5"/>
  <polygon points="128,40 115,80 115,180 128,195 141,180 141,80" fill="#2A8F3E" stroke="#0D3D15" stroke-width="1.5"/>
  <ellipse cx="128" cy="90" rx="12" ry="18" fill="#44CC55" stroke="#228833" stroke-width="1.5"/>
  <circle cx="128" cy="85" r="6" fill="#88FF99" opacity="0.6"/>
  <rect x="68" y="140" width="8" height="25" rx="2" fill="#1A6B2A"/>
  <rect x="180" y="140" width="8" height="25" rx="2" fill="#1A6B2A"/>
</svg>`;

const enemyBomberSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bBody" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#CC7722"/>
      <stop offset="100%" stop-color="#664400"/>
    </linearGradient>
  </defs>
  <polygon points="128,50 50,140 35,200 90,185 128,220 166,185 221,200 206,140" fill="url(#bBody)" stroke="#4D3300" stroke-width="2.5"/>
  <rect x="100" y="110" width="56" height="80" rx="8" fill="#AA6611" stroke="#4D3300" stroke-width="2"/>
  <polygon points="35,200 25,225 55,205" fill="#996611" stroke="#4D3300" stroke-width="1.5"/>
  <polygon points="221,200 231,225 201,205" fill="#996611" stroke="#4D3300" stroke-width="1.5"/>
  <ellipse cx="128" cy="90" rx="16" ry="20" fill="#DDAA44" stroke="#AA7722" stroke-width="2"/>
  <circle cx="128" cy="85" r="8" fill="#FFCC66" opacity="0.6"/>
  <circle cx="115" cy="155" r="6" fill="#664400" opacity="0.5"/>
  <circle cx="141" cy="155" r="6" fill="#664400" opacity="0.5"/>
  <circle cx="128" cy="175" r="6" fill="#664400" opacity="0.5"/>
  <rect x="48" y="150" width="12" height="30" rx="3" fill="#886611"/>
  <rect x="196" y="150" width="12" height="30" rx="3" fill="#886611"/>
</svg>`;

const enemyBossSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bossBody" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8B0000"/>
      <stop offset="100%" stop-color="#400000"/>
    </linearGradient>
    <radialGradient id="bossCore" cx="0.5" cy="0.4" r="0.5">
      <stop offset="0%" stop-color="#FF4444"/>
      <stop offset="100%" stop-color="#8B0000"/>
    </radialGradient>
  </defs>
  <polygon points="128,30 40,110 20,200 70,190 100,230 128,220 156,230 186,190 236,200 216,110" fill="url(#bossBody)" stroke="#300000" stroke-width="3"/>
  <polygon points="20,200 10,230 45,210" fill="#6B0000" stroke="#300000" stroke-width="2"/>
  <polygon points="236,200 246,230 211,210" fill="#6B0000" stroke="#300000" stroke-width="2"/>
  <polygon points="128,30 110,70 110,200 128,215 146,200 146,70" fill="#700000" stroke="#300000" stroke-width="2"/>
  <ellipse cx="128" cy="80" rx="20" ry="28" fill="url(#bossCore)" stroke="#CC0000" stroke-width="2"/>
  <circle cx="128" cy="73" r="10" fill="#FF6666" opacity="0.5"/>
  <rect x="58" y="130" width="14" height="40" rx="4" fill="#5B0000" stroke="#300000" stroke-width="1.5"/>
  <rect x="184" y="130" width="14" height="40" rx="4" fill="#5B0000" stroke="#300000" stroke-width="1.5"/>
  <circle cx="80" cy="170" r="8" fill="#FF2222" opacity="0.4"/>
  <circle cx="176" cy="170" r="8" fill="#FF2222" opacity="0.4"/>
  <polygon points="40,110 28,95 50,105" fill="#AA0000"/>
  <polygon points="216,110 228,95 206,105" fill="#AA0000"/>
</svg>`;

// ──────────────────────── BULLETS ────────────────────────
const bulletPlayerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="bpGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#FFFF00" stop-opacity="1"/>
      <stop offset="50%" stop-color="#FFAA00" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#FF6600" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="32" cy="32" rx="16" ry="16" fill="url(#bpGlow)"/>
  <ellipse cx="32" cy="28" rx="6" ry="14" fill="#FFFF66"/>
  <ellipse cx="32" cy="24" rx="3" ry="8" fill="#FFFFFF" opacity="0.8"/>
</svg>`;

const bulletEnemySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="beGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#FF0000" stop-opacity="1"/>
      <stop offset="50%" stop-color="#CC0000" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#660000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="32" cy="32" rx="16" ry="16" fill="url(#beGlow)"/>
  <ellipse cx="32" cy="36" rx="6" ry="14" fill="#FF4444"/>
  <ellipse cx="32" cy="38" rx="3" ry="8" fill="#FFAAAA" opacity="0.8"/>
</svg>`;

// ──────────────────────── MISSILE ────────────────────────
const missilePlayerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 128">
  <defs>
    <linearGradient id="mBody" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#AAAAAA"/>
      <stop offset="50%" stop-color="#DDDDDD"/>
      <stop offset="100%" stop-color="#888888"/>
    </linearGradient>
    <radialGradient id="mFlame" cx="0.5" cy="0" r="0.8">
      <stop offset="0%" stop-color="#FFAA00"/>
      <stop offset="100%" stop-color="#FF4400" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="32" cy="115" rx="10" ry="15" fill="url(#mFlame)" opacity="0.7"/>
  <polygon points="32,10 22,40 22,95 32,100 42,95 42,40" fill="url(#mBody)" stroke="#666" stroke-width="1.5"/>
  <polygon points="32,10 26,30 38,30" fill="#CC3333"/>
  <polygon points="18,85 22,70 22,90" fill="#999" stroke="#666" stroke-width="1"/>
  <polygon points="46,85 42,70 42,90" fill="#999" stroke="#666" stroke-width="1"/>
  <rect x="27" y="45" width="10" height="4" rx="1" fill="#CC3333" opacity="0.8"/>
</svg>`;

// ──────────────────────── POWER-UPS ────────────────────────
function powerupSvg(color, darkColor, symbol) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <radialGradient id="puGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="puBody" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${color}"/>
        <stop offset="100%" stop-color="${darkColor}"/>
      </linearGradient>
    </defs>
    <circle cx="64" cy="64" r="60" fill="url(#puGlow)"/>
    <polygon points="64,8 120,36 120,92 64,120 8,92 8,36" fill="url(#puBody)" stroke="${darkColor}" stroke-width="3" opacity="0.85"/>
    <polygon points="64,18 110,42 110,86 64,110 18,86 18,42" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5"/>
    ${symbol}
  </svg>`;
}

const powerupSpreadSvg = powerupSvg('#FFD700', '#B8860B',
  `<path d="M64,35 L50,85 L64,75 L78,85 Z" fill="#FFF" opacity="0.9"/>
   <line x1="44" y1="40" x2="30" y2="55" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
   <line x1="84" y1="40" x2="98" y2="55" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`);

const powerupRapidSvg = powerupSvg('#FF4500', '#CC2200',
  `<polygon points="74,30 54,65 68,65 54,100 84,58 68,58" fill="#FFF" opacity="0.9"/>`);

const powerupShieldSvg = powerupSvg('#4169E1', '#1A3B8C',
  `<path d="M64,30 L94,50 L94,75 C94,95 64,110 64,110 C64,110 34,95 34,75 L34,50 Z" fill="none" stroke="#FFF" stroke-width="4" opacity="0.9"/>
   <path d="M64,45 L80,55 L80,72 C80,85 64,95 64,95 C64,95 48,85 48,72 L48,55 Z" fill="#FFF" opacity="0.3"/>`);

const powerupLifeSvg = powerupSvg('#FF69B4', '#CC3380',
  `<path d="M64,85 C44,65 34,55 34,45 C34,35 42,28 52,28 C58,28 62,32 64,35 C66,32 70,28 76,28 C86,28 94,35 94,45 C94,55 84,65 64,85Z" fill="#FFF" opacity="0.9"/>`);

const powerupMissileSvg = powerupSvg('#00CED1', '#008B8B',
  `<polygon points="64,28 56,48 56,82 64,88 72,82 72,48" fill="#FFF" opacity="0.9"/>
   <polygon points="64,28 58,42 70,42" fill="#FF6666" opacity="0.8"/>
   <polygon points="52,72 56,62 56,78" fill="#FFF" opacity="0.7"/>
   <polygon points="76,72 72,62 72,78" fill="#FFF" opacity="0.7"/>`);

const powerupLaserSvg = powerupSvg('#00FF7F', '#00AA55',
  `<rect x="60" y="30" width="8" height="60" rx="2" fill="#FFF" opacity="0.9"/>
   <circle cx="64" cy="30" r="8" fill="#FFF" opacity="0.6"/>
   <line x1="64" y1="30" x2="64" y2="95" stroke="#FFF" stroke-width="2" opacity="0.5"/>
   <line x1="50" y1="85" x2="78" y2="85" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`);

// ──────────────────────── BACKGROUNDS ────────────────────────
const bgNebulaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <defs>
    <radialGradient id="n1" cx="0.3" cy="0.4" r="0.6">
      <stop offset="0%" stop-color="#1a0533"/>
      <stop offset="100%" stop-color="#050510"/>
    </radialGradient>
    <radialGradient id="n2" cx="0.7" cy="0.3" r="0.4">
      <stop offset="0%" stop-color="#220044" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#0a0015" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="n3" cx="0.5" cy="0.7" r="0.5">
      <stop offset="0%" stop-color="#001133" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#000510" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="600" fill="#050510"/>
  <rect width="800" height="600" fill="url(#n1)"/>
  <rect width="800" height="600" fill="url(#n2)"/>
  <rect width="800" height="600" fill="url(#n3)"/>
  ${Array.from({length: 80}, () => {
    const x = Math.floor(Math.random() * 800);
    const y = Math.floor(Math.random() * 600);
    const r = (Math.random() * 1.5 + 0.3).toFixed(1);
    const o = (Math.random() * 0.6 + 0.4).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFF" opacity="${o}"/>`;
  }).join('\n  ')}
</svg>`;

function planetSvg(colors) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
    <defs>
      <radialGradient id="pl" cx="0.35" cy="0.35" r="0.65">
        <stop offset="0%" stop-color="${colors[0]}"/>
        <stop offset="50%" stop-color="${colors[1]}"/>
        <stop offset="100%" stop-color="${colors[2]}"/>
      </radialGradient>
      <radialGradient id="plAtm" cx="0.5" cy="0.5" r="0.5">
        <stop offset="85%" stop-color="${colors[1]}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${colors[0]}" stop-opacity="0.15"/>
      </radialGradient>
    </defs>
    <circle cx="128" cy="128" r="100" fill="url(#pl)"/>
    <ellipse cx="128" cy="100" rx="70" ry="15" fill="${colors[0]}" opacity="0.15" transform="rotate(-15,128,100)"/>
    <ellipse cx="128" cy="140" rx="60" ry="12" fill="${colors[2]}" opacity="0.2" transform="rotate(10,128,140)"/>
    <ellipse cx="110" cy="120" rx="30" ry="20" fill="${colors[0]}" opacity="0.1"/>
    <circle cx="128" cy="128" r="102" fill="url(#plAtm)"/>
  </svg>`;
}

const planet01Svg = planetSvg(['#4488CC', '#226699', '#113355']);
const planet02Svg = planetSvg(['#CC6633', '#994422', '#662211']);

// ──────────────────────── HORIZONS ────────────────────────
function horizonSvg(skyColors, landColors, features) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200">
    <defs>
      <linearGradient id="hSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${skyColors[0]}"/>
        <stop offset="100%" stop-color="${skyColors[1]}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="200" fill="url(#hSky)"/>
    ${features}
    <rect y="140" width="800" height="60" fill="${landColors[0]}"/>
    <rect y="160" width="800" height="40" fill="${landColors[1]}"/>
  </svg>`;
}

const horizonCoastalSvg = horizonSvg(['#87CEEB', '#B0E0E6'],['#C2B280','#A09060'],
  `<path d="M0,130 Q100,110 200,125 T400,120 T600,130 T800,120 L800,145 L0,145Z" fill="#4A90B8" opacity="0.6"/>
   <path d="M0,140 Q150,125 300,138 T600,132 T800,140 L800,200 L0,200Z" fill="#5BA3C9" opacity="0.4"/>
   <circle cx="700" cy="40" r="30" fill="#FFE066" opacity="0.8"/>`);

const horizonDesertSvg = horizonSvg(['#F4A460', '#FFD700'],['#D2B48C','#C19A6B'],
  `<path d="M0,130 Q80,100 160,125 Q240,90 350,120 Q450,95 550,115 Q650,100 800,130 L800,145 L0,145Z" fill="#C19A6B" opacity="0.7"/>
   <circle cx="650" cy="45" r="35" fill="#FFF8DC" opacity="0.9"/>
   <path d="M100,140 L105,120 L110,140Z" fill="#B8860B" opacity="0.3"/>
   <path d="M500,138 L506,115 L512,138Z" fill="#B8860B" opacity="0.3"/>`);

const horizonMountainSvg = horizonSvg(['#4682B4', '#87CEEB'],['#556B2F','#6B8E23'],
  `<polygon points="0,145 100,60 200,145" fill="#4A5D3A"/>
   <polygon points="150,145 280,40 410,145" fill="#5A6D4A"/>
   <polygon points="350,145 500,50 650,145" fill="#4A5D3A"/>
   <polygon points="580,145 700,70 800,145" fill="#5A6D4A"/>
   <polygon points="250,80 280,40 310,80" fill="#FFF" opacity="0.6"/>
   <polygon points="470,90 500,50 530,90" fill="#FFF" opacity="0.5"/>`);

const horizonArcticSvg = horizonSvg(['#B0C4DE', '#E0E8F0'],['#F0F0F0','#E8E8E8'],
  `<polygon points="0,145 120,80 240,145" fill="#D8E8F0"/>
   <polygon points="180,145 330,65 480,145" fill="#E0F0F8"/>
   <polygon points="400,145 550,75 700,145" fill="#D8E8F0"/>
   <polygon points="620,145 750,85 800,130 800,145" fill="#E0F0F8"/>
   <polygon points="100,110 120,80 140,110" fill="#FFF" opacity="0.8"/>
   <polygon points="310,100 330,65 350,100" fill="#FFF" opacity="0.7"/>
   <polygon points="530,105 550,75 570,105" fill="#FFF" opacity="0.8"/>`);

const horizonFortressSvg = horizonSvg(['#2F4F4F', '#696969'],['#555555','#444444'],
  `<rect x="50" y="90" width="80" height="55" fill="#3D3D3D"/>
   <rect x="55" y="80" width="10" height="15" fill="#4D4D4D"/>
   <rect x="115" y="80" width="10" height="15" fill="#4D4D4D"/>
   <rect x="300" y="80" width="120" height="65" fill="#3D3D3D"/>
   <rect x="330" y="60" width="60" height="25" fill="#4D4D4D"/>
   <rect x="350" y="45" width="20" height="20" fill="#5D5D5D"/>
   <rect x="600" y="95" width="100" height="50" fill="#3D3D3D"/>
   <rect x="605" y="85" width="10" height="15" fill="#4D4D4D"/>
   <rect x="685" y="85" width="10" height="15" fill="#4D4D4D"/>
   <rect x="160" y="130" width="120" height="15" fill="#3A3A3A"/>
   <rect x="500" y="125" width="80" height="20" fill="#3A3A3A"/>`);

// ──────────────────────── GROUND TEXTURES ────────────────────────
function groundTextureSvg(baseColor, detailColor, details) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" fill="${baseColor}"/>
    ${details}
  </svg>`;
}

const groundGrassSvg = groundTextureSvg('#4A7C3F', '#3D6B34',
  Array.from({length: 40}, () => {
    const x = Math.floor(Math.random() * 128);
    const y = Math.floor(Math.random() * 128);
    const h = Math.floor(Math.random() * 6 + 3);
    const c = ['#3D6B34','#5A8F4E','#2D5A24'][Math.floor(Math.random()*3)];
    return `<line x1="${x}" y1="${y}" x2="${x+1}" y2="${y-h}" stroke="${c}" stroke-width="1.5" opacity="0.6"/>`;
  }).join('\n    '));

const groundSandSvg = groundTextureSvg('#D2B48C', '#C4A67A',
  Array.from({length: 30}, () => {
    const x = Math.floor(Math.random() * 128);
    const y = Math.floor(Math.random() * 128);
    const r = (Math.random() * 1.5 + 0.5).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#C4A67A" opacity="0.4"/>`;
  }).join('\n    '));

const groundSnowSvg = groundTextureSvg('#F0F0F0', '#E0E0E0',
  Array.from({length: 25}, () => {
    const x = Math.floor(Math.random() * 128);
    const y = Math.floor(Math.random() * 128);
    const r = (Math.random() * 2 + 0.5).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#E8E8E8" opacity="0.5"/>`;
  }).join('\n    ') +
  Array.from({length: 10}, () => {
    const x = Math.floor(Math.random() * 128);
    const y = Math.floor(Math.random() * 128);
    return `<circle cx="${x}" cy="${y}" r="0.8" fill="#D0D8E0" opacity="0.3"/>`;
  }).join('\n    '));

const groundConcreteSvg = groundTextureSvg('#808080', '#707070',
  `<line x1="0" y1="32" x2="128" y2="32" stroke="#6A6A6A" stroke-width="0.5" opacity="0.4"/>
   <line x1="0" y1="64" x2="128" y2="64" stroke="#6A6A6A" stroke-width="0.5" opacity="0.4"/>
   <line x1="0" y1="96" x2="128" y2="96" stroke="#6A6A6A" stroke-width="0.5" opacity="0.4"/>
   <line x1="32" y1="0" x2="32" y2="128" stroke="#6A6A6A" stroke-width="0.5" opacity="0.4"/>
   <line x1="64" y1="0" x2="64" y2="128" stroke="#6A6A6A" stroke-width="0.5" opacity="0.4"/>
   <line x1="96" y1="0" x2="96" y2="128" stroke="#6A6A6A" stroke-width="0.5" opacity="0.4"/>` +
  Array.from({length: 15}, () => {
    const x = Math.floor(Math.random() * 128);
    const y = Math.floor(Math.random() * 128);
    const r = (Math.random() * 1.5 + 0.3).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#6A6A6A" opacity="0.3"/>`;
  }).join('\n   '));

// ──────────────────────── STRUCTURES ────────────────────────
const structBeachHutSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="30" y="50" width="68" height="50" rx="2" fill="#D2A679"/>
  <polygon points="24,52 64,20 104,52" fill="#CC4433" stroke="#993322" stroke-width="1.5"/>
  <rect x="50" y="70" width="16" height="28" fill="#8B6914"/>
  <rect x="76" y="60" width="14" height="14" fill="#87CEEB" stroke="#6B5210" stroke-width="1"/>
  <rect x="36" y="60" width="14" height="14" fill="#87CEEB" stroke="#6B5210" stroke-width="1"/>
  <rect x="26" y="96" width="76" height="4" fill="#B8956A"/>
</svg>`;

const structLighthouseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <polygon points="50,110 54,30 74,30 78,110" fill="#F0F0F0" stroke="#CCC" stroke-width="1.5"/>
  <rect x="52" y="30" width="24" height="15" fill="#CC3333"/>
  <polygon points="48,30 64,15 80,30" fill="#333" stroke="#222" stroke-width="1"/>
  <circle cx="64" cy="38" r="6" fill="#FFFF00" opacity="0.8"/>
  <rect x="53" y="55" width="22" height="8" fill="#CC3333"/>
  <rect x="54" y="75" width="20" height="8" fill="#CC3333"/>
  <rect x="46" y="106" width="36" height="8" fill="#999"/>
</svg>`;

const structPalmTreeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <path d="M62,110 Q60,70 64,35" stroke="#8B6914" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M64,40 Q30,20 15,35" stroke="#228B22" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M64,40 Q90,15 110,25" stroke="#228B22" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M64,38 Q40,50 20,60" stroke="#228B22" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M64,38 Q85,45 105,55" stroke="#228B22" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M64,36 Q55,15 50,5" stroke="#2E8B2E" stroke-width="5" fill="none" stroke-linecap="round"/>
  <ellipse cx="62" cy="112" rx="12" ry="4" fill="#8B6914" opacity="0.3"/>
</svg>`;

const structOilRigSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="35" y="60" width="58" height="45" fill="#555" stroke="#333" stroke-width="2"/>
  <polygon points="45,60 64,20 83,60" fill="none" stroke="#777" stroke-width="3"/>
  <rect x="60" y="25" width="8" height="40" fill="#666"/>
  <line x1="45" y1="60" x2="83" y2="60" stroke="#888" stroke-width="2"/>
  <line x1="64" y1="20" x2="64" y2="10" stroke="#999" stroke-width="2"/>
  <rect x="55" y="8" width="18" height="6" fill="#CC3333"/>
  <rect x="30" y="100" width="10" height="15" fill="#444"/>
  <rect x="88" y="100" width="10" height="15" fill="#444"/>
  <rect x="45" y="100" width="38" height="5" fill="#666"/>
</svg>`;

const structBunkerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="20" y="50" width="88" height="45" rx="5" fill="#5A5A3A" stroke="#3A3A2A" stroke-width="2"/>
  <rect x="25" y="45" width="78" height="10" rx="3" fill="#6A6A4A"/>
  <rect x="45" y="55" width="38" height="15" fill="#222" rx="2"/>
  <rect x="50" y="58" width="28" height="9" fill="#333"/>
  <rect x="30" y="80" width="68" height="5" fill="#4A4A2A"/>
  <rect x="16" y="90" width="96" height="8" rx="2" fill="#6A6A4A" opacity="0.6"/>
</svg>`;

const structCactusSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="56" y="30" width="16" height="75" rx="8" fill="#2E8B2E" stroke="#1A6B1A" stroke-width="1.5"/>
  <rect x="30" y="45" width="30" height="12" rx="6" fill="#2E8B2E" stroke="#1A6B1A" stroke-width="1.5"/>
  <rect x="30" y="33" width="12" height="18" rx="6" fill="#2E8B2E" stroke="#1A6B1A" stroke-width="1.5"/>
  <rect x="68" y="55" width="28" height="12" rx="6" fill="#2E8B2E" stroke="#1A6B1A" stroke-width="1.5"/>
  <rect x="88" y="40" width="12" height="22" rx="6" fill="#2E8B2E" stroke="#1A6B1A" stroke-width="1.5"/>
  <ellipse cx="64" cy="108" rx="14" ry="4" fill="#2E8B2E" opacity="0.3"/>
</svg>`;

const structPineTreeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="58" y="85" width="12" height="25" fill="#8B6914"/>
  <polygon points="64,15 30,60 98,60" fill="#1A5C1A" stroke="#0D3D0D" stroke-width="1"/>
  <polygon points="64,30 35,72 93,72" fill="#228B22" stroke="#0D3D0D" stroke-width="1"/>
  <polygon points="64,45 38,88 90,88" fill="#2E8B2E" stroke="#0D3D0D" stroke-width="1"/>
  <ellipse cx="64" cy="112" rx="12" ry="3" fill="#1A5C1A" opacity="0.3"/>
</svg>`;

const structWatchtowerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="52" y="50" width="24" height="60" fill="#8B7355" stroke="#6B5335" stroke-width="1.5"/>
  <rect x="40" y="35" width="48" height="20" fill="#9B8365" stroke="#6B5335" stroke-width="1.5"/>
  <polygon points="36,37 64,18 92,37" fill="#6B4423" stroke="#4B2413" stroke-width="1"/>
  <rect x="44" y="38" width="8" height="10" fill="#333"/>
  <rect x="76" y="38" width="8" height="10" fill="#333"/>
  <line x1="52" y1="70" x2="76" y2="70" stroke="#6B5335" stroke-width="1"/>
  <line x1="52" y1="90" x2="76" y2="90" stroke="#6B5335" stroke-width="1"/>
</svg>`;

const structRadarDishSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="60" y="55" width="8" height="50" fill="#777" stroke="#555" stroke-width="1"/>
  <path d="M30,55 Q64,20 98,55" fill="#999" stroke="#666" stroke-width="2"/>
  <path d="M38,52 Q64,28 90,52" fill="#AAA" stroke="#888" stroke-width="1"/>
  <circle cx="64" cy="55" r="5" fill="#44FF44" opacity="0.7"/>
  <rect x="50" y="100" width="28" height="8" rx="2" fill="#888"/>
  <line x1="64" y1="55" x2="64" y2="40" stroke="#BBB" stroke-width="1.5"/>
  <circle cx="64" cy="38" r="3" fill="#FF4444" opacity="0.6"/>
</svg>`;

const structBarracksSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="15" y="40" width="98" height="55" fill="#6B6B4B" stroke="#4B4B2B" stroke-width="2"/>
  <polygon points="10,42 64,22 118,42" fill="#5B5B3B" stroke="#4B4B2B" stroke-width="1.5"/>
  <rect x="50" y="65" width="16" height="28" fill="#3A3A2A"/>
  <rect x="22" y="55" width="12" height="12" fill="#87CEEB" opacity="0.5" stroke="#4B4B2B" stroke-width="1"/>
  <rect x="94" y="55" width="12" height="12" fill="#87CEEB" opacity="0.5" stroke="#4B4B2B" stroke-width="1"/>
  <rect x="22" y="75" width="12" height="12" fill="#87CEEB" opacity="0.5" stroke="#4B4B2B" stroke-width="1"/>
  <rect x="94" y="75" width="12" height="12" fill="#87CEEB" opacity="0.5" stroke="#4B4B2B" stroke-width="1"/>
</svg>`;

const structAaGunSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <circle cx="64" cy="75" r="25" fill="#5A5A3A" stroke="#3A3A2A" stroke-width="2"/>
  <circle cx="64" cy="75" r="18" fill="#4A4A2A"/>
  <rect x="60" y="30" width="8" height="45" fill="#666" stroke="#444" stroke-width="1" rx="2"/>
  <rect x="52" y="35" width="6" height="38" fill="#666" stroke="#444" stroke-width="1" rx="2" transform="rotate(-15,55,55)"/>
  <rect x="70" y="35" width="6" height="38" fill="#666" stroke="#444" stroke-width="1" rx="2" transform="rotate(15,73,55)"/>
  <circle cx="64" cy="75" r="6" fill="#333"/>
</svg>`;

const structHangarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <path d="M15,95 L15,45 Q64,15 113,45 L113,95Z" fill="#6A6A6A" stroke="#4A4A4A" stroke-width="2"/>
  <rect x="30" y="65" width="68" height="30" fill="#333"/>
  <rect x="35" y="68" width="58" height="24" fill="#444"/>
  <line x1="64" y1="68" x2="64" y2="92" stroke="#555" stroke-width="2"/>
  <rect x="25" y="90" width="78" height="5" fill="#5A5A5A"/>
</svg>`;

const structCommandCenterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="20" y="45" width="88" height="50" fill="#555" stroke="#333" stroke-width="2"/>
  <rect x="50" y="25" width="28" height="25" fill="#666" stroke="#444" stroke-width="1.5"/>
  <rect x="58" y="18" width="12" height="12" fill="#777"/>
  <circle cx="64" cy="24" r="4" fill="#44FF44" opacity="0.7"/>
  <rect x="30" y="55" width="14" height="12" fill="#87CEEB" opacity="0.4" stroke="#444" stroke-width="1"/>
  <rect x="84" y="55" width="14" height="12" fill="#87CEEB" opacity="0.4" stroke="#444" stroke-width="1"/>
  <rect x="52" y="72" width="24" height="22" fill="#333"/>
  <line x1="64" y1="18" x2="64" y2="8" stroke="#888" stroke-width="2"/>
  <circle cx="64" cy="7" r="3" fill="#FF0000" opacity="0.6"/>
  <rect x="15" y="90" width="98" height="5" fill="#444"/>
</svg>`;

const structWallSegmentSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="10" y="35" width="108" height="55" fill="#6A6A5A" stroke="#4A4A3A" stroke-width="2"/>
  <rect x="10" y="28" width="20" height="12" fill="#7A7A6A" stroke="#4A4A3A" stroke-width="1.5"/>
  <rect x="98" y="28" width="20" height="12" fill="#7A7A6A" stroke="#4A4A3A" stroke-width="1.5"/>
  <line x1="10" y1="55" x2="118" y2="55" stroke="#5A5A4A" stroke-width="1"/>
  <line x1="10" y1="70" x2="118" y2="70" stroke="#5A5A4A" stroke-width="1"/>
  <line x1="40" y1="35" x2="40" y2="55" stroke="#5A5A4A" stroke-width="1"/>
  <line x1="75" y1="35" x2="75" y2="55" stroke="#5A5A4A" stroke-width="1"/>
  <line x1="55" y1="55" x2="55" y2="70" stroke="#5A5A4A" stroke-width="1"/>
  <line x1="90" y1="55" x2="90" y2="70" stroke="#5A5A4A" stroke-width="1"/>
</svg>`;

// ──────────────────────── PROPS ────────────────────────
const propCraterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <radialGradient id="crater" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#3A3A2A"/>
      <stop offset="60%" stop-color="#5A5A4A"/>
      <stop offset="100%" stop-color="#5A5A4A" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="64" cy="64" rx="45" ry="35" fill="url(#crater)"/>
  <ellipse cx="64" cy="64" rx="30" ry="22" fill="#333322" opacity="0.5"/>
  <ellipse cx="60" cy="58" rx="15" ry="10" fill="#2A2A1A" opacity="0.4"/>
</svg>`;

const propRocksSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <polygon points="40,90 30,65 50,50 70,55 75,80 60,95" fill="#888" stroke="#666" stroke-width="1.5"/>
  <polygon points="70,85 65,60 85,45 100,55 105,78 85,90" fill="#777" stroke="#555" stroke-width="1.5"/>
  <polygon points="45,95 50,80 65,78 70,90 55,100" fill="#999" stroke="#777" stroke-width="1"/>
  <polygon points="80,95 85,82 95,80 100,90 90,98" fill="#888" stroke="#666" stroke-width="1"/>
</svg>`;

const propTireTracksSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <path d="M20,10 Q40,40 30,70 Q25,100 35,128" stroke="#555" stroke-width="6" fill="none" opacity="0.4" stroke-linecap="round"/>
  <path d="M50,0 Q55,35 48,65 Q42,95 50,128" stroke="#555" stroke-width="6" fill="none" opacity="0.35" stroke-linecap="round"/>
  ${Array.from({length: 12}, (_, i) => {
    const y = i * 10 + 5;
    return `<line x1="18" y1="${y}" x2="22" y2="${y}" stroke="#444" stroke-width="2" opacity="0.3"/>
            <line x1="48" y1="${y+3}" x2="52" y2="${y+3}" stroke="#444" stroke-width="2" opacity="0.3"/>`;
  }).join('\n  ')}
</svg>`;

const propDebrisSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <polygon points="30,70 25,55 40,45 50,55 45,70" fill="#666" stroke="#444" stroke-width="1"/>
  <polygon points="70,80 60,65 75,50 90,60 85,80" fill="#777" stroke="#555" stroke-width="1"/>
  <rect x="40" y="75" width="15" height="4" rx="1" fill="#555" transform="rotate(25,47,77)"/>
  <rect x="80" y="45" width="12" height="3" rx="1" fill="#666" transform="rotate(-15,86,46)"/>
  <polygon points="55,90 50,85 60,80 65,88" fill="#888" stroke="#666" stroke-width="1"/>
  <circle cx="95" cy="85" r="4" fill="#555" opacity="0.6"/>
  <rect x="25" y="85" width="8" height="3" rx="1" fill="#777" transform="rotate(40,29,86)"/>
</svg>`;

// ──────────────────────── GENERATION ────────────────────────
const assets = [
  // Core sprites
  { svg: playerSvg, path: join(BASE, 'player.png'), w: 256, h: 256 },
  { svg: enemyScoutSvg, path: join(BASE, 'enemy_scout.png'), w: 256, h: 256 },
  { svg: enemyFighterSvg, path: join(BASE, 'enemy_fighter.png'), w: 256, h: 256 },
  { svg: enemyBomberSvg, path: join(BASE, 'enemy_bomber.png'), w: 256, h: 256 },
  { svg: enemyBossSvg, path: join(BASE, 'enemy_boss.png'), w: 256, h: 256 },
  { svg: bulletPlayerSvg, path: join(BASE, 'bullet_player.png'), w: 64, h: 64 },
  { svg: bulletEnemySvg, path: join(BASE, 'bullet_enemy.png'), w: 64, h: 64 },
  { svg: missilePlayerSvg, path: join(BASE, 'missile_player.png'), w: 64, h: 128 },
  // Power-ups
  { svg: powerupSpreadSvg, path: join(BASE, 'powerup_spread.png'), w: 128, h: 128 },
  { svg: powerupRapidSvg, path: join(BASE, 'powerup_rapid.png'), w: 128, h: 128 },
  { svg: powerupShieldSvg, path: join(BASE, 'powerup_shield.png'), w: 128, h: 128 },
  { svg: powerupLifeSvg, path: join(BASE, 'powerup_life.png'), w: 128, h: 128 },
  { svg: powerupMissileSvg, path: join(BASE, 'powerup_missile.png'), w: 128, h: 128 },
  { svg: powerupLaserSvg, path: join(BASE, 'powerup_laser.png'), w: 128, h: 128 },
  // Backgrounds
  { svg: bgNebulaSvg, path: join(BASE, 'bg_nebula.png'), w: 800, h: 600 },
  { svg: planet01Svg, path: join(BASE, 'planet_01.png'), w: 256, h: 256 },
  { svg: planet02Svg, path: join(BASE, 'planet_02.png'), w: 256, h: 256 },
  // Horizons
  { svg: horizonCoastalSvg, path: join(TERRAIN, 'horizon_coastal.png'), w: 800, h: 200 },
  { svg: horizonDesertSvg, path: join(TERRAIN, 'horizon_desert.png'), w: 800, h: 200 },
  { svg: horizonMountainSvg, path: join(TERRAIN, 'horizon_mountain.png'), w: 800, h: 200 },
  { svg: horizonArcticSvg, path: join(TERRAIN, 'horizon_arctic.png'), w: 800, h: 200 },
  { svg: horizonFortressSvg, path: join(TERRAIN, 'horizon_fortress.png'), w: 800, h: 200 },
  // Ground textures
  { svg: groundGrassSvg, path: join(TERRAIN, 'ground_grass.png'), w: 128, h: 128 },
  { svg: groundSandSvg, path: join(TERRAIN, 'ground_sand.png'), w: 128, h: 128 },
  { svg: groundSnowSvg, path: join(TERRAIN, 'ground_snow.png'), w: 128, h: 128 },
  { svg: groundConcreteSvg, path: join(TERRAIN, 'ground_concrete.png'), w: 128, h: 128 },
  // Structures
  { svg: structBeachHutSvg, path: join(TERRAIN, 'struct_beach_hut.png'), w: 128, h: 128 },
  { svg: structLighthouseSvg, path: join(TERRAIN, 'struct_lighthouse.png'), w: 128, h: 128 },
  { svg: structPalmTreeSvg, path: join(TERRAIN, 'struct_palm_tree.png'), w: 128, h: 128 },
  { svg: structOilRigSvg, path: join(TERRAIN, 'struct_oil_rig.png'), w: 128, h: 128 },
  { svg: structBunkerSvg, path: join(TERRAIN, 'struct_bunker.png'), w: 128, h: 128 },
  { svg: structCactusSvg, path: join(TERRAIN, 'struct_cactus.png'), w: 128, h: 128 },
  { svg: structPineTreeSvg, path: join(TERRAIN, 'struct_pine_tree.png'), w: 128, h: 128 },
  { svg: structWatchtowerSvg, path: join(TERRAIN, 'struct_watchtower.png'), w: 128, h: 128 },
  { svg: structRadarDishSvg, path: join(TERRAIN, 'struct_radar_dish.png'), w: 128, h: 128 },
  { svg: structBarracksSvg, path: join(TERRAIN, 'struct_barracks.png'), w: 128, h: 128 },
  { svg: structAaGunSvg, path: join(TERRAIN, 'struct_aa_gun.png'), w: 128, h: 128 },
  { svg: structHangarSvg, path: join(TERRAIN, 'struct_hangar.png'), w: 128, h: 128 },
  { svg: structCommandCenterSvg, path: join(TERRAIN, 'struct_command_center.png'), w: 128, h: 128 },
  { svg: structWallSegmentSvg, path: join(TERRAIN, 'struct_wall_segment.png'), w: 128, h: 128 },
  // Props
  { svg: propCraterSvg, path: join(TERRAIN, 'prop_crater.png'), w: 128, h: 128 },
  { svg: propRocksSvg, path: join(TERRAIN, 'prop_rocks.png'), w: 128, h: 128 },
  { svg: propTireTracksSvg, path: join(TERRAIN, 'prop_tire_tracks.png'), w: 128, h: 128 },
  { svg: propDebrisSvg, path: join(TERRAIN, 'prop_debris.png'), w: 128, h: 128 },
];

console.log(`Generating ${assets.length} PNG assets...\n`);

for (const asset of assets) {
  await svgToPng(asset.svg, asset.path, asset.w, asset.h);
}

console.log(`\nDone! Generated ${assets.length} assets.`);
