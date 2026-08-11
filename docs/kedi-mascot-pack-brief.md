# Kedi AI Mascot Pack — 3D Art Guide

**Durum:** Sipariş bekleniyor — hiçbir sanat varlığı henüz üretilmedi.
**Kod tarafı:** `lib/avatarPack.ts` → `KEDI_MASCOT_PACK` (sözleşme hazır, `PENDING_ARTIST_DELIVERY` sentinel'iyle işaretli). Durum/animasyon isimleri: `lib/kediMascotState.ts`.
**Teslim yeri:** `public/assets/character-packs/kedi-mascot/` (bkz. §9).
**Görsel referans:** kullanıcının yüklediği konsept sanatı (proje kökünde `a02cd1c9-1d1e-4461-b232-c3e49f035892.png`) — "Kedi AI — Your Personal Fight Coach" panter savaşçı posteri.

> Bu belge, `docs/character-pack-v1-art-guide.md` (öğrenci avatarı için yazılmış brief) ile AYNI amaç ve formatı taşır — ama TAMAMEN AYRI bir karakter ailesi içindir (bkz. o dosyanın kendi notu: Kedi AI mascot'u öğrencinin kickboksçu vücudundan bağımsız). İki belgeyi KARIŞTIRMAYIN.

---

## 1. Karakter Tasarımı

**Karakter:** Premium futuristic black panther / AI fight coach.

Referans görseldeki tasarım dili mümkün olduğunca korunmalı:

- Güçlü erkek panter anatomisi
- Siyah/obsidyen kürk
- Siyah futuristik zırh
- Metalik altın zırh detayları
- Parlayan elektrik mavisi gözler
- Altın boyun/zırh detayları
- Hafif kırmızı detaylar
- Güçlü omuzlar ve göğüs
- Agresif fakat asil ifade
- AAA oyun karakteri kalitesi
- Gerçekçi PBR materyaller
- Premium, sinematik görünüm

**Önemli:** Karakter komik/cartoon kedi OLMAMALI. İnsanlaştırılmış ama gerçekçi bir black panther warrior görünümü isteniyor.

---

## 2. 3D Model

**Format:** `.glb`

**Engine uyumluluğu (doğrulanmış gereksinimler):**
- Three.js / React Three Fiber / React Three Drei
- `GLTFLoader`
- Mixamo-compatible skeleton

**Performans hedefi:** ~20.000 triangle civarı (bkz. `docs/character-pack-v1-art-guide.md` §4'teki ölçülmüş referans — aynı motor, aynı bütçe). Mobilde rahat çalışacak şekilde optimize edilmeli, texture'lar gereksiz büyük olmamalı.

- **Draco compression** — ✅ kullanılabilir, motor destekliyor.
- **Optimized textures / LOD** — gerekirse kullanılabilir.
- **KTX2 KULLANILMAMALI** — mevcut motorda decoder henüz hazır değil (bkz. art-guide §4, aynı kısıt burada da geçerli).

---

## 3. Rig (İskelet)

Karakter kesinlikle **rigged** teslim edilmeli.

Tercihen: **Mixamo-compatible humanoid-style rig** — panter anatomisine uygun şekilde aşağıdakiler kontrol edilebilir olmalı:

`spine · neck · head · shoulders · arms · hands · fingers · legs · feet · jaw · eyes`

Özellikle **jaw/mouth** çok önemli — Kedi AI konuşacak.

*(Kod tarafı: `KEDI_MASCOT_PACK.skeletonType = "mixamo-standard"` olarak ayarlandı — diğer tüm Character Pack'lerle aynı standart.)*

---

## 4. Yüz / Göz Sistemi

Kedi'nin yüzü modelin en önemli kısmı.

Gözler **ayrı materyal** olmalı: `KEDI_EYE_LEFT`, `KEDI_EYE_RIGHT` — **emissive** desteklemeli. Böylece uygulama runtime'da göz ışığını değiştirebilir:

| Durum | Göz davranışı |
|---|---|
| IDLE | Hafif mavi glow |
| LISTENING | Daha güçlü mavi |
| THINKING | Yavaş pulse |
| SPEAKING | Hafif pulse |
| SUCCESS | Mavi + gold |
| LEVEL UP | Güçlü gold + blue glow |

*(Kod tarafı: `lib/kediMascotState.ts` → `KEDI_MASCOT_EYE_GLOW` bu tabloyu renk/şiddet/pulse olarak veri sözleşmesi haline getirdi — çalışma zamanı kodu GLB gelmeden yazılmayacak, bkz. o dosyadaki not.)*

---

## 5. Zırh Materyalleri

Zırh tek parça materyal OLMAMALI. Mümkünse ayrı materyaller:

`Armor_Black · Armor_Gold · Armor_Emissive · Eyes_Blue · Fur_Black`

Böylece efektler sonradan kontrol edilebilir.

> ⚠️ **Netleştirilmesi gereken küçük bir tutarsızlık:** §4 gözler için `KEDI_EYE_LEFT`/`KEDI_EYE_RIGHT` diyor, bu listede AYRICA `Eyes_Blue` geçiyor. Sanatçıya sipariş verilmeden önce şu netleşmeli: `Eyes_Blue` ayrı bir üçüncü materyal mi (ör. iris/pupil taban rengi, iki göz kutusundan bağımsız), yoksa `KEDI_EYE_LEFT`/`KEDI_EYE_RIGHT`'ın YERİNE mi geçiyor? Kod tarafı (`KEDI_MASCOT_MATERIAL_NAMES`, `lib/kediMascotState.ts`) şu an ÜÇÜNÜ DE saklıyor, tek isme İNDİRİLMEDİ — bu netleşince güncellenecek.

*(Kod tarafı: `lib/kediMascotState.ts` → `KEDI_MASCOT_MATERIAL_NAMES`.)*

---

## 6. Animasyonlar

GLB'nin içinde animation clip'leri olacak. İsimler **tam olarak** şöyle olmalı (kod bu isimlerle `AnimationClip.findByName()` ile exact-match arayacak — bkz. `AvatarEngine3D.tsx`):

| Clip adı | Tür | Loop/Tek seferlik |
|---|---|---|
| `Idle` | Activity | Loop |
| `Listening` | Activity | Loop |
| `Thinking` | Activity | Loop |
| `Speaking` | Activity | Loop |
| `Success` | Action | Tek seferlik → Idle'a döner |
| `LevelUp` | Action | Tek seferlik → Idle'a döner |

*(Kod tarafı: `lib/avatarPack.ts` → `KEDI_MASCOT_PACK.animations`/`.actions` bu isimlerle ZATEN kesinleşti.)*

### Idle
Kedi hafif nefes almalı. Çok hafif: göğüs hareketi, kafa hareketi, göz hareketi. Sonsuz loop.

### Listening
Kullanıcı konuşurken: kafa hafif kullanıcıya yönelir, gözler aktifleşir, hafif dikkat pozisyonu. Loop.

### Thinking
Kedi cevap hazırlarken: hafif kafa hareketi, kısa bakış değişimleri, kontrollü nefes, düşünüyormuş hissi. Loop.

### Speaking
Kedi konuşurken: çene/ağız hareketi, kafa mikro hareketleri, göz hareketi. Loop. **Jaw bone ayrı kontrol edilebilirse ileride gerçek lip-sync mümkün olur.**

### Success
Tek seferlik: küçük baş hareketi, güçlü duruş, göz glow, gold energy. Sonra Idle'a döner.

### LevelUp
En özel animasyon — tek seferlik: başını kaldırma, göğüs açma, güçlü savaşçı duruşu, gözlerin parlaması, gold energy hissi. Sonra Idle'a döner.

---

## 7. Kamera Açısı

Kedi AI ekranında karakter **göğüs/omuz üstünden yukarı ağırlıklı** görünecek. Kullanıcı "bir chatbot avatarı" değil, "karşısında duran bir AI karakteri" hissetmeli — bu yüzden modelin yüzü ve üst gövdesi çok kaliteli olmalı.

*(Kod tarafı: `KEDI_MASCOT_PACK.cameraPreset` bu çerçevelemeye göre ayarlandı, `AvatarEngine3D`'de `lockCamera` ile kullanıcı orbit/zoom/pan YAPAMAZ — sabit, "yaşayan karakter" hissi.)*

---

## 8. Teslimat — Blender Dosyası

Sadece `.glb` teslim edilmemeli. İkisi birden istenir:

- `KediAI_Master.blend`
- `KediAI.glb`

İleride zırh değiştirme, göz rengi, kıyafet, yeni animasyon/yüz ifadesi eklemek için Blender source dosyasına ihtiyaç olabilir.

---

## 9. Teslim Klasörü

```
kedi-ai-3d/
├── KediAI_Master.blend
├── model.glb
├── textures/
│   ├── fur
│   ├── armor
│   ├── gold
│   └── emissive
└── animations/
    └── source files
```

Uygulamaya esas olarak sadece `model.glb` konur → **`public/assets/character-packs/kedi-mascot/model.glb`**.

---

## 10. Model Geldiğinde Ne Değişecek

Mimari zaten hazır — sadece:

1. Dosya `public/assets/character-packs/kedi-mascot/model.glb` yoluna teslim edilir.
2. `lib/avatarPack.ts` → `KEDI_MASCOT_PACK.metadata.artist` alanı `PENDING_ARTIST_DELIVERY`'den gerçek sanatçı ismine çevrilir.
3. (Varsa) §5'teki materyal-adı netleşmesi `KEDI_MASCOT_MATERIAL_NAMES`'e yansıtılır, `KEDI_MASCOT_PACK.materials` doldurulur, emissive-kontrolü uygulayan küçük bir `useEffect` `KediMascotStage.tsx`'e eklenir.

Başka HİÇBİR dosya değişmez — `app/ogrenci/kedi-ai/page.tsx` otomatik olarak 2D placeholder'dan gerçek 3D render'a geçer:

```
KEDI_MASCOT_PACK → model.glb → KediMascotStage → AvatarEngine3D
  → Kedi State (idle/listening/thinking/speaking/success/levelUp) → Kedi AI
```

---

## 11. Hedef Deneyim (kabul kriteri olarak da okunabilir)

> Kullanıcı: "Kedi, bugün ne çalışayım?"
> Kedi'nin gözleri yanıyor → **Listening → Thinking**, panter hafifçe hareket ediyor.
> Kedi: "Bugün teknik günümüz. Son iki antrenmanda kondisyon ağırlıklı çalıştın. Sana 45 dakikalık bir teknik program hazırladım." → **Speaking**
> Ekranda: "🥊 BUGÜNKÜ ANTRENMAN — BAŞLAT →" çıkar.

Bu noktada Kedi AI bir chatbot değil, gerçek bir AI Fight Coach hissi vermeli.

**Sipariş verirken en kritik üç şey:**
1. GLB + rig
2. Yukarıdaki §6 animasyon clip'leri (isimler birebir)
3. Göz/zırh materyallerinin ayrı ve kontrol edilebilir olması (§4-5)
