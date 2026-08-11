/**
 * lib/kediMascotState.ts — Kedi AI'nin (öğrenci avatarından TAMAMEN BAĞIMSIZ)
 * kendi karakter durumu sözleşmesi. bkz. app/ogrenci/kedi-ai/page.tsx.
 *
 * Bu, saf tip/veri dosyasıdır — render kodu içermez. AvatarEngine3D.tsx bu
 * isimleri BİLMİYOR (pack-agnostik) — sadece `KEDI_MASCOT_PACK.animations`/
 * `.actions` (lib/avatarPack.ts) üzerinden STRING olarak akıyorlar.
 *
 * İki katman:
 *   - Activity (LOOP, karakter başka bir duruma geçene kadar sürekli tekrar
 *     eder): idle/listening/thinking/speaking.
 *   - Action (TEK SEFERLİK, biter bitmez karakter kaldığı activity'ye geri
 *     döner): success/levelUp.
 */

export type KediMascotActivity = "idle" | "listening" | "thinking" | "speaking";
export type KediMascotAction = "success" | "levelUp";

/** Sayfanın merkezi state'i — tek bir React useState ile tutulur (bkz.
 * app/ogrenci/kedi-ai/page.tsx `setKediState`). `action` sadece TEK SEFERLİK
 * bir tetikleme anında dolu olur, oynaması bitince (AvatarEngine3D
 * `onActionEnd` callback'i) çağıran taraf bunu tekrar `null`'a çeker —
 * AYNI mekanizma AvatarEngine3D'nin kendi `action` prop'uyla (bkz. o
 * dosyadaki JSDoc) birebir örtüşüyor, burada YENİDEN İCAT EDİLMEDİ.
 */
export interface KediMascotState {
  activity: KediMascotActivity;
  action: KediMascotAction | null;
}

export const KEDI_MASCOT_IDLE_STATE: KediMascotState = { activity: "idle", action: null };

/** Bir action tetiklendiğinde ne kadar süre sonra otomatik `idle`'a
 * dönüleceği (GERÇEK GLB'de bu, AvatarEngine3D'nin `onActionEnd`
 * callback'iyle - clip süresine göre - doğal olarak tetiklenecek; asset
 * gelene kadar placeholder sahnede zamanlayıcı bu sabiti kullanır,
 * bkz. KediMascotStage.tsx). */
export const KEDI_MASCOT_ACTION_FALLBACK_MS = 2200;

/**
 * Sanatçı brief'inde (docs/kedi-mascot-pack-brief.md §5) KESİNLEŞEN malzeme
 * adı sözleşmesi — GLB'de bu adların BİREBİR var olması bekleniyor. NOT:
 * brief'in kendi içinde küçük bir tutarsızlık var — §4 gözler için
 * `KEDI_EYE_LEFT`/`KEDI_EYE_RIGHT` diyor, §5'teki malzeme listesi ayrıca
 * `Eyes_Blue` diye bir isim daha geçiriyor. Üçü de BİLEREK burada tutuldu
 * (hangisinin/hangilerinin gerçek GLB'de kullanılacağı sanatçıyla/kullanıcıyla
 * netleşince tek isme indirilecek) — bkz. brief dokümanındaki not.
 */
export const KEDI_MASCOT_MATERIAL_NAMES = {
  eyeLeft: "KEDI_EYE_LEFT",
  eyeRight: "KEDI_EYE_RIGHT",
  eyeBase: "Eyes_Blue", // brief §5 — eyeLeft/eyeRight ile çakışma ihtimali, netleştirilecek
  armorBlack: "Armor_Black",
  armorGold: "Armor_Gold",
  armorEmissive: "Armor_Emissive",
  furBlack: "Fur_Black",
} as const;

/**
 * İLERİDE — göz/zırh emissive glow durumu, state başına (renk + şiddet +
 * pulse olup olmadığı). GERÇEK GLB'de KEDI_MASCOT_MATERIAL_NAMES'teki adların
 * var olduğu doğrulanana kadar bu sadece bir VERİ SÖZLEŞMESİDİR —
 * AvatarEngine3D'de veya başka bir yerde bunu okuyup
 * `THREE.MeshStandardMaterial.emissive/emissiveIntensity`'ye uygulayan
 * ÇALIŞMA ZAMANI kodu YAZILMADI (bkz. lib/avatarPack.ts AvatarLODLevel
 * yorumundaki AYNI ilke: gerçek varlık olmadan test edilemeyecek kod
 * "sahte kod" olur, yazılmaz). GLB teslim edildiğinde: (1) malzeme adları
 * KEDI_MASCOT_PACK.materials'a bağlanır, (2) bu tabloyu okuyup uygulayan
 * küçük bir useEffect KediMascotStage.tsx'e eklenir. Renkler brief §4'teki
 * ("idle: hafif mavi", "success: mavi+gold", "levelUp: güçlü gold+mavi")
 * tarife birebir uyar. */
export const KEDI_MASCOT_EYE_GLOW: Record<KediMascotActivity | KediMascotAction, { color: string; intensity: number; pulse: boolean }> = {
  idle:      { color: "#38BDF8", intensity: 0.35, pulse: false },
  listening: { color: "#38BDF8", intensity: 0.7,  pulse: false },
  thinking:  { color: "#38BDF8", intensity: 0.55, pulse: true },
  speaking:  { color: "#38BDF8", intensity: 0.6,  pulse: true },
  success:   { color: "#F5D98A", intensity: 0.85, pulse: false }, // mavi + gold karışımı — gerçek malzeme geldiğinde iki renk blend'i test edilecek
  levelUp:   { color: "#FBBF24", intensity: 1,    pulse: false }, // en güçlü gold+mavi
};
