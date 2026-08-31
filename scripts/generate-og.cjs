const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateAssets() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. High quality 1200x630 OG Banner for WhatsApp / Facebook / Twitter / Telegram
  const ogSvg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="46%" r="65%">
      <stop offset="0%" stop-color="#24070a" />
      <stop offset="45%" stop-color="#120608" />
      <stop offset="100%" stop-color="#080808" />
    </radialGradient>
    <linearGradient id="redAccent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E50914" />
      <stop offset="100%" stop-color="#990000" />
    </linearGradient>
    <filter id="redGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="60" result="blur" />
    </filter>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Dark Luxury Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />

  <!-- Ambient glowing aura -->
  <circle cx="600" cy="220" r="260" fill="#E50914" opacity="0.22" filter="url(#redGlow)" />

  <!-- Sophisticated geometric border framing -->
  <rect x="28" y="28" width="1144" height="574" rx="14" fill="none" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="1.5" />
  <rect x="36" y="36" width="1128" height="558" rx="10" fill="none" stroke="#E50914" stroke-opacity="0.25" stroke-width="1" />

  <!-- Globe Emblem centered -->
  <g transform="translate(600, 195)" filter="url(#dropShadow)">
    <!-- White circle background -->
    <circle cx="0" cy="0" r="82" fill="#FFFFFF" />
    <clipPath id="circleClip">
      <circle cx="0" cy="0" r="82" />
    </clipPath>
    
    <g clip-path="url(#circleClip)">
      <g transform="rotate(-18 0 0)">
        <!-- Curved Red Bands -->
        <path d="M -90 -45 Q 0 -68 90 -45 Q 0 -22 -90 -45" fill="#D31216" />
        <path d="M -95 -12 Q 0 -36 95 -12 Q 0 12 -95 -12" fill="#D31216" />
        <path d="M -95 20 Q 0 -5 95 20 Q 0 45 -95 20" fill="#D31216" />
        <path d="M -90 52 Q 0 28 90 52 Q 0 76 -90 52" fill="#D31216" />
      </g>
    </g>
  </g>

  <!-- Title: PLANET TALENT -->
  <g transform="translate(600, 360)">
    <text x="0" y="0" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="900" letter-spacing="9" text-anchor="middle" fill="#FFFFFF">
      PLANET <tspan fill="#D31216">TALENT</tspan>
    </text>
  </g>

  <!-- Subtitle: AGENCIA DE MODELOS -->
  <g transform="translate(600, 425)">
    <text x="0" y="0" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" letter-spacing="12" text-anchor="middle" fill="#E2E8F0">
      AGENCIA DE MODELOS
    </text>
  </g>

  <!-- Pill Badge: CATÁLOGO PROFESIONAL & CASTING ONLINE -->
  <g transform="translate(600, 485)">
    <rect x="-210" y="-18" width="420" height="36" rx="18" fill="#FFFFFF" fill-opacity="0.08" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="1" />
    <text x="0" y="5" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" letter-spacing="4" text-anchor="middle" fill="#CBD5E1">
      CATÁLOGO PROFESIONAL &amp; CASTING
    </text>
  </g>

  <!-- Bottom Accent Line -->
  <line x1="480" y1="550" x2="720" y2="550" stroke="#D31216" stroke-width="2.5" stroke-linecap="round" />
</svg>
`;

  // 2. Square Emblem SVG (for 512x512, 192x192, apple touch icon, favicon)
  const squareSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sqGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1e0608" />
      <stop offset="60%" stop-color="#0e0608" />
      <stop offset="100%" stop-color="#050505" />
    </radialGradient>
    <filter id="sqGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="40" />
    </filter>
  </defs>

  <rect width="512" height="512" rx="64" fill="url(#sqGrad)" />
  <circle cx="256" cy="230" r="170" fill="#E50914" opacity="0.25" filter="url(#sqGlow)" />
  <rect x="16" y="16" width="480" height="480" rx="52" fill="none" stroke="#FFFFFF" stroke-opacity="0.1" stroke-width="2" />

  <!-- Globe Emblem -->
  <g transform="translate(256, 210)">
    <circle cx="0" cy="0" r="105" fill="#FFFFFF" />
    <clipPath id="sqClip">
      <circle cx="0" cy="0" r="105" />
    </clipPath>
    <g clip-path="url(#sqClip)">
      <g transform="rotate(-18 0 0)">
        <path d="M -115 -58 Q 0 -88 115 -58 Q 0 -28 -115 -58" fill="#D31216" />
        <path d="M -120 -15 Q 0 -45 120 -15 Q 0 15 -120 -15" fill="#D31216" />
        <path d="M -120 26 Q 0 -5 120 26 Q 0 57 -120 26" fill="#D31216" />
        <path d="M -115 68 Q 0 38 115 68 Q 0 98 -115 68" fill="#D31216" />
      </g>
    </g>
  </g>

  <!-- Text -->
  <text x="256" y="385" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" letter-spacing="5" text-anchor="middle" fill="#FFFFFF">
    PLANET <tspan fill="#D31216">TALENT</tspan>
  </text>
  <text x="256" y="425" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" letter-spacing="6" text-anchor="middle" fill="#E2E8F0">
    AGENCIA DE MODELOS
  </text>
</svg>
`;

  console.log('Generating OG banner and thumbnails...');

  const ogBuf = Buffer.from(ogSvg);
  const sqBuf = Buffer.from(squareSvg);

  // High quality OG JPG (optimally compressed for WhatsApp limit < 300KB)
  await sharp(ogBuf)
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(path.join(publicDir, 'og-preview.jpg'));

  // High quality OG PNG
  await sharp(ogBuf)
    .png({ quality: 90, compressionLevel: 8 })
    .toFile(path.join(publicDir, 'og-preview.png'));

  // Square banner for platforms that request 1:1 image
  await sharp(sqBuf)
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(path.join(publicDir, 'og-square.jpg'));

  await sharp(sqBuf)
    .png({ quality: 90, compressionLevel: 8 })
    .toFile(path.join(publicDir, 'og-square.png'));

  // Fix all PNG icons so no corrupt headers exist
  await sharp(sqBuf)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'favicon-512.png'));

  await sharp(sqBuf)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'favicon-192.png'));

  await sharp(sqBuf)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  await sharp(sqBuf)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  // Update public/icons/ directory if it exists
  const iconsDir = path.join(publicDir, 'icons');
  if (fs.existsSync(iconsDir)) {
    await sharp(sqBuf).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
    await sharp(sqBuf).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
    await sharp(sqBuf).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-maskable-512.png'));
  }

  // Also replace logo_planet.png with valid high-res version
  await sharp(sqBuf)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'logo_planet.png'));

  console.log('Successfully generated all OG images and app icons!');
  
  const ogJpgStat = fs.statSync(path.join(publicDir, 'og-preview.jpg'));
  const ogPngStat = fs.statSync(path.join(publicDir, 'og-preview.png'));
  console.log(`og-preview.jpg size: ${(ogJpgStat.size / 1024).toFixed(1)} KB`);
  console.log(`og-preview.png size: ${(ogPngStat.size / 1024).toFixed(1)} KB`);
}

generateAssets().catch(err => {
  console.error(err);
  process.exit(1);
});
