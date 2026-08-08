# dev-human-rig

**Bu bir Character Pack SDK teslimi DEĞİL** — geçici bir geliştirme/test varlığı.

Kaynak: Sketchfab "Human Models Set - Male/Female (Rigged)" (CC BY lisansı).
`source/HumanModels.glb` dosyasından SADECE erkek/rigli mesh (`Man (Rig)` node'u)
ayıklanarak `model.glb` üretildi — orijinal dosyada erkek+kadın+HighPoly/NonRig
varyantları aynı sahnede yan yana duruyordu (bkz. proje notları).

**Durum**: Hiç animasyon clip'i yok (kaynak dosyada 0 animasyon vardı), rig
Mixamo-standart DEĞİL (Rigify-tarzı bone isimleri). `lib/avatarPack.ts`'teki
`HUMAN_RIG_DEV_PACK` bunu `stage: "dev"` olarak kullanıyor — `KEDI_PREMIUM_MALE_PACK_V1`
ile KARIŞTIRILMAMALI, o hâlâ sanatçı teslimini bekliyor (bkz.
`public/assets/character-packs/premium-male-v1/`, hâlâ boş).

**Atıf gerekiyor** (CC BY) — `HUMAN_RIG_DEV_PACK.requiresAttribution` alanına bkz.
Sanatçı adı Sketchfab sayfasından teyit edilip doldurulmalı.

**Sıradaki adım (kullanıcının planı)**: Bu rig Mixamo'ya yüklenip (mixamo.com,
manuel — hesap girişi otomatikleştirilemiyor) Idle/Walking/Guard/Jab/Cross/
Hook/Victory gibi animasyonlar indirilecek, sonra bu pack'e eklenecek.
