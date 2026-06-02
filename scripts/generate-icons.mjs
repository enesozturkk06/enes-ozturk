/**
 * İkon üretici — node scripts/generate-icons.mjs
 * Gereksinim: npm install sharp
 *
 * Bu script SVG ikonunu PNG'ye dönüştürür.
 */

import { createWriteStream, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log("İkon üretimi için sharp paketi gereklidir.");
console.log("Kurulum: npm install sharp --save-dev");
console.log("");
console.log("Alternatif: https://realfavicongenerator.net adresine");
console.log("public/icons/icon.svg dosyasını yükleyerek tüm boyutları indirin.");
console.log("");
console.log("Gerekli boyutlar:", sizes.map(s => `${s}x${s}`).join(", "));
console.log("Hedef klasör: public/icons/");
console.log("");

// Sharp kuruluysa kullan
try {
  const { default: sharp } = await import("sharp");
  const svgPath = join(rootDir, "public/icons/icon.svg");
  const iconsDir = join(rootDir, "public/icons");
  mkdirSync(iconsDir, { recursive: true });

  for (const size of sizes) {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, `icon-${size}.png`));
    console.log(`✅ icon-${size}.png oluşturuldu`);
  }

  // Splash screen (2732x2732 - tüm Android ekranlarına uygun)
  await sharp(svgPath)
    .resize(2732, 2732, { fit: "contain", background: { r: 12, g: 11, b: 26, alpha: 1 } })
    .png()
    .toFile(join(iconsDir, "splash.png"));
  console.log("✅ splash.png oluşturuldu");

  console.log("\n🎉 Tüm ikonlar hazır!");
} catch {
  console.log("⚠️  Sharp kurulu değil. Manuel yöntem:");
  console.log("   1. public/icons/icon.svg dosyasını bir tarayıcıda açın");
  console.log("   2. Her boyut için sağ tık → Farklı Kaydet → PNG");
  console.log("   3. public/icons/icon-{boyut}.png olarak kaydedin");
}
