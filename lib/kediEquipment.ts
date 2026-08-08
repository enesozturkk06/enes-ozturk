/**
 * lib/kediEquipment.ts — Kedi Inventory / Equipment System sözleşmesi.
 *
 * Katman: bu dosya "Gameplay Systems" katmanında yaşar — Kedi Engine
 * (render/kamera/LOD/performans, STABLE) ile Content (Character/Salon/
 * Cosmetic/Animation Pack'ler) ARASINDA bir köprü. Bir Equipment Item;
 * hangi Character Pack soketine takıldığını (`CosmeticSlotType`, bkz.
 * lib/avatarPack.ts) bilir ama kendi görsel varlığını (mesh/texture) BİR
 * Cosmetic Pack teslim eder — bu dosya sadece o eşleşmenin ve oyun
 * kurallarının (rarity, açılma koşulu, efekt tipi) sözleşmesidir.
 *
 * KASITLI OLARAK YOK (mimari şimdi, gerçek sistem sonra):
 * - Gerçek item KATALOĞU (hiçbir EquipmentItem sabiti burada YOK).
 * - Supabase tablosu/migration — StudentInventory sadece TİP, hiçbir DB
 *   şemasına bağlı değil.
 * - UI (envanter ekranı, ekipman değiştirme, vitrin).
 * - Quest sistemi henüz yok — `EquipmentUnlockSource`'un "quest" varyantı
 *   ileriye dönük bir referans (questId sadece bir string, doğrulanmıyor).
 *
 * Bu, saf veri/tip dosyasıdır — render kodu İÇERMEZ, motor dosyalarına
 * BAĞIMLI DEĞİLDİR.
 */
import type { CosmeticSlotType } from "./avatarPack";

export type EquipmentRarity = "common" | "rare" | "epic" | "legendary";

/** UI'da rarity'yi renklendirmek için referans — henüz hiçbir bileşen
 * bunu KULLANMIYOR (UI daha sonra). Oyun endüstrisinde yaygın rarity
 * renk konvansiyonu; projenin mevcut altın vurgu rengiyle (#F59E0B,
 * bkz. lib/avatarPack.ts uiTheme) legendary kasıtlı olarak eşleşiyor. */
export const RARITY_COLORS: Record<EquipmentRarity, string> = {
  common: "#9CA3AF",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
};

/** Bir ekipman parçasının oyun üzerindeki etkisi — kullanıcının verdiği
 * tabloyla birebir:
 *   Eldiven      → visual+vfx (görünüm + yumruk efekti)
 *   Ayakkabı     → visual
 *   Hoodie       → visual
 *   Bandaj       → visual
 *   Şampiyon Kemeri → showcase (sadece vitrin, giyilmez)
 *   Aura         → levelIndicator (seviye göstergesi)
 * "visual+vfx" olan bir item, ilgili AvatarAction (bkz. lib/types.ts)
 * oynadığında EK bir parçacık/efekt tetikleyebilir — bu efekt mekanizması
 * henüz motorda YOK (AvatarEffectsPreset zaten sahnede var ama item-bazlı
 * tetikleme henüz bağlanmadı). */
export type EquipmentEffectType = "visual" | "visual+vfx" | "showcase" | "levelIndicator";

/** Equipment System'in kapsadığı slot'lar — fiziksel olarak takılanlar
 * CosmeticSlotType'tan (lib/avatarPack.ts) gelir (iskelet soketine bağlanır).
 * "aura" FİZİKSEL DEĞİL — bir bone soketine takılmaz, `effectsPreset.aura`
 * (lib/avatarPack.ts) üzerinden çözülür; bu yüzden CosmeticSlotType'a DEĞİL,
 * sadece buraya eklendi. */
export type EquipmentSlot = CosmeticSlotType | "aura";

/** Bir slot'un TİPİK/varsayılan efekti — tek tek item'lar bunu ezebilir
 * (kullanıcının notu: "bazı ekipmanlara tamamen görsel özel efektler de
 * eklenebilir" — yani bu bir varsayılan, katı bir kural değil). */
export const SLOT_DEFAULT_EFFECT: Record<EquipmentSlot, EquipmentEffectType> = {
  gloves: "visual+vfx",
  handWrap: "visual",
  shoes: "visual",
  hoodie: "visual",
  shorts: "visual",
  helmet: "visual",
  mouthGuard: "visual",
  belt: "showcase",
  aura: "levelIndicator",
};

/** Bir item'ın açılma koşulu — BİRDEN FAZLA koşuldan biri sağlanınca
 * açılabilir (bkz. EquipmentItem.unlockSources: dizi = "OR" mantığı).
 * "quest" ve "premium" ileriye dönük referanslar — Quest/Economy sistemleri
 * (bkz. proje roadmap notları) henüz YOK, sadece tip seviyesinde yer açıldı. */
export type EquipmentUnlockSource =
  | { type: "xp"; threshold: number }
  | { type: "badge"; badgeId: string }
  | { type: "quest"; questId: string }
  | { type: "premium" };

/** Bir ekipman parçasının tam tanımı — KATALOG kaydı (bir öğrencinin BUNA
 * SAHİP olup olmadığı burada DEĞİL, ileride StudentInventory'de). */
export interface EquipmentItem {
  id: string;
  label: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  /** Belirtilmezse SLOT_DEFAULT_EFFECT[slot] geçerli sayılır. */
  effectType?: EquipmentEffectType;
  /** Dizi = OR — herhangi biri sağlanınca açılır. */
  unlockSources: EquipmentUnlockSource[];
  /** Gerçek mesh/texture — bir Cosmetic Pack teslimatına bağlı, henüz yok. */
  modelRef?: { url: string };
}

/**
 * İLERİDE — bir öğrencinin SAHİP OLDUĞU ve TAKTIĞI item'lar. Şu an hiçbir
 * Supabase tablosuna/fonksiyona BAĞLI DEĞİL — sadece şeklin ileride nasıl
 * görüneceğini göstermek için burada. Gerçek persistence (migration,
 * lib/db.ts fonksiyonları) ayrı, sonraki bir adım.
 */
export interface StudentInventory {
  studentId: string;
  ownedItemIds: string[];
  equippedItemIds: Partial<Record<EquipmentSlot, string>>;
}
