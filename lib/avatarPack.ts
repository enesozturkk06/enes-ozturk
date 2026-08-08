/**
 * lib/avatarPack.ts — Kedi Life v2: Character Pack sözleşmesi.
 *
 * Katman mimarisi:
 *   Kedi Character Engine (AvatarEngine3D.tsx — pack'e tamamen kör render motoru)
 *   ↓ okur
 *   Character Pack (bu dosya — bir karakterin TÜM deneyimini taşıyan paket:
 *     model, animasyon, LOD, materyal, morph target, yüz animasyonu, kamera,
 *     ışık, efekt, ses profili)
 *   ↓ + öğrencinin kişisel seçimleri/evrim durumu ile birleşir
 *   Avatar (belirli bir öğrencinin o pack'le render edilmiş hali)
 *   ↓
 *   Animasyon (AvatarActivity state machine)
 *   ↓ içinde yaşar
 *   Kedi Life (Dijital Salon vb.)
 *   ↓ gözlemler/yorumlar
 *   Kedi AI
 *
 * Yeni bir karakter paketi eklemek SADECE bu dosyaya yeni bir
 * `CharacterPackManifest` sabiti eklemek + `ACTIVE_CHARACTER_PACK_ID`'yi
 * güncellemek demektir — Engine'de veya herhangi bir sayfada TEK SATIR
 * bile değişmez.
 *
 * Zincir: MIXAMO_DEV_PACK (şu an aktif, geçici) → KEDI_PREMIUM_MALE_PACK_V1 /
 * KEDI_PREMIUM_FEMALE_PACK_V1 (bize ait, nihai — sözleşmesi hazır, gerçek
 * varlıklar bir 3D sanatçıdan sipariş edilecek; Sketchfab/Mixamo gibi üçüncü
 * taraf pazaryeri varlıkları KULLANILMAYACAK — hesap girişi duvarları
 * yüzünden otomatikleştirilemiyorlardı ve zaten kalıcı olmayacaktı).
 *
 * Motor (AvatarEngine3D.tsx, LazyAvatarEngine3D.tsx, useAdaptiveQuality/
 * useInView/useDocumentVisible) STABLE kabul edildi (2026-08-06) — bundan
 * sonraki geliştirme SADECE bu dosyada yeni Character Pack eklemek/
 * doldurmak şeklinde olacak, motor dosyalarına dokunulmayacak.
 *
 * Bu, saf veri/tip dosyasıdır — render kodu (React/Three.js) İÇERMEZ.
 */
