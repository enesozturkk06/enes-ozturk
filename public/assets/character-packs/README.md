# Character Pack SDK

Bir 3D sanatçıya/stüdyoya sipariş verirken teslim edilecek **tek paket** budur.
Sanatçı bu klasörü doldurur, kod tarafına hiç dokunmaz.

**SDK içeriği:**
1. Bu README — klasör standardı (aşağıda).
2. `docs/character-pack-v1-art-guide.md` — tam sanat/teknik brief (anatomi,
   poly/texture hedefleri, rig, blend shape, animasyon isimleri, PBR kuralları,
   teslim kontrol listesi, kabul kriterleri).
3. `premium-male-v1/manifest.json`, `premium-female-v1/manifest.json` —
   sanatçının dolduracağı teslimat checklist'i.
4. Aşağıdaki klasör yapısı — sanatçı dosyaları buraya koyar.

Kod tarafı bu SDK'dan **habersizdir** — `lib/avatarPack.ts`'teki
`KEDI_PREMIUM_MALE_PACK_V1` / `KEDI_PREMIUM_FEMALE_PACK_V1` sabitleri zaten bu
klasördeki dosya adlarını (`model.glb` vb.) ve Art Guide'daki isim
sözleşmesini (animasyon/blend shape adları) bekleyecek şekilde yazıldı —
teslimat gelince sadece o dosyadaki `PENDING_ARTIST_DELIVERY` değerleri
(sanatçı adı, teslim tarihi) doldurulur ve `ACTIVE_CHARACTER_PACK_ID`
değiştirilir. Motorda (`AvatarEngine3D.tsx`) TEK SATIR değişmez.

## Klasör yapısı

```
character-packs/
  premium-male-v1/
    model.glb          ← ZORUNLU. Mesh + rig + TÜM Faz 1 animasyon clip'leri TEK dosyada
                           (motor tek bir useGLTF() çağrısıyla yükler, ayrı ayrı
                           animasyon dosyası YÜKLEMİYOR — bkz. Art Guide §8).
    model-lod1.glb      ← opsiyonel, orta mesafe için düşük-poly varyant (bkz. Art Guide §4).
    model-lod2.glb      ← opsiyonel, uzak mesafe için en düşük-poly varyant.
    preview.webp        ← opsiyonel, UI'da küçük önizleme/thumbnail için.
    manifest.json        ← teslimat checklist'i (kodun OKUDUĞU runtime manifest DEĞİL;
                           o lib/avatarPack.ts'te — bu sadece referans/takip dosyası).
    animations/         ← opsiyonel, sanatçının kaynak/çalışma dosyaları (.fbx/.blend
                           per-clip export'ları) — arşiv amaçlı, motor bunları okumaz.
    textures/            ← opsiyonel, ham doku kaynak dosyaları (model.glb'ye zaten
                           gömülü olmalı — bu klasör sadece yedek/kaynak arşivi).
  premium-female-v1/
    (aynı yapı)
```

## Kurallar

1. **`model.glb` tek doğruluk kaynağıdır.** Motor sadece bu dosyayı yükler;
   mesh, rig VE tüm Faz 1 animasyon clip'leri onun içinde gömülü olmalı.
2. Dosya adları burada gösterildiği gibi **birebir** olmalı — kod bu adları
   doğrudan referans alıyor (`lib/avatarPack.ts`'teki `MALE_PACK_DIR`/`FEMALE_PACK_DIR`).
3. Animasyon clip / blend shape isimleri Art Guide'daki listeyle **birebir**
   eşleşmeli — kod exact-match arıyor, farklı bir isim sessizce yok sayılır.
4. Bir paket AKTİF olmadan önce (`lib/avatarPack.ts`'teki `ACTIVE_CHARACTER_PACK_ID`)
   `model.glb`'nin gerçekten bu yolda var olduğu doğrulanmalı.
5. **KTX2 kullanmayın** — motor henüz KTX2 decoder'ı yüklemiyor (bkz. Art
   Guide §4). Standart PNG/WebP + Draco geometri sıkıştırması güvenli.

Yeni bir Character Pack eklerken bu standardı tekrar kullanın — sadece klasör
adını değiştirin (ör. `champion-belt-skin-v1/`), yapı aynı kalsın.
