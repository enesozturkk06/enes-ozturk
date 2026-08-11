/**
 * lib/avatarPack.ts — Character Pack sözleşmesi.
 *
 * GÜNCELLEME ("3D Avatar Temizliği" turu): Öğrenci 3D avatar sistemi
 * (MIXAMO_DEV_PACK/HUMAN_RIG_DEV_PACK/KEDI_PREMIUM_MALE_PACK_V1/
 * KEDI_PREMIUM_FEMALE_PACK_V1 + ACTIVE_CHARACTER_PACK_ID/
 * getActiveCharacterPack()) kaldırıldı — öğrenci karakteri artık
 * StudentAvatar.tsx/LazyStudentAvatar.tsx'in 2D Dijital Salon sistemiyle
 * gösteriliyor. Bu dosya artık SADECE Kedi AI'nin gelecekteki 3D mascot'u
 * için var: `KEDI_MASCOT_PACK`, `CHARACTER_PACKS` registry (tek pack),
 * `isCharacterPackReady()` — `KediMascotStage.tsx` bunları okuyor.
 *
 * Katman mimarisi (Kedi AI mascot için hâlâ geçerli):
 *   Kedi Character Engine (AvatarEngine3D.tsx — pack'e tamamen kör render motoru)
 *   ↓ okur
 *   Character Pack (bu dosya — bir karakterin TÜM deneyimini taşıyan paket:
 *     model, animasyon, LOD, materyal, morph target, yüz animasyonu, kamera,
 *     ışık, efekt, ses profili)
 *   ↓
 *   Kedi AI (KediMascotStage.tsx)
 *
 * Motor (AvatarEngine3D.tsx, LazyAvatarEngine3D.tsx, useAdaptiveQuality/
 * useInView/useDocumentVisible) korunuyor — Kedi AI mascot'un gerçek GLB'si
 * geldiğinde SADECE KEDI_MASCOT_PACK.metadata.artist güncellenir, motor
 * dosyalarına dokunulmaz.
 *
 * Bu, saf veri/tip dosyasıdır — render kodu (React/Three.js) İÇERMEZ.
 */
import type { AvatarExpression } from "./types";

export type AvatarBoneSocket = "hand_l" | "hand_r" | "head" | "foot_l" | "foot_r" | "torso" | "waist";
export type PackStage = "dev" | "validation" | "production";

export interface AvatarModelRef {
  url: string;
  format: "glb";
}

/** İLERİDE — hiçbir pack henüz birden fazla detay seviyesi taşımıyor
 * (tek dosyalık test/doğrulama varlıkları). Engine `lod` alanını okur ama
 * gerçek mesafe-tabanlı geçiş mantığı, test edilebilecek gerçek çok-seviyeli
 * bir varlık gelene kadar YAZILMAYACAK (sahte/test edilmemiş kod yazmamak için). */
export interface AvatarLODLevel {
  distance: number;
  url: string;
}

export interface AvatarCameraPreset {
  position: [number, number, number];
  fov: number;
  target: [number, number, number];
}

export interface AvatarLightingPreset {
  environmentPreset: string; // drei <Environment preset="...">
  keyLight: { color: string; intensity: number };
  fillLight: { color: string; intensity: number };
  ambientIntensity: number;
}

/** İLERİDE — aura/parçacık/post-processing efektleri. Hiçbir pack'te henüz yok. */
export interface AvatarEffectsPreset {
  aura?: string;
}

/** İLERİDE — hooks/useKediVoice.ts'teki TTS ses seçimiyle bağlanacak
 * (pickTurkishVoice'a karakterin cinsiyetine/tonuna uygun bir ipucu vermek için). */
export interface AvatarVoicePreset {
  preferredVoiceNameContains?: string;
}

export interface AvatarUiTheme {
  accentColor: string;
}

/** İLERİDE — StudentAvatarConfig.skinTone/hairColor katalog id'lerini bu
 * pack'in gerçek malzeme renklerine eşlemek için (2D sistemdeki hex renkler
 * yerine 3D materyal parametreleri). */
export interface AvatarMaterialOverrides {
  skinTones?: Record<string, string>;
  hairColors?: Record<string, string>;
}

