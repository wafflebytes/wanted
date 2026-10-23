/**
 * Turns the generated art in assets/source/ into what the app and the share renderer use
 * (PRD Appendix B): WebP for the app at the sizes it draws, PNG/JPEG for server renders
 * (satori and resvg read PNG and JPEG), favicons and icons, and Gus's expression crops
 * from the reference sheet.
 *
 * Usage: npm run assets:build
 */
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'assets/source';
const APP = 'assets/images';
const OG = 'assets/og';
mkdirSync(APP, { recursive: true });
mkdirSync(OG, { recursive: true });

type Job = { src: string; name: string; width: number; trim?: boolean; og?: 'png' | 'jpg'; ogWidth?: number; app?: boolean };

const JOBS: Job[] = [
  { src: 'blank-wanted-poster', name: 'poster-0', width: 1024, og: 'png', ogWidth: 900 },
  { src: 'battered-level-1', name: 'poster-1', width: 1024, og: 'png', ogWidth: 900 },
  { src: 'battered-level-2', name: 'poster-2', width: 1024, og: 'png', ogWidth: 900 },
  { src: 'battered-level-3', name: 'poster-3', width: 1024, og: 'png', ogWidth: 900 },
  { src: 'backdrop', name: 'backdrop', width: 1024, og: 'jpg' },
  { src: 'maya-poster-portrait', name: 'maya-engraving', width: 900, trim: true, og: 'png', ogWidth: 900 },
  { src: 'maya-avatar', name: 'maya-sticker', width: 640, trim: true, og: 'png', ogWidth: 512 },
  { src: 'maya-mugshot', name: 'maya-mugshot', width: 900, og: 'jpg', ogWidth: 900 },
  { src: 'caught-live-stamp', name: 'stamp-caught-live', width: 1200, trim: true, og: 'png', ogWidth: 1000 },
  { src: 'deputy-star', name: 'deputy-star', width: 512, trim: true, og: 'png', ogWidth: 320 },
  { src: 'gus-signing-page-hero', name: 'gus-signing', width: 820, trim: true },
  { src: 'gus-lets-ride', name: 'gus-lets-ride', width: 1100, trim: true, og: 'png', ogWidth: 700 },
  { src: 'gus-loading', name: 'gus-loading', width: 900, trim: true },
  { src: 'gus-empty-state', name: 'gus-tumbleweed', width: 760, trim: true },
  { src: 'van', name: 'van', width: 640, trim: true, og: 'png', ogWidth: 360 },
  { src: 'cover', name: 'cover', width: 1536, og: 'jpg', ogWidth: 1200 },
  { src: 'app-icon', name: 'gus-mark', width: 512, og: 'png', ogWidth: 256 },
];

/** Gus's expressions, cropped from the reference sheet (1536 x 1024). */
const EXPRESSIONS: { name: string; box: [number, number, number, number] }[] = [
  { name: 'gus-idle', box: [30, 118, 200, 200] },
  { name: 'gus-thinking', box: [1212, 40, 290, 290] },
  { name: 'gus-proud', box: [906, 345, 290, 290] },
  { name: 'gus-unimpressed', box: [1222, 345, 290, 290] },
  { name: 'gus-losing-it', box: [906, 662, 290, 300] },
  { name: 'gus-reading', box: [906, 40, 290, 290] },
  { name: 'gus-wave', box: [1218, 662, 300, 300] },
];

async function main() {
  for (const j of JOBS) {
    let img = sharp(`${SRC}/${j.src}.png`);
    if (j.trim) img = img.trim({ threshold: 1 });
    const buf = await img.png().toBuffer();
    await sharp(buf).resize({ width: j.width, withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 90 }).toFile(`${APP}/${j.name}.webp`);
    if (j.og) {
      const ogw = j.ogWidth ?? j.width;
      const base = sharp(buf).resize({ width: ogw, withoutEnlargement: true });
      // Palette-quantized PNG keeps alpha and cuts a 4 MB poster to well under 1 MB for satori.
      if (j.og === 'png') await base.png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile(`${OG}/${j.name}.png`);
      else await base.flatten({ background: '#1a0f08' }).jpeg({ quality: 82, mozjpeg: true }).toFile(`${OG}/${j.name}.jpg`);
    }
    console.log(`  ${j.name}`);
  }

  for (const e of EXPRESSIONS) {
    const [left, top, width, height] = e.box;
    await sharp(`${SRC}/gus-reference-sheet.png`)
      .extract({ left, top, width, height })
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 88 })
      .toFile(`${APP}/${e.name}.webp`);
    console.log(`  ${e.name}`);
  }

  // Icons: iOS/web icon, Android adaptive foreground, favicon and splash.
  await sharp(`${SRC}/app-icon.png`).resize(1024, 1024).png().toFile(`${APP}/icon.png`);
  await sharp(`${SRC}/app-icon-android-version.png`).resize(1024, 1024).png().toFile(`${APP}/icon-foreground.png`);
  await sharp(`${SRC}/app-icon.png`).resize(196, 196).png().toFile(`${APP}/favicon.png`);
  await sharp(`${SRC}/app-icon-android-version.png`).trim({ threshold: 1 }).resize(600, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(`${APP}/splash.png`);
  await sharp(`${SRC}/app-icon.png`).resize(180, 180).png().toFile(`${APP}/apple-touch-icon.png`);
  console.log('Assets built.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