import type { AvatarActivity, AvatarAction, AvatarExpression } from "./types";

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
  /** AvatarActivity → GLB içindeki animasyon clip adı. Bunlar LOOP'lardır —
   * avatar başka bir activity'ye geçene kadar sürekli tekrar eder. Pack'in
   * HER aktiviteyi desteklemesi ZORUNLU değil — Engine, eksik bir aktivite
   * için `idle`'a (o da yoksa hiçbir şeye) sessizce düşer. */
  animations: Partial<Record<AvatarActivity, string>>;
  /** AvatarAction → GLB içindeki animasyon clip adı. Bunlar TEK SEFERLİKTİR
   * (jab/cross/hook gibi darbeler, victory/defeat/celebration gibi
   * sonuçlar) — `animations`'DAN BİLEREK AYRI bir alan: bir action geçerli
   * activity LOOP'unun ÜZERİNE biner, bitince avatar o activity'ye geri
   * döner (Idle→Jab→Idle, BagWork→Hook→BagWork gibi). Motor bu oynatma
   * mantığını (tek seferlik oynat + activity'ye dön) HENÜZ UYGULAMIYOR —
   * bkz. AvatarLODLevel'daki "test edilebilecek gerçek varlık gelene kadar
   * yazılmayacak" ilkesiyle aynı sebep: gerçek action clip'i gelmeden bu
   * mantık test edilemez. Alan burada, sözleşme hazır; oynatma mantığı
   * Faz 3 (Animasyon Pack) içeriği geldiğinde eklenecek. */
  actions?: Partial<Record<AvatarAction, string>>;
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
 * Geliştirme/POC karakteri — TAMAMEN GEÇİCİ. three.js'in resmi örnek deposundaki
 * herkese açık, telifsiz "Soldier.glb" test varlığı (Mixamo'nun kendisine
 * programatik erişim yok — mixamo.com indirme için Adobe hesabı girişi
 * gerektiriyor).
 *
 * GLB'nin gerçek animasyon clip'leri doğrudan dosyadan okunarak doğrulandı:
 * Idle, Walk, Run, TPose. `jumprope`/`bagwork` eşlemeleri SEMANTİK OLARAK
 * DOĞRU DEĞİL — sadece crossfade mekanizmasının gerçek, birbirinden farklı
 * iki clip arasında çalıştığını kanıtlamak için geçici bir eşleme.
 *
 * cameraPreset/lightingPreset/uiTheme/vb. KASITLI OLARAK belirtilmedi —
 * Engine'in kendi varsayılanlarını kullandığını da bu pack üzerinden
 * doğruluyoruz (her pack'in her alanı doldurması ZORUNLU değil).
 */
export const MIXAMO_DEV_PACK: CharacterPackManifest = {
  id: "mixamo-dev-placeholder",
  label: "Geliştirme Karakteri (geçici)",
  stage: "dev",
  version: "1.0.0",
  metadata: {
    name: "Mixamo Dev Placeholder",
    artist: "three.js örnek deposu (Soldier.glb)",
    releaseDate: null,
    license: "public-domain",
    quality: "dev",
    sport: "Kickboxing",
    gender: "unisex",
  },
  model: { url: "https://threejs.org/examples/models/gltf/Soldier.glb", format: "glb" },
  skeletonType: "mixamo-standard",
  animations: {
    idle: "Idle",
    jumprope: "Walk",  // GEÇİCİ/semantik değil — sadece crossfade testi için
    bagwork: "Run",    // GEÇİCİ/semantik değil — sadece crossfade testi için
  },
};

/**
 * Geliştirme karakteri #2 — TAMAMEN GEÇİCİ, `KEDI_PREMIUM_MALE_PACK_V1` İLE
 * KARIŞTIRILMAMALI. Kaynak: Sketchfab "Human Models Set - Male/Female
 * (Rigged)" (CC BY) — projenin çok daha önceki bir aşamasında "doğrulama
 * pack'i" adayı olarak belirlenip sonra sanatçıya sipariş kararıyla terk
 * edilmiş olan AYNI dosya. Nihai karakter OLARAK KULLANILMIYOR (Art
 * Guide'daki hiçbir teknik gereksinimi karşılamıyor — sıfır animasyon, sıfır
 * doku, Mixamo-standart olmayan rig) — sadece Soldier.glb'den daha gerçekçi
 * görünen, gerçek bir GLB üzerinde Character Pack/Loader/Camera/LOD borusunu
 * test etmek için kullanılıyor.
 *
 * `public/assets/character-packs/dev-human-rig/model.glb` orijinal
 * `HumanModels.glb`'den SADECE erkek+rigli mesh ("Man (Rig)" node'u)
 * ayıklanarak üretildi (orijinalde erkek+kadın+HighPoly/NonRig varyantları
 * aynı sahnede yan yana duruyordu — bkz. o klasördeki README).
 *
 * `animations: {}` BİLEREK BOŞ — kaynak dosyada hiç animasyon clip'i yok.
 * Kullanıcının planı: bu rig manuel olarak Mixamo'ya yüklenip Idle/Walking/
 * Guard/Jab/Cross/Hook/Victory gibi clip'ler indirilecek, sonra bu alan
 * doldurulacak — o ana kadar avatar bind-pose'da durur (Engine `!clipName`
 * için sessizce hiçbir şey oynatmaz, hata vermez).
 */
export const HUMAN_RIG_DEV_PACK: CharacterPackManifest = {
  id: "human-rig-dev",
  label: "Geliştirme Karakteri #2 — rigli insan modeli (geçici)",
  stage: "dev",
  version: "1.0.4", // Guard + Thinking eklendi sonrası bump (cache-busting)
  metadata: {
    name: "Human Rig Dev Pack",
    artist: "PENDING_ARTIST_DELIVERY", // Sketchfab sayfasından teyit edilip doldurulacak
    releaseDate: null,
    license: "cc-by",
    quality: "dev",
    sport: "Kickboxing",
    gender: "male",
  },
  model: { url: "/assets/character-packs/dev-human-rig/model.glb", format: "glb" },
  // GÜNCELLENDİ (2026-08-07): model.glb artık orijinal Sketchfab/Rigify mesh DEĞİL —
  // Mixamo'dan indirilen "Idle.fbx" ("with skin") mesh+iskeleti temel alındı,
  // üzerine 11 animasyon clip'i (aşağıda) birleştirildi (tarayıcıda FBXLoader+
  // GLTFExporter ile, motor koduna dokunulmadan). Gerçek bone adları
  // "mixamorig1..." — Mixamo-standart, doğrulandı.
  skeletonType: "mixamo-standard",
  /** Kaynak: kullanıcının Mixamo'dan indirdiği FBX dosyaları (gerçek clip adları
   * "mixamo.com" idi — Mixamo'nun bilinen tuhaflığı, tüm dosyalarda aynı isim,
   * kullanışsız — bu yüzden export sırasında BURADAKİ isimlerle yeniden
   * adlandırıldı, tahmin edilmedi). */
  animations: {
    idle: "Idle",
    guard: "Guard", // "Guard" adında dosya yoktu — bkz. aşağıdaki not
    stretch: "Stretch",
    jumprope: "JumpRope",
    drink: "DrinkWater",
  },
  /** "Kicking.fbx" → FrontKick, "Bouncing Fight Idle.fbx" → Guard: İKİSİ DE
   * ELEME YOLUYLA eşlendi (istenen isimde dosya yoktu, en yakın aday buydu) —
   * gerçekten doğru pozu mu gösterdikleri görsel doğrulandı (canlı test). */
  actions: {
    jab: "Jab",
    cross: "Cross",
    hook: "Hook",
    uppercut: "Uppercut",
    frontKick: "FrontKick",
    victory: "Victory",
    defeat: "Defeat",
  },
  /** "Thinking" Mixamo'dan TAM VÜCUT bir poz clip'i olarak geldi (blend
   * shape/yüz rig'i YOK bu karakterde) — bu yüzden facialAnimations burada
   * da AvatarEngine3D'nin action'larla AYNI "bir kez oynat, activity'ye dön"
   * mekanizmasını kullanacak (bkz. AvatarEngine3D.tsx `expression` prop'u). */
  facialAnimations: {
    thinking: "Thinking",
  },
  // Cosmetic System V1 — gerçek GLB'den doğrulanmış Mixamo kemik adları (bkz.
  // model.glb JSON chunk'ının doğrudan okunmasıyla teyit edildi). "hips" ==
  // mevcut `waist` soketi (aynı vücut bölgesi için AvatarBoneSocket'te zaten
  // bir değer var, yeni bir soket türü icat edilmedi).
  attachmentSockets: {
    hand_l: "mixamorig1LeftHand",
    hand_r: "mixamorig1RightHand",
    foot_l: "mixamorig1LeftFoot",
    foot_r: "mixamorig1RightFoot",
    head: "mixamorig1Head",
    waist: "mixamorig1Hips",
  },
  requiresAttribution: {
    text: "Human Models Set by [artist — Sketchfab sayfasından teyit edilecek]",
    url: "https://sketchfab.com/3d-models/human-models-set-malefemale-rigged-7311fcfdc03e4234900eeced42a1e669",
  },
};

/**
 * Sanatçıdan gelmesi gereken ama henüz teslim edilmemiş bir DEĞER için
 * (dosya, tarih, isim) — arandığında/kullanıldığında bariz şekilde bozuk bir
 * URL olarak patlasın diye kasıtlı geçersiz bir sentinel. Animasyon/morph
 * target/materyal İSİMLERİ artık PENDING DEĞİL — bunlar bizim belirlediğimiz
 * bir sözleşme (bkz. docs/character-pack-v1-art-guide.md "İsimlendirme
 * Kuralları") ve sanatçının bu isimlerle üretmesi gerekiyor.
 */
const PENDING = "PENDING_ARTIST_DELIVERY";

/** public/ altında sunulan, sanatçı-teslim klasör standardı (bkz.
 * public/assets/character-packs/README.md). Next.js public/ dosyalarını kök
 * URL'den sunar, yani bu path AYNI ZAMANDA gerçek runtime URL'idir. */
const MALE_PACK_DIR = "/assets/character-packs/premium-male-v1";
const FEMALE_PACK_DIR = "/assets/character-packs/premium-female-v1";

/** Character Pack v1 — animasyon/yüz/morph İSİM SÖZLEŞMESİ. İki pack (erkek/
 * kadın) AYNI isimleri kullanır — böylece ileride "Character Pack v2" farklı
 * bir bedene aynı animasyon setini retarget ederse isimler zaten eşleşir.
 * Kaynak: docs/character-pack-v1-art-guide.md. */
const V1_ANIMATION_NAMES = {
  idle: "Idle", guard: "Guard", shadowbox: "ShadowBox", jumprope: "JumpRope",
  bagwork: "BagWork", stretch: "Stretch", drink: "DrinkWater", phone: "CheckPhone",
} as const;
/** Expression System clip'leri — bkz. lib/kediExpression.ts (hangi olay hangi
 * expression'ı tetikliyor) ve AvatarExpression (lib/types.ts). */
const V1_FACIAL_NAMES = {
  greet: "Greet", happy: "Happy", proud: "Proud", sad: "Sad",
  focus: "Focus", tired: "Tired", thinking: "Thinking", talking: "Talking",
} as const;
/** Faz 3 (Animasyon Pack) — tek seferlik action clip'leri. Sipariş edilmesi
 * gereken isimler bunlar; oynatma mantığı henüz motorda yok (bkz.
 * CharacterPackManifest.actions yorumu). */
const V1_ACTION_NAMES = {
  jab: "Jab", cross: "Cross", hook: "Hook", uppercut: "Uppercut",
  lowKick: "LowKick", highKick: "HighKick", frontKick: "FrontKick", knee: "Knee",
  slip: "Slip", duck: "Duck",
  victory: "Victory", defeat: "Defeat", celebration: "Celebration",
} as const;
/** Blend shape sözleşmesi — bkz. docs/character-pack-v1-art-guide.md "Blend Shape".
 * Nefes alma KASITLI OLARAK burada YOK — o bir morph değil, "Idle" clip'inin
 * içine gömülü küçük bir göğüs/omuz hareketi olarak animasyonla çözülüyor
 * (oyun karakterlerinde standart yaklaşım; ayrı bir "Breathing" morph'u aynı
 * anda IKI sistemin (mixer + morph) aynı bölgeyi yönetmeye çalışmasına yol açar). */
const V1_MORPH_NAMES = {
  muscle: { bodyFat: "BodyFat", biceps: "Biceps" },
  face: { smile: "Smile", blinkLeft: "BlinkLeft", blinkRight: "BlinkRight", browFurrow: "BrowFurrow", jawOpen: "JawOpen", eyeSquint: "EyeSquint" },
} as const;
/** Evolution Pack varyant clip'leri — sadece tierIndex 2-5'te devreye girer
 * (bkz. evolutionStages altındaki yorum). */
const V1_EVOLUTION_ANIMATION_NAMES = {
  facialExpression: { 2: "ConfidentSilver", 3: "ConfidentGold", 4: "ConfidentDiamond", 5: "ProudLegend" },
  postureAnimation: { 3: "IdleConfidentGold", 4: "IdleConfidentDiamond", 5: "IdleChampionLegend" },
  guardAnimation: { 4: "GuardConfidentDiamond", 5: "GuardChampionLegend" },
  bodyLanguageAnimation: { 5: "BodyLanguageChampionLegend" },
} as const;
/** Equipment System kategorilerinin hangi iskelet soketine bağlandığı (bkz.
 * lib/kediEquipment.ts) — iki v1 pack AYNI soket eşlemesini kullanır. */
const V1_COSMETIC_SLOTS: Partial<Record<CosmeticSlotType, CosmeticSlotDef>> = {
  gloves: { sockets: ["hand_l", "hand_r"] },
  handWrap: { sockets: ["hand_l", "hand_r"] },
  shoes: { sockets: ["foot_l", "foot_r"] },
  hoodie: { sockets: ["torso"] },
  shorts: { sockets: ["waist"] },
  belt: { sockets: ["waist"] },
  helmet: { sockets: ["head"] },
  mouthGuard: { sockets: ["head"] },
};
/** lib/avatarEvolution.ts SKIN_TONES/HAIR_COLORS ile BİREBİR aynı hex değerler
 * — 2D katalogdaki rengin 3D materyaldeki karşılığı (gerçek PBR doku varyantı
 * gelene kadar, tint/multiply rengi olarak kullanılabilir). */
const V1_SKIN_TONES = { "tone-1": "#F5CBA7", "tone-2": "#E0AC80", "tone-3": "#C68863", "tone-4": "#A9673F", "tone-5": "#7A4A2B", "tone-6": "#4A2E1D" };
const V1_HAIR_COLORS = { black: "#0F0F12", brown: "#4A2E1D", blonde: "#D4A843", red: "#A53E2B", gray: "#9CA3AF", neon: "#38BDF8" };

/**
 * Kedi Premium — Erkek (Character Pack v1). SÖZLEŞME HAZIR, VARLIK YOK.
 * Bir 3D sanatçıya sipariş edilecek, bize ait, kalıcı karakter (bkz. plan —
 * Sketchfab/Mixamo pazaryeri değil, komisyonlu özel üretim). Tam sipariş
 * briefi: docs/character-pack-v1-art-guide.md.
 *
 * AKTİF DEĞİL — ACTIVE_CHARACTER_PACK_ID hâlâ MIXAMO_DEV_PACK'i gösteriyor.
 * Sanatçıdan dosyalar gelince: (1) public/assets/character-packs/premium-male-v1/
 * klasörüne Art Guide'daki dosya adlarıyla teslim edilir, (2) kalan PENDING
 * değerleri (metadata.artist, metadata.releaseDate) doldurulur, (3)
 * ACTIVE_CHARACTER_PACK_ID bu pack'in id'sine çevrilir. Engine'de TEK SATIR
 * değişmeyecek.
 */
export const KEDI_PREMIUM_MALE_PACK_V1: CharacterPackManifest = {
  id: "kedi-premium-male-v1",
  label: "Kedi Premium — Erkek (varlık bekleniyor)",
  stage: "production",
  version: "1.0.0",
  metadata: {
    name: "Kedi Premium Male V1",
    artist: PENDING,
    releaseDate: null,
    license: "owned",
    quality: "premium",
    sport: "Kickboxing",
    gender: "male",
  },
  model: { url: `${MALE_PACK_DIR}/model.glb`, format: "glb" },
  // LOD0/1/2 hedefleri için bkz. docs/character-pack-v1-art-guide.md "Teknik Limitler" (~20k/8k/2k tri).
  lod: [
    { distance: 0,  url: `${MALE_PACK_DIR}/model.glb` },       // LOD0 — yakın/yakın çekim
    { distance: 8,  url: `${MALE_PACK_DIR}/model-lod1.glb` },  // LOD1 — orta mesafe (Dijital Salon varsayılan kamera)
    { distance: 16, url: `${MALE_PACK_DIR}/model-lod2.glb` },  // LOD2 — uzak/liste görünümü
  ],
  skeletonType: "mixamo-standard",

  animations: { ...V1_ANIMATION_NAMES },
  actions: { ...V1_ACTION_NAMES },
  /** "Kişilik" vizyonu (bkz. plan) — giriş karşılama, antrenman odağı,
   * seans-sonu yorgunluk, rozet-açılış sevinci. */
  facialAnimations: { ...V1_FACIAL_NAMES },

  materials: {
    // Anahtarlar lib/avatarEvolution.ts SKIN_TONES/HAIR_COLORS katalog id'leriyle BİREBİR aynı.
    skinTones: { ...V1_SKIN_TONES },
    hairColors: { ...V1_HAIR_COLORS },
  },
  morphTargets: { muscle: { ...V1_MORPH_NAMES.muscle }, face: { ...V1_MORPH_NAMES.face } },
  cosmeticSlots: { ...V1_COSMETIC_SLOTS },

  // Evolution Pack — key = lib/avatarEvolution.ts EvolutionTier.tierIndex (0=starter..5=legend).
  // muscleMorphWeight mevcut EvolutionTier.muscleDefinition formülüyle (tierIndex/5) birebir tutarlı.
  evolutionStages: {
    0: { muscleMorphWeight: 0 },     // starter — varsayılan duruş/ifade
    1: { muscleMorphWeight: 0.2 },   // bronze
    2: { muscleMorphWeight: 0.4, facialExpression: V1_EVOLUTION_ANIMATION_NAMES.facialExpression[2] }, // silver
    3: { muscleMorphWeight: 0.6, facialExpression: V1_EVOLUTION_ANIMATION_NAMES.facialExpression[3], postureAnimation: V1_EVOLUTION_ANIMATION_NAMES.postureAnimation[3] }, // gold
    4: { muscleMorphWeight: 0.8, facialExpression: V1_EVOLUTION_ANIMATION_NAMES.facialExpression[4], postureAnimation: V1_EVOLUTION_ANIMATION_NAMES.postureAnimation[4], guardAnimation: V1_EVOLUTION_ANIMATION_NAMES.guardAnimation[4] }, // diamond
    5: { muscleMorphWeight: 1,   facialExpression: V1_EVOLUTION_ANIMATION_NAMES.facialExpression[5], postureAnimation: V1_EVOLUTION_ANIMATION_NAMES.postureAnimation[5], guardAnimation: V1_EVOLUTION_ANIMATION_NAMES.guardAnimation[5], bodyLanguageAnimation: V1_EVOLUTION_ANIMATION_NAMES.bodyLanguageAnimation[5] }, // legend
  },

  cameraPreset: { position: [0, 1.4, 3.2], fov: 36, target: [0, 1, 0] },
  lightingPreset: {
    environmentPreset: "studio",
    keyLight: { color: "#F5D98A", intensity: 1.4 },
    fillLight: { color: "#3B3B45", intensity: 0.3 },
    ambientIntensity: 0.2,
  },
  // İLERİDE — hooks/useKediVoice.ts henüz pack-özel ses tercihini OKUMUYOR (kendi
  // sabit tr-TR önceliğini kullanıyor); bu alan o entegrasyon yapılınca anlam kazanacak.
  voicePreset: { preferredVoiceNameContains: "male" },
  uiTheme: { accentColor: "#F59E0B" },
};

/**
 * Kedi Premium — Kadın (Character Pack v1). Erkek pack'le AYNI tasarım dili
 * (siyah-altın palet, aynı kamera/ışık/UI teması, AYNI animasyon/morph isim
 * sözleşmesi) — atletik/kickboksçu fiziği. Ayrıntılar: üstteki erkek pack'in
 * notları + docs/character-pack-v1-art-guide.md.
 */
export const KEDI_PREMIUM_FEMALE_PACK_V1: CharacterPackManifest = {
  id: "kedi-premium-female-v1",
  label: "Kedi Premium — Kadın (varlık bekleniyor)",
  stage: "production",
  version: "1.0.0",
  metadata: {
    name: "Kedi Premium Female V1",
    artist: PENDING,
    releaseDate: null,
    license: "owned",
    quality: "premium",
    sport: "Kickboxing",
    gender: "female",
  },
  model: { url: `${FEMALE_PACK_DIR}/model.glb`, format: "glb" },
  lod: [
    { distance: 0,  url: `${FEMALE_PACK_DIR}/model.glb` },
    { distance: 8,  url: `${FEMALE_PACK_DIR}/model-lod1.glb` },
    { distance: 16, url: `${FEMALE_PACK_DIR}/model-lod2.glb` },
  ],
  skeletonType: "mixamo-standard",

  animations: { ...V1_ANIMATION_NAMES },
  actions: { ...V1_ACTION_NAMES },
  facialAnimations: { ...V1_FACIAL_NAMES },

  materials: {
    skinTones: { ...V1_SKIN_TONES },
    hairColors: { ...V1_HAIR_COLORS },
  },
  morphTargets: { muscle: { ...V1_MORPH_NAMES.muscle }, face: { ...V1_MORPH_NAMES.face } },
  cosmeticSlots: { ...V1_COSMETIC_SLOTS },

  evolutionStages: {
    0: { muscleMorphWeight: 0 },
    1: { muscleMorphWeight: 0.2 },
    2: { muscleMorphWeight: 0.4, facialExpression: V1_EVOLUTION_ANIMATION_NAMES.facialExpression[2] },
    3: { muscleMorphWeight: 0.6, facialExpression: V1_EVOLUTION_ANIMATION_NAMES.facialExpression[3], postureAnimation: V1_EVOLUTION_ANIMATION_NAMES.postureAnimation[3] },
    4: { muscleMorphWeight: 0.8, facialExpression: V1_EVOLUTION_ANIMATION_NAMES.facialExpression[4], postureAnimation: V1_EVOLUTION_ANIMATION_NAMES.postureAnimation[4], guardAnimation: V1_EVOLUTION_ANIMATION_NAMES.guardAnimation[4] },
    5: { muscleMorphWeight: 1,   facialExpression: V1_EVOLUTION_ANIMATION_NAMES.facialExpression[5], postureAnimation: V1_EVOLUTION_ANIMATION_NAMES.postureAnimation[5], guardAnimation: V1_EVOLUTION_ANIMATION_NAMES.guardAnimation[5], bodyLanguageAnimation: V1_EVOLUTION_ANIMATION_NAMES.bodyLanguageAnimation[5] },
  },

  cameraPreset: { position: [0, 1.4, 3.2], fov: 36, target: [0, 1, 0] },
  lightingPreset: {
    environmentPreset: "studio",
    keyLight: { color: "#F5D98A", intensity: 1.4 },
    fillLight: { color: "#3B3B45", intensity: 0.3 },
    ambientIntensity: 0.2,
  },
  voicePreset: { preferredVoiceNameContains: "female" },
  uiTheme: { accentColor: "#F59E0B" },
};

/**
 * Registry'de listelenirler (sistem bu iki pack'in VARLIĞINI biliyor) ama
 * ACTIVE_CHARACTER_PACK_ID hâlâ MIXAMO_DEV_PACK'i gösteriyor — bu iki pack
 * gerçek dosyalar public/assets/character-packs/.../model.glb yoluna teslim
 * edilene kadar AKTİF EDİLMEMELİ (edilirse GLTFLoader 404 ile bariz şekilde
 * patlar, sessiz bir bozukluk üretmez — ama yine de erken aktive etmeyin).
 */
export const CHARACTER_PACKS: Record<string, CharacterPackManifest> = {
  [MIXAMO_DEV_PACK.id]: MIXAMO_DEV_PACK,
  [HUMAN_RIG_DEV_PACK.id]: HUMAN_RIG_DEV_PACK,
  [KEDI_PREMIUM_MALE_PACK_V1.id]: KEDI_PREMIUM_MALE_PACK_V1,
  [KEDI_PREMIUM_FEMALE_PACK_V1.id]: KEDI_PREMIUM_FEMALE_PACK_V1,
};

/**
 * TEK KONTROL NOKTASI — sistemin şu an kullandığı karakter paketi. Yeni bir
 * pack aktif edildiğinde SADECE bu satır değişir — Engine'de, hiçbir sayfada
 * değişiklik gerekmez. Sayfalar bu değeri DOĞRUDAN import ETMEMELİ,
 * `getActiveCharacterPack()` üzerinden okumalı.
 *
 * Şu an HUMAN_RIG_DEV_PACK aktif (2026-08-06) — MIXAMO_DEV_PACK'in yerini
 * geçici olarak aldı, çünkü gerçek bir GLB üzerinde test yapmak istiyoruz.
 * KEDI_PREMIUM_MALE_PACK_V1/FEMALE_V1 HÂLÂ sanatçı teslimini bekliyor.
 */
export const ACTIVE_CHARACTER_PACK_ID: string = HUMAN_RIG_DEV_PACK.id;

export function getActiveCharacterPack(): CharacterPackManifest {
  return CHARACTER_PACKS[ACTIVE_CHARACTER_PACK_ID] ?? MIXAMO_DEV_PACK;
}