/** Cosmetic Pack / Equipment System kategorileri (bkz. lib/kediEquipment.ts) —
 * her kategori bir veya birden fazla iskelet soketine bağlanır (eldiven →
 * iki el, ayakkabı → iki ayak, hoodie → gövde, kemer/şort → bel, kask/ağızlık
 * → baş, bandaj → eller). "Aura" gibi fiziksel olmayan efektler burada YOK —
 * onlar `effectsPreset.aura` üzerinden çözülüyor (bkz. lib/kediEquipment.ts
 * EquipmentSlot). */
export type CosmeticSlotType = "gloves" | "shoes" | "hoodie" | "belt" | "helmet" | "mouthGuard" | "handWrap" | "shorts";

export interface CosmeticSlotDef {
  sockets: AvatarBoneSocket[];
}

/** Evolution Pack — bir kademedeki GÖRSEL değişim. Kademe numarası KENDİ
 * başına bir sayaç DEĞİL: lib/avatarEvolution.ts'teki `EvolutionTier.tierIndex`
 * ile BİREBİR eşleşir (0=starter ... 5=legend, XP_LEVELS.length'e bağlı —
 * bkz. o dosyanın üstündeki not: "yeni bir paralel seviye durumu SAKLANMAZ").
 * Burada YENİ bir eşik/seviye icat edilmiyor, sadece o mevcut kademelerin her
 * birinde karakterin nasıl görüneceği tanımlanıyor. */
export interface EvolutionStageOverride {
  /** morphTargets.muscle.biceps ağırlığı — 0 (starter) .. 1 (legend). BodyFat
   * KASITLI OLARAK burada YOK: o XP kademesine değil gerçek kilo verisine
   * bağlı (bkz. lib/avatarEvolution.ts getWeightTrend) — ayrı bir eksen. */
  muscleMorphWeight: number;
  /** Bu kademede normal "idle" yerine kullanılacak duruş varyantı (opsiyonel). */
  postureAnimation?: string;
  /** Bu kademede normal "guard" yerine kullanılacak gard varyantı (opsiyonel). */
  guardAnimation?: string;
  /** facialAnimations içindeki bir anahtar. */
  facialExpression?: string;
  /** Genel vücut dili/duruş animasyon varyantı (opsiyonel). */
  bodyLanguageAnimation?: string;
}

/** Ürün-seviyesi künye — onlarca Character Pack olduğunda bir yönetim/liste
 * ekranında (ör. ileride bir admin pack seçici) filtrelemek/göstermek için.
 * Render motoru bu alanı OKUMAZ; salt içerik/yönetim metadatası. */
export interface CharacterPackMetadata {
  name: string;
  /** Sanatçı henüz belirlenmediyse "PENDING_ARTIST" — teslimat sonrası doldurulur. */
  artist: string;
  /** ISO tarih (ör. "2026-09-01") — henüz yayınlanmadıysa null. */
  releaseDate: string | null;
  license: "owned" | "cc-by" | "licensed" | "public-domain";
  quality: "dev" | "validation" | "premium";
  sport: string;
  gender: "male" | "female" | "unisex";
}

export interface CharacterPackManifest {
  id: string;
  label: string;
  stage: PackStage;
  /** Cache-busting + hangi sürümün kullanıldığını takip etmek için (bkz.
   * lib/db.ts uploadStudentAvatar'daki ?v= deseniyle aynı fikir). Not:
   * CharacterPackMetadata KASITLI OLARAK kendi `version` alanını taşımıyor —
   * tek kaynak burası, iki yerde aynı bilgiyi tutmak (senkron kayması riski)
   * yerine metadata bunu referans alır. */
  version: string;
  /** Ürün künyesi — bkz. CharacterPackMetadata. */
  metadata: CharacterPackMetadata;

  // ── Model ──────────────────────────────────────────────────────
  model: AvatarModelRef;
  lod?: AvatarLODLevel[];
  /** "other" — motor bugün rig'e göre dallanan HİÇBİR mantık içermiyor (sadece
   * bilgi amaçlı alan), ama ileride Mixamo retarget varsayımı yapan bir kod
   * yazılırsa bu bayrak dürüst kalsın diye eklendi. */
  skeletonType: "mixamo-standard" | "other";

