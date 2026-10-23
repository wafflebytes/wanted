/**
 * Downloads the brand fonts (PRD 11, all SIL OFL via Google Fonts) as static TTF instances
 * into assets/fonts/. TTF is what satori (share images) and expo-font (app) both read.
 *
 * Usage: npx tsx scripts/fetch-fonts.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';

/** [file name, css2 family spec] */
const FONTS: [string, string][] = [
  ['Archivo-Regular', 'Archivo:wdth,wght@100,400'],
  ['Archivo-Medium', 'Archivo:wdth,wght@100,500'],
  ['Archivo-SemiBold', 'Archivo:wdth,wght@100,600'],
  ['Archivo-Bold', 'Archivo:wdth,wght@100,700'],
  ['Archivo-ExpandedBold', 'Archivo:wdth,wght@125,700'],
  ['Archivo-ExpandedExtraBold', 'Archivo:wdth,wght@125,800'],
  ['Archivo-ExpandedBlack', 'Archivo:wdth,wght@125,900'],
  ['InstrumentSerif-Regular', 'Instrument+Serif'],
  ['ChivoMono-Regular', 'Chivo+Mono:wght@400'],
  ['ChivoMono-Medium', 'Chivo+Mono:wght@500'],
  ['ChivoMono-Bold', 'Chivo+Mono:wght@700'],
  ['Caveat-SemiBold', 'Caveat:wght@600'],
  ['NothingYouCouldDo-Regular', 'Nothing+You+Could+Do'],
  ['HomemadeApple-Regular', 'Homemade+Apple'],
];

// A non-browser UA makes the css2 API answer with plain TrueType URLs (browsers get WOFF2/WOFF).
const UA = 'Wget/1.21';

async function main() {
  mkdirSync('assets/fonts', { recursive: true });
  for (const [file, spec] of FONTS) {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${spec}&display=swap`, { headers: { 'User-Agent': UA } })).text();
    // Use the latin subset (the last block when several subsets are listed).
    const blocks = css.split('@font-face').filter((b) => b.includes('src:'));
    const latin = blocks.find((b) => /\/\* latin \*\//.test(`@font-face${b}`)) ?? blocks[blocks.length - 1];
    const url = latin?.match(/url\((https:[^)]+)\)/)?.[1];
    if (!url) throw new Error(`No font URL for ${spec}: ${css.slice(0, 200)}`);
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    writeFileSync(`assets/fonts/${file}.ttf`, buf);
    console.log(`  ${file}.ttf ${(buf.length / 1024).toFixed(0)} KB`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
