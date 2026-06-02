/**
 * İkon üretici — node scripts/generate-icons.mjs
 * Kaynaktan tüm boyutlarda PNG ve Android splash üretir.
 */
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir   = join(__dirname, "..");
const srcImg    = join(rootDir, "public/images/bf9ec1d0-7dc2-4a5d-bcb8-3f7c4a807a5f.png");

const pwaSizes    = [72, 96, 128, 144, 152, 192, 384, 512];
const androidSplashSizes = [
  { name: "drawable/splash.png",              w: 2732, h: 2732 },
  { name: "drawable-port-mdpi/splash.png",    w: 320,  h: 480 },
  { name: "drawable-port-hdpi/splash.png",    w: 480,  h: 800 },
  { name: "drawable-port-xhdpi/splash.png",   w: 720,  h: 1280 },
  { name: "drawable-port-xxhdpi/splash.png",  w: 1080, h: 1920 },
  { name: "drawable-port-xxxhdpi/splash.png", w: 1440, h: 2560 },
  { name: "drawable-land-mdpi/splash.png",    w: 480,  h: 320 },
  { name: "drawable-land-hdpi/splash.png",    w: 800,  h: 480 },
  { name: "drawable-land-xhdpi/splash.png",   w: 1280, h: 720 },
  { name: "drawable-land-xxhdpi/splash.png",  w: 1920, h: 1080 },
  { name: "drawable-land-xxxhdpi/splash.png", w: 2560, h: 1440 },
];

try {
  const { default: sharp } = await import("sharp");

  // ── PWA icons ─────────────────────────────────────────────────
  const iconsDir = join(rootDir, "public/icons");
  mkdirSync(iconsDir, { recursive: true });

  for (const size of pwaSizes) {
    await sharp(srcImg)
      .resize(size, size, { fit: "contain", background: { r:0,g:0,b:0,alpha:0 } })
      .png()
      .toFile(join(iconsDir, `icon-${size}.png`));
    console.log(`✅ PWA icon-${size}.png`);
  }

  // ── Android splash screens ────────────────────────────────────
  const resDir = join(rootDir, "android/app/src/main/res");
  const BG = { r: 12, g: 11, b: 26, alpha: 1 };   // #0c0b1a

  for (const { name, w, h } of androidSplashSizes) {
    const outDir = join(resDir, name.split("/").slice(0, -1).join("/"));
    mkdirSync(outDir, { recursive: true });

    // Logo boyutu: ekranın %35'i kadar (splash ortada görünsün)
    const logoSize = Math.round(Math.min(w, h) * 0.35);

    await sharp({
      create: { width: w, height: h, channels: 4, background: BG },
    })
      .composite([{
        input: await sharp(srcImg)
          .resize(logoSize, logoSize, { fit: "contain", background: { r:0,g:0,b:0,alpha:0 } })
          .png()
          .toBuffer(),
        gravity: "center",
      }])
      .png()
      .toFile(join(resDir, name));

    console.log(`✅ Android ${name}`);
  }

  console.log("\n🎉 Tüm ikonlar ve splash screen'ler yenilendi!");

} catch (e) {
  console.error("Hata:", e.message);
  console.log("Kurulum: npm install sharp --save-dev");
}