  // ── Animasyon ──────────────────────────────────────────────────
  /** AvatarActivity (öğrenci antrenman avatarı) VEYA başka bir karakter
   * ailesinin KENDİ activity sözlüğü (ör. Kedi AI mascot'unun idle/listening/
   * thinking/speaking'i, bkz. lib/kediMascotState.ts) → GLB içindeki animasyon
   * clip adı. Anahtar tipi BİLEREK `string`e genişletildi (2026-08, Kedi
   * mascot pack'i eklenirken) — motor zaten `pack.animations[activity]` ile
   * SAF STRING anahtarla okuyordu (AvatarActivity'ye özel bir dallanma hiç
   * yoktu), bu yüzden bu genişletme motor DAVRANIŞINI DEĞİŞTİRMEZ, sadece
   * TypeScript'in farklı karakter ailelerinin KENDİ activity sözlüklerini
   * kullanabilmesine izin verir. Öğrenci avatarının AvatarActivity union'ı
   * (StudentAvatar.tsx/salon/page.tsx'teki exhaustive Record'lar) BİLEREK
   * DOKUNULMADI/genişletilmedi — bu iki sözlük birbirinden bağımsız kalır.
   * Bunlar LOOP'turlar — avatar başka bir activity'ye geçene kadar sürekli
   * tekrar eder. Pack'in HER aktiviteyi desteklemesi ZORUNLU değil — Engine,
   * eksik bir aktivite için `idle`'a (o da yoksa hiçbir şeye) sessizce düşer. */
  animations: Partial<Record<string, string>>;
  /** GLB içindeki animasyon clip adı. Bunlar TEK SEFERLİKTİR
   * (jab/cross/hook gibi darbeler, victory/defeat/celebration gibi
   * sonuçlar) — `animations`'DAN BİLEREK AYRI bir alan: bir action geçerli
   * activity LOOP'unun ÜZERİNE biner, bitince avatar o activity'ye geri
   * döner (Idle→Jab→Idle, BagWork→Hook→BagWork gibi). Anahtar tipi
   * `animations` ile AYNI sebeple `string`e genişletildi (bkz. yukarıdaki not).
   * DÜZELTME (2026-08-09): Motor bu "tek seferlik oynat + activity'ye dön"
   * mantığını ARTIK UYGULUYOR (bkz. AvatarEngine3D.tsx CharacterModel
   * içindeki action/expression useEffect'i, mixer "finished" event'i) — bu
   * alanın altındaki eski not ("motor henüz uygulamıyor") Kedi mascot pack'i
   * eklenirken kod okunarak GÜNCEL OLMADIĞI doğrulandı ve düzeltildi. */
  actions?: Partial<Record<string, string>>;
  /** AvatarExpression → GLB içindeki yüz animasyon clip adı (bkz.
   * lib/kediExpression.ts — hangi uygulama olayının hangi expression'ı
   * tetiklediği orada). animations/actions ile AYNI Partial<Record<...>>
   * deseni — pack'in HER expression'ı desteklemesi ZORUNLU değil. */
  facialAnimations?: Partial<Record<AvatarExpression, string>>;

  // ── Görünüm ────────────────────────────────────────────────────
  materials?: AvatarMaterialOverrides;
  /** İLERİDE — kas/yüz morph target (blend shape) adları. */
  morphTargets?: { muscle?: Record<string, string>; face?: Record<string, string> };
  /** İLERİDE — ekipman (eldiven/ayakkabı/saç) bağlama noktaları (kemik adları). */
  attachmentSockets?: Partial<Record<AvatarBoneSocket, string>>;
  /** Cosmetic Pack kategorileri — hangi soket(ler)e bağlandıkları. */
  cosmeticSlots?: Partial<Record<CosmeticSlotType, CosmeticSlotDef>>;
  /** İLERİDE — kumaş/saç ikincil hareket (jiggle) için kemik listesi. */
  physics?: { jiggleBones: string[] };

