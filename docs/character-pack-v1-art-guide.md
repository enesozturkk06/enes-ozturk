# Kedi Premium Character Pack v1 — 3D Art Guide

**Durum:** Sipariş bekleniyor — hiçbir sanat varlığı henüz üretilmedi.
**Kod tarafı:** `lib/avatarPack.ts` → `KEDI_PREMIUM_MALE_PACK_V1` / `KEDI_PREMIUM_FEMALE_PACK_V1` (sözleşme hazır, `PENDING_ARTIST_DELIVERY` sentinel'leriyle işaretli).
**Teslim yeri:** `public/assets/character-packs/premium-male-v1/` ve `premium-female-v1/` (bkz. §8).

Bu belge, bir 3D sanatçıya/stüdyoya sipariş verirken teknik soruların büyük
kısmını en baştan cevaplamak için yazıldı. Buradaki her isim/sayı, kodda
zaten karşılığı olan **gerçek bir sözleşmedir** — keyfi bir öneri değil.

---

## 1. Proje Tanıtımı

**Kedi Life nedir?** Bir kickboks salonu (spor salonu) yönetim uygulamasının
içinde yaşayan, öğrencinin kişisel 3D avatarı. Öğrenci antrenman yaptıkça,
rozet kazandıkça, kilo/kas gelişimi ilerledikçe bu avatar da gelişiyor.
Avatar; öğrencinin profilinde, "Dijital Salon" adlı ortamda (kum torbası,
bench, ring gibi objelerin olduğu sanal bir salon) ve Kedi AI (uygulamanın
yapay zeka koçu) ile etkileşimde görünür.

**Hedef kalite:** "EA Sports UFC / Undisputed / Call of Duty Operator"
seviyesinde yarı-gerçekçi (semi-realistic), premium bir spor karakteri —
karikatürize DEĞİL, oyuncak/mobil-oyun estetiği DEĞİL.

**Hedef platform:** Web tarayıcı (masaüstü + mobil), React Three Fiber /
Three.js WebGL render motoru. **Gerçek zamanlı** render — önceden render
edilmiş video/görsel değil, tarayıcıda canlı 3D sahne.

**Ölçülmüş performans referansı:** Mevcut geliştirme-amaçlı yer tutucu
karakterimiz (11.376 üçgen) production build'de düşük donanım simülasyonunda
(6x CPU throttle) **81 FPS**, masaüstünde **173 FPS** ölçüldü — bkz. §4 poly
bütçesi bu ölçümle doğrudan ilişkili.

---

## 2. Sanat Tarzı

### Referanslar (bu yöne gidin)
- **EA Sports UFC** — kas anatomisi, cilt shader kalitesi, ışık altında gerçekçi görünüm.
- **EA Sports Undisputed** — kickboks/boks ekipmanı (eldiven, şort) detay seviyesi.
- **Call of Duty: Modern Warfare — Operator modelleri** — gerçekçi ama oyun-optimize (aşırı poly değil) yaklaşım, giysi/kumaş detayı.
- **Nike Training Club / spor markası kampanya görselleri** — atletik vücut oranları, "gerçek sporcu" hissi (aşırı kaslı/abartılı değil).

### Olmayacaklar (bu yöne GİTMEYİN)
- **Roblox** tarzı blok/basit şekilli karakterler.
- **Bitmoji** tarzı karikatür/emoji avatarlar.
- **Anime** stilizasyonu (büyük gözler, düzleştirilmiş gölgeleme).
- **Fortnite** tarzı stilize/çizgi film orantıları.

Kısacası: **gerçekçi insan anatomisi + oyun-optimize teknik yapım.** Stilize değil, gerçekçi değil-aşırısı değil — "gerçek bir sporcunun dijital ikizi" hissi.

---

## 3. Anatomi

| | Erkek | Kadın |
|---|---|---|
| Boy | 170–185 cm | 165–175 cm |
| Vücut tipi | Atletik, kickboks fiziği | Atletik, kickboksçu fiziği |
| Omuz genişliği | Orantılı-geniş (dövüşçü duruşu, dar değil) | Orantılı-atletik (aşırı geniş değil) |
| Kas oranı | Görünür ama abartısız — tanımlı karın/kol/sırt kası, "bodybuilder" değil "dövüşçü" | Aynı dil, kadın atletik oranlarında — tonlu, güçlü |
| Yağ oranı | Düşük-orta (sporcu seviyesi) | Düşük-orta (sporcu seviyesi) |
| Yüz | Gerçekçi, nötr/kararlı ifade varsayılan, ~25-32 yaş aralığı görünüm | Gerçekçi, nötr/kararlı ifade varsayılan, ~25-32 yaş aralığı görünüm |
| Kıyafet (v1) | Premium siyah-altın kickboks şortu, premium eldiven (renk `#F5D98A` altın + siyah, bkz. §uiTheme) | Aynı tasarım dili — siyah-altın palet, kickboks şort/üst kombinasyonu |

İki karakter **aynı tasarım dilini** (palet, ekipman kalitesi, duruş enerjisi)
paylaşmalı — biri diğerinin "farklı cinsiyet versiyonu" gibi hissettirmeli,
tamamen ayrı bir tasarım gibi değil.

---

## 4. Teknik Limitler

### Poly (üçgen) bütçesi — LOD başına

| LOD | Mesafe eşiği (motor) | Üçgen hedefi | Kullanım |
|---|---|---|---|
| LOD0 | 0 (yakın) | **~20.000 tri** | Profil sayfası, yakın çekim |
| LOD1 | 8 birim | **~8.000 tri** | Dijital Salon varsayılan kamera mesafesi |
| LOD2 | 16 birim | **~2.000 tri** | Uzak/liste görünümü (ileride) |

> **Not:** Motor şu an `lod` alanını OKUYOR ama mesafe-bazlı otomatik geçiş
> mantığı henüz YAZILMADI (bkz. `lib/avatarPack.ts`'teki `AvatarLODLevel`
> yorum notu) — yani LOD1/LOD2 dosyalarını şimdiden üretmek gelecek için
> yatırım, bugün aktif olarak kullanılmıyor. Sadece **LOD0 (`model.glb`)
> ilk teslimatta ZORUNLU**, LOD1/LOD2 sonra da eklenebilir.

### Texture çözünürlüğü

| Doku | Çözünürlük | Format |
|---|---|---|
| Vücut/yüz (baseColor, normal, ORM) | 2048×2048 | Bkz. §PBR — **PNG veya WebP** |
| İkincil (eldiven, şort, saç) | 1024×1024 | PNG veya WebP |
| LOD1 dokuları | 1024×1024 | PNG veya WebP |
| LOD2 dokuları | 512×512 | PNG veya WebP |

> **KTX2 hakkında önemli not:** KTX2 (Basis Universal) sıkıştırması GPU'da
> daha az bellek kaplar ve dosya boyutu küçültür — uzun vadede doğru hedef.
> Ancak **mevcut render motorumuz henüz KTX2 decoder'ı yüklemiyor**
> (`KTX2Loader` motora kayıtlı değil — kontrol edildi, `node_modules`'te
> teyit edildi). KTX2 formatında teslim edilen bir doku şu an **yüklenemez**.
> Bu yüzden v1 teslimatında **standart PNG/WebP kullanın** (glTF'in yerleşik
> `GLTFLoader`'ı bunları motor değişikliği GEREKMEDEN doğrudan okur). KTX2'ye
> geçiş, motora küçük ama gerçek bir ekleme gerektiren ayrı bir karar —
> istenirse ayrı bir adım olarak planlanabilir.
>
> **Draco / Meshopt geometri sıkıştırması ise ZATEN DESTEKLENİYOR** (motor
> varsayılan olarak ikisini de otomatik çözüyor, `@react-three/drei`
> `useGLTF`'in yerleşik davranışı — kontrol edildi). Draco ile export etmek
> güvenli ve ÖNERİLİR (dosya boyutunu ciddi küçültür, motor tarafında hiçbir
> ek iş gerektirmez).

---

## 5. Rig (İskelet)

**Standart:** Mixamo-uyumlu iskelet (`skeletonType: "mixamo-standard"`,
manifestte sabit).

- Rig, **Mixamo'nun Auto-Rigger** aracıyla (veya Mixamo bone hiyerarşisini
  taklit eden eşdeğer bir yöntemle) oluşturulmalı. Bu, ileride Mixamo
  animasyon paketlerinin retarget edilebilmesini VE bu pack'in kendi
  animasyon setinin gelecekteki başka karakterlere (Character Pack v2+)
  retarget edilebilmesini sağlar.
- **Kesin bone-isimlendirme sözleşmesi henüz koda bağlanmadı** (motor şu an
  bone adlarına değil, animasyon CLIP adlarına bakıyor — bkz. §7). Yani rig
  hiyerarşisi Mixamo-standart olsun yeterli; bone adlarının harfi harfine
  belirli bir listeye uyması bugün için ZORUNLU değil. Emin değilseniz
  teslimden önce bize danışın.
- Rig dosyasının kaynağını (`.fbx` veya `.blend`) GLB'ye ek olarak saklayın
  — ileride bir uyumsuzluk çıkarsa yeniden export gerekebilir.

---

## 6. Blend Shape (Morph Target)

Aşağıdaki isimler **birebir** kullanılmalı (kod bu isimlerle exact-match arıyor):

| Kategori | İsim | Açıklama |
|---|---|---|
| Yüz | `Smile` | Gülümseme |
| Yüz | `BlinkLeft` | Sol göz kırpma |
| Yüz | `BlinkRight` | Sağ göz kırpma |
| Yüz | `BrowFurrow` | Kaş çatma (odaklanma ifadesi) |
| Yüz | `JawOpen` | Çene açma |
| Yüz | `EyeSquint` | Göz kısma |
| Vücut | `BodyFat` | Yağ oranı morph'u (0=tanımlı, 1=daha dolgun) |
| Vücut | `Biceps` | Kas gelişimi morph'u (0=başlangıç, 1=efsane kademesi) |

**Nefes alma (Breathing) blend shape olarak İSTENMİYOR** — göğüs/omuz
hareketi olarak doğrudan `Idle` animasyon clip'inin içine gömülü olmalı
(oyun karakterlerinde standart yaklaşım; ayrı bir nefes morph'u aynı bölgeyi
hem animasyon hem morph'un yönetmeye çalışmasına yol açar).

---

## 7. Animasyon İsimleri

### Faz 1 — ŞİMDİ teslim edilecek, ZATEN KODA BAĞLI

Motor bu isimleri `AnimationClip.findByName()` ile **birebir** arıyor —
farklı bir isim kullanılırsa o aktivite sessizce `Idle`'a düşer.

| Clip adı | AvatarActivity | Açıklama |
|---|---|---|
| `Idle` | idle | Varsayılan bekleme duruşu (nefes alma buraya gömülü) |
| `Guard` | guard | Kickboks gard pozisyonu |
| `ShadowBox` | shadowbox | Gölge boksu döngüsü |
| `JumpRope` | jumprope | İp atlama döngüsü |
| `BagWork` | bagwork | Kum torbasına vurma döngüsü |
| `Stretch` | stretch | Esneme |
| `DrinkWater` | drink | Su içme |
| `CheckPhone` | phone | Telefona bakma |

**Evolution Pack varyantları** (bkz. `lib/avatarEvolution.ts` XP kademeleri —
starter/bronze/silver/gold/diamond/legend) — sadece silver'dan itibaren:

| Clip adı | Hangi kademe | Ne zaman oynar |
|---|---|---|
| `ConfidentSilver` | silver | Yüz ifadesi varyantı |
| `ConfidentGold` | gold | Yüz ifadesi varyantı |
| `IdleConfidentGold` | gold | Duruş varyantı (Idle yerine) |
| `ConfidentDiamond` | diamond | Yüz ifadesi varyantı |
| `IdleConfidentDiamond` | diamond | Duruş varyantı |
| `GuardConfidentDiamond` | diamond | Gard varyantı |
| `ProudLegend` | legend | Yüz ifadesi varyantı |
| `IdleChampionLegend` | legend | Duruş varyantı — şampiyon duruşu |
| `GuardChampionLegend` | legend | Gard varyantı — şampiyon duruşu |
| `BodyLanguageChampionLegend` | legend | Genel vücut dili varyantı |

### Yüz animasyon clip'leri ("kişilik" sistemi için)

| Clip adı | Ne zaman kullanılacak |
|---|---|
| `Greet` | Uygulama açıldığında, Kedi AI karşılama anı |
| `Focus` | Antrenman başlarken |
| `Tired` | Seans bitiminde |
| `Happy` | Yeni rozet açıldığında |

### Activity (döngü) vs Action (tek seferlik) ayrımı

Kedi Life iki farklı animasyon katmanı kullanır — bu ayrım `lib/types.ts`
(`AvatarActivity` / `AvatarAction`) ve `lib/avatarPack.ts`
(`animations` / `actions`) içinde koda da yansıtıldı:

- **Activity** (yukarıdaki §Faz 1 tablosu) — avatar başka bir activity'ye
  geçene kadar SÜREKLİ tekrar eden döngüler (Idle, Guard, BagWork...).
- **Action** (aşağıdaki tablo) — TEK SEFERLİK hareketler. Bir action, o an
  hangi activity'de olunursa olunsun onun ÜZERİNE biner, bir kez oynar,
  bitince avatar kaldığı activity'ye geri döner:

  ```
  Idle → Jab → Idle
  BagWork → Hook → BagWork
  ```

  Bu sayede döngüler ve tek seferlik hareketler render katmanında hiç
  karışmaz ve ileride kombo sistemleri (Idle→Jab→Cross→Idle) doğal olarak
  eklenebilir.

> **Motor durumu:** `actions` alanı manifestte hazır ve isimler aşağıda
> kesinleşti — ama motor bu clip'i "bir kez oynat, bitince activity'ye dön"
> şeklinde ÇALIŞTIRMA mantığını henüz içermiyor (bilerek — `AvatarLODLevel`
> için de geçerli olan aynı ilke: gerçek bir action clip'i elimize
> geçmeden bu mantığı yazıp test etmek "sahte kod" olurdu). Bu turda
> sipariş etmek yine de doğru — aynı prodüksiyon oturumunda üretmek, ileride
> ikinci bir tur açmaktan çok daha ucuz.

### Faz 3 — Action clip'leri (bu turda sipariş edin)

| Clip adı | AvatarAction | Açıklama |
|---|---|---|
| `Jab` | jab | Düz yumruk (ön el) |
| `Cross` | cross | Düz yumruk (arka el) |
| `Hook` | hook | Kroşe |
| `Uppercut` | uppercut | Alttan vuruş |
| `LowKick` | lowKick | Alt seviye tekme |
| `HighKick` | highKick | Üst seviye tekme |
| `FrontKick` | frontKick | Ön tekme |
| `Knee` | knee | Diz vuruşu |
| `Slip` | slip | Baş kaçırma |
| `Duck` | duck | Eğilme |
| `Victory` | victory | Zafer pozu |
| `Defeat` | defeat | Kaybetme/hayal kırıklığı pozu |
| `Celebration` | celebration | Kutlama (rozet/başarı anı) |

---

## 8. Dosya Yapısı

```
public/assets/character-packs/premium-male-v1/
  model.glb          ← ZORUNLU. Mesh + rig + TÜM Faz 1 (activity) VE Faz 3
                         (action) animasyon clip'leri TEK dosyada (motor tek
                         bir yükleme çağrısı yapıyor, ayrı animasyon
                         dosyalarını BİRLEŞTİRMİYOR).
  model-lod1.glb      ← opsiyonel (bkz. §4).
  model-lod2.glb      ← opsiyonel.
  preview.webp        ← opsiyonel, UI önizleme/thumbnail.
  manifest.json        ← teslimat checklist'i (bu klasörde zaten var, doldurun).
  animations/         ← opsiyonel, kaynak/çalışma dosyaları (.fbx/.blend) — arşiv.
  textures/            ← opsiyonel, ham doku kaynakları — arşiv (model.glb'ye gömülü olmalı).
```

Kadın karakter için birebir aynı yapı: `public/assets/character-packs/premium-female-v1/`.

Tam klasör kuralları: `public/assets/character-packs/README.md`.

---

## 9. PBR Kuralları

- **Metalness/Roughness** iş akışı (glTF standardı — Specular/Glossiness DEĞİL).
- Doku kanalları: `baseColor` (albedo), `normal`, `metallicRoughness` (glTF
  standart paketleme: G kanalı=roughness, B kanalı=metalness — tek dosyada birleşik).
- Cilt: SSS (subsurface scattering) shader'ı GEREKMİYOR — standart PBR
  yeterli (motor SSS desteklemiyor, gereksiz karmaşıklık).
- Saç: kart-tabanlı (card-based) saç, gerçek strand simülasyonu DEĞİL
  (performans bütçesi — bkz. §4).
- Malzeme sayısı: karakter başına makul bir üst sınır olarak **6-8 malzeme
  slotu** (cilt, yüz, saç, şort, eldiven, ayakkabı gibi) — aşırı
  parçalanmış malzeme sayısı draw call'ları artırır.

---

## 10. Teslim Kontrol Listesi (sanatçı, göndermeden önce)

- [ ] Polygon sayısı LOD0 için ~20k civarında (bkz. §4)
- [ ] Texture çözünürlükleri §4'teki tabloya uygun, format PNG/WebP (KTX2 DEĞİL — bkz. §4 not)
- [ ] UV katmanları düzgün, çakışma/gerilme yok
- [ ] Rig Mixamo-uyumlu, T-pose/A-pose temiz
- [ ] Mixamo'ya (veya eşdeğer bir retarget testine) yüklenip test edildi
- [ ] GLB export, Draco sıkıştırma AÇIK (bkz. §4 — güvenli, önerilir)
- [ ] Tüm Faz 1 animasyon clip'leri §7'deki isimlerle BİREBİR eşleşiyor
- [ ] Tüm blend shape'ler §6'daki isimlerle BİREBİR eşleşiyor
- [ ] `manifest.json` checklist'i dolduruldu

## 11. Kabul Kriterleri (teslim alan taraf kontrol eder)

- [ ] Tarayıcıda gerçek zamanlı render 60 FPS'e yakın (referans: mevcut yer
      tutucu karakter benzer poly sayısında production'da 81 FPS ölçüldü —
      bkz. §1)
- [ ] Bozuk/ters normal vertex yok
- [ ] T-pose/rig düzgün, deformasyon/burkulma yok
- [ ] Tüm Faz 1 animasyonlar sorunsuz oynuyor, clip adları eşleşiyor
- [ ] Blend shape'ler gerçekten tetikleniyor (Three.js `morphTargetInfluences` üzerinden doğrulanır)
- [ ] Texture hatası yok (bozuk UV, görünür seam, sıkıştırma artefaktı)
- [ ] Mobil cihazda (gerçek veya throttle simülasyonu) test edildi, kabul edilebilir FPS