  // ── Evrim ──────────────────────────────────────────────────────
  /** Evolution Pack — key = lib/avatarEvolution.ts'teki EvolutionTier.tierIndex.
   * Belirtilmeyen bir tierIndex için Engine/Avatar katmanı hiçbir override
   * uygulamaz (sessizce mevcut varsayılan görünüşte kalır). */
  evolutionStages?: Record<number, EvolutionStageOverride>;

  // ── Sahne ──────────────────────────────────────────────────────
  /** Belirtilmezse Engine'in sabit varsayılanı kullanılır. */
  cameraPreset?: AvatarCameraPreset;
  lightingPreset?: AvatarLightingPreset;
  effectsPreset?: AvatarEffectsPreset;
  voicePreset?: AvatarVoicePreset;
  uiTheme?: AvatarUiTheme;

  /** CC BY gibi atıf gerektiren lisanslar için — doğruysa UI'da görünür bir
   * atıf satırı gösterilmesi GEREKİR. */
  requiresAttribution?: { text: string; url: string };
}

/**
 * Sanatçıdan gelmesi gereken ama henüz teslim edilmemiş bir DEĞER için
 * (dosya, tarih, isim) — arandığında/kullanıldığında bariz şekilde bozuk bir
 * URL olarak patlasın diye kasıtlı geçersiz bir sentinel. Animasyon/morph
 * target/materyal İSİMLERİ artık PENDING DEĞİL — bunlar bizim belirlediğimiz
 * bir sözleşme (bkz. docs/character-pack-v1-art-guide.md "İsimlendirme
 * Kuralları") ve sanatçının bu isimlerle üretmesi gerekiyor.
 */
export const PENDING_ARTIST_DELIVERY = "PENDING_ARTIST_DELIVERY";
const PENDING = PENDING_ARTIST_DELIVERY;

/**
 * Kedi AI Mascot Pack — ÖĞRENCİ avatarından (yukarıdaki tüm packler)
 * TAMAMEN BAĞIMSIZ bir karakter ailesi: öğrencinin kickboksçu vücudu DEĞİL,
 * Kedi AI'nin KENDİ karakteri (bkz. app/ogrenci/kedi-ai/page.tsx). Bu yüzden
 * `ACTIVE_CHARACTER_PACK_ID`/`getActiveCharacterPack()` mekanizmasının
 * PARÇASI DEĞİL — o fonksiyon sadece öğrenci avatarı için var, bu pack'i
 * sayfa doğrudan `KEDI_MASCOT_PACK` olarak import eder.
 *
 * Görsel referans: kullanıcının yüklediği konsept sanatı (siyah panter,
 * obsidyen zırh, altın detaylar, elektrik mavisi parlayan gözler, kontrollü
 * kırmızı aksan) — 2D bir poster, 3D modele OTOMATİK dönüştürülemez (bkz.
 * analiz raporu). `animations`/`actions` isimleri SOHBET durumlarına göre
 * (workout değil) — idle/listening/thinking/speaking LOOP (activity),
 * success/levelUp TEK SEFERLİK (action, biter→idle'a döner). Bu isimler
 * lib/kediMascotState.ts'teki KediMascotActivity/KediMascotAction ile
 * BİREBİR eşleşir.
 *
 * VARLIK YOK — model PENDING_ARTIST_DELIVERY sentinel'ine işaret ediyor,
 * gerçek bir 3D sanatçıdan panter modeli sipariş edilene kadar
 * app/ogrenci/kedi-ai/page.tsx bu pack'i MOUNT ETMEZ (2D KediAvatar
 * placeholder'ı gösterir — bkz. o sayfadaki readiness kontrolü). Gerçek GLB
 * geldiğinde: (1) public/assets/character-packs/kedi-mascot/model.glb'ye
 * teslim edilir, (2) aşağıdaki `model.url` zaten bu yolu gösteriyor (satır
 * değişmez), (3) SADECE `metadata.artist` PENDING'den gerçek isme çevrilir —
 * sayfa bunu okuyup otomatik olarak 3D render'a geçer, başka HİÇBİR kod
 * değişikliği gerekmez.
 */
export const KEDI_MASCOT_PACK: CharacterPackManifest = {
  id: "kedi-mascot-v1",
  label: "Kedi AI — Panter Maskotu (varlık bekleniyor)",
  stage: "production",
  version: "1.0.0",
  metadata: {
    name: "Kedi AI Mascot V1",
    artist: PENDING,
    releaseDate: null,
    license: "owned",
    quality: "premium",
    sport: "Kickboxing",
    gender: "unisex",
  },
  model: { url: "/assets/character-packs/kedi-mascot/model.glb", format: "glb" },
  // GÜNCELLENDİ — docs/kedi-mascot-pack-brief.md §3: sipariş, panter anatomisine
  // uygun ama Mixamo-uyumlu humanoid-tarzı bir rig istiyor (jaw/eyes kontrolü
  // dahil) — "other" DEĞİL, diğer tüm packlerle AYNI standart.
  skeletonType: "mixamo-standard",
  animations: {
    idle: "Idle", listening: "Listening", thinking: "Thinking", speaking: "Speaking",
  },
  actions: {
    success: "Success", levelUp: "LevelUp",
  },
  // Göz/zırh emissive glow kontrolü — İSİM SÖZLEŞMESİ docs/kedi-mascot-pack-brief.md
  // §4-5'te KESİNLEŞTİ (bkz. lib/kediMascotState.ts KEDI_MASCOT_MATERIAL_NAMES) —
  // ama GERÇEK GLB'de bu adların birebir var olduğu DOĞRULANANA kadar burası
  // BİLEREK boş bırakıldı (motor kodu da YAZILMADI — gerçek varlık olmadan
  // test edilemeyecek kod "sahte kod" olur ilkesi, bkz. AvatarLODLevel notu).
  // GLB teslim edilince: (1) burası KEDI_MASCOT_MATERIAL_NAMES ile doldurulur,
  // (2) KediMascotStage.tsx'e emissiveIntensity uygulayan küçük bir effect eklenir.
  materials: {},
  cameraPreset: { position: [0, 1.55, 2.4], fov: 32, target: [0, 1.5, 0] },
  lightingPreset: {
    environmentPreset: "night",
    keyLight: { color: "#F5D98A", intensity: 1.5 },   // altın key light
    fillLight: { color: "#38BDF8", intensity: 0.5 },  // elektrik mavisi fill
    ambientIntensity: 0.15,
  },
  effectsPreset: { aura: "electric-blue-pulse" }, // İLERİDE — motor henüz aura render etmiyor
  uiTheme: { accentColor: "#38BDF8" },
};

/**
 * Registry — şu an SADECE Kedi AI mascot pack'i içeriyor. Öğrenci 3D avatar
 * sistemi (MIXAMO_DEV_PACK/HUMAN_RIG_DEV_PACK/KEDI_PREMIUM_MALE_PACK_V1/
 * KEDI_PREMIUM_FEMALE_PACK_V1 + ACTIVE_CHARACTER_PACK_ID/getActiveCharacterPack())
 * "3D Avatar Temizliği" turunda kaldırıldı — öğrenci karakteri artık 2D
 * Dijital Salon sistemiyle (StudentAvatar.tsx/LazyStudentAvatar.tsx)
 * gösteriliyor, bu dosyanın kapsamı dışında. Kedi AI mascot'u (aşağıda)
 * hiç etkilenmedi — KEDI_MASCOT_PACK/CHARACTER_PACKS/isCharacterPackReady
 * bu registry'nin AYNI, dokunulmamış parçaları.
 */
export const CHARACTER_PACKS: Record<string, CharacterPackManifest> = {
  [KEDI_MASCOT_PACK.id]: KEDI_MASCOT_PACK,
};

/** Bu pack gerçek bir 3D varlığa mı işaret ediyor, yoksa hâlâ sanatçı
 * teslimi mi bekliyor? `metadata.artist === PENDING_ARTIST_DELIVERY`
 * kontrolünü tek yerden yapmak için (bkz. app/ogrenci/kedi-ai/page.tsx —
 * placeholder mi gerçek 3D mi göstereceğine bununla karar verir). */
export function isCharacterPackReady(pack: CharacterPackManifest): boolean {
  return pack.metadata.artist !== PENDING_ARTIST_DELIVERY;
}
