# EO OS V3 — Design System

Bu doküman, uygulamayı Apple/Linear/Stripe/Notion/Revolut seviyesinde premium
hissettirecek ortak tasarım dilinin referansıdır. **Bundan sonraki tüm yeni
kod bu dokümana uymalı.** Mevcut ekranlar bu doküman yüzünden değiştirilmedi —
bu sadece temel; ekran bazlı redesign'lar ayrı, onaylanmış fazlarda yapılacak
(bkz. "Yol Haritası" altta).

Bu doküman **tamamen additive** bir `app/globals.css` değişikliğiyle birlikte
yazıldı: hiçbir mevcut token silinmedi/yeniden adlandırılmadı, hiçbir sayfa
kodu değişmedi. Yeni class/token'lar şu an hiçbir yerde kullanılmıyor —
mevcut ekranlarda sıfır görsel etki.

---

## 1. Renk Sistemi

**Felsefe:** Ana renk Siyah, yardımcı renk Mor. Pozitif=Yeşil, Uyarı=Turuncu,
Hata=Kırmızı, Başarı=Altın. Bunun dışında gereksiz renk kullanılmaz.

### ⚠️ İsimlendirme tuzağı — önce bunu oku

`app/globals.css`'teki iki token'ın ismi artık gerçek anlamını taşımıyor
(dosyanın kendi yorumları):

```css
/* crimson artık violet (tüm eski `bg-crimson` otomatik güncellenir) */
--color-crimson: #8B5CF6;   /* ismine rağmen KIRMIZI DEĞİL, MOR */

/* gold artık magenta-pembe (neon vurgu) */
--color-gold: #D946EF;      /* ismine rağmen ALTIN DEĞİL, MAGENTA-PEMBE */
```

Bu iki token'a **hiç dokunulmadı** (100+ dosyada kullanılıyorlar, değiştirmek
regresyon riski demek). Ama **yeni kod bu isimleri anlamlarına göre
kullanmasın** — `--color-crimson` yazarsan mor render olur, `--color-gold`
yazarsan pembe render olur. Gerçek "Başarı: Altın" için aşağıdaki YENİ
token'ı kullan.

### Yeni semantic token'lar (additive, `app/globals.css` `@theme` bloğu)

| Token | Hex | Anlamı | Kullanım |
|---|---|---|---|
| `--color-success` | `#22C55E` | Pozitif | ödendi, tamamlandı, aktif durum |
| `--color-success-bright` | `#4ADE80` | Pozitif (parlak) | hover/glow varyantı |
| `--color-warning` | `#FB923C` | Uyarı | bekleyen, dikkat gerektiren |
| `--color-warning-bright` | `#FDBA74` | Uyarı (parlak) | hover/glow varyantı |
| `--color-error` | `#EF4444` | Hata | başarısız, iptal, kritik |
| `--color-error-bright` | `#F87171` | Hata (parlak) | hover/glow varyantı |
| `--color-achievement` | `#F59E0B` | **Başarı (gerçek altın)** | Onur Listesi, XP level-up, premium rozet |
| `--color-achievement-bright` | `#FBBF24` | Başarı (parlak) | hover/glow varyantı |

Not: `--color-achievement` değeri, `app/components/ui/index.tsx`'teki
`StatCard`'ın kendi "gold" rengiyle (`#f59e0b`, satır 71) zaten birebir aynı —
yani bu zaten örtük olarak kullanılan doğru "gerçek altın" tonu, sadece resmi
bir token'ı yoktu.

**"Başarı" ile "Pozitif" farkı:** Yeşil = basit olumlu durum (ödendi, aktif,
tamamlandı). Altın = kilometre taşı/başarı anı (Onur Listesi'nde legend
seviyesi, yeni seviye atlama, özel rozet kazanma). Bu ayrım zaten
`HallOfFame.tsx`'in "legend" katmanında amber/altın kullanmasıyla örtük olarak
var — bu doküman onu resmileştiriyor.

### Mevcut renk ailesi (değişmedi, referans için)
- Mor (yardımcı renk): `--color-violet` / `--color-violet-glow` / `--color-violet-bright`
- Siyah tonları: `--color-obsidian` (#09090B, ana arka plan) → `--color-pitch` → `--color-carbon` → `--color-steel` → `--color-iron` (border rengi) → `--color-ash`

---

## 2. Tipografi

Üç font, next/font ile `app/layout.tsx`'te yükleniyor:

| Font | CSS değişkeni | Kullanım |
|---|---|---|
| Bebas Neue | `--font-display` (`var(--font-bebas)`) | Hero başlıkları, büyük sayılar (₺ tutarlar, KPI'lar) |
| Barlow Condensed | `--font-label` **(yeni token)** | Etiketler, uppercase meta metin, UI chrome |
| Inter | `--font-body` (`var(--font-inter)`) | Gövde metni, açıklamalar, form input'ları |

`--font-label` yeni eklendi çünkü Barlow Condensed'in şimdiye kadar resmi bir
token'ı yoktu — her yerde ham `style={{fontFamily:"var(--font-barlow-condensed)"}}`
olarak kopyalanıyordu. Yeni kod `style={{fontFamily:"var(--font-label)"}}`
kullanabilir (aynı fonta işaret ediyor, sadece isim daha net).

**Mikro metin ölçeği** (zaten uygulamada baskın olan, resmileştirilen):
`9px`/`10px`/`11px` → eyebrow/etiket metni (uppercase, tracking-widest).
`text-xs` (12px) → en küçük "gerçek" gövde metni. Bunun altına inilmez.

---

## 3. Spacing

Tailwind'in 4px adımlı skalası (`p-1`…`p-8`, `gap-1`…`gap-6`) zaten yeterli —
yeni bir spacing sistemi icat edilmedi. Sadeleştirilmiş kural seti:

- **Kart iç boşluğu:** `p-4 sm:p-5` (mobilde kompakt, masaüstünde ferah).
- **Standart gap:** `gap-2` (sıkı), `gap-3` (normal), `gap-4` (ferah).
- **Bölüm arası boşluk:** `space-y-5` (sayfa genelinde bölümler arası, `app/admin/odemeler/page.tsx`'te zaten böyle).

---

## 4. Border Radius

| Seviye | Class | Kullanım |
|---|---|---|
| Kart | `rounded-2xl` | Üst seviye kart/panel |
| İkincil/nested öğe | `rounded-xl` | Kart içi alt bölüm, liste satırı |
| Buton/input | `rounded-lg` | Butonlar, input'lar, select'ler |
| Pill/avatar | `rounded-full` | Rozet, avatar, durum etiketi |

`rounded-xl` ve `rounded-2xl`'in aynı rol için karışık kullanıldığı yerler var
(ör. bazı kart bileşenleri `rounded-xl`, bazıları `rounded-2xl`) — yeni kodda
yukarıdaki tablo esas alınır.

---

## 5. Shadow / Glow

Tek recipe, renk parametrik:
```css
box-shadow: 0 0 20px {color}33, 0 0 50px {color}15;
```
Mevcut `.glow-violet` (`app/globals.css`) bu desenin somut örneği. Yeni glow
ihtiyaçları bu oranları (iç katman opaklık `~20%`, dış katman `~8-9%`) korur.

---

## 6. Glassmorphism

**Sadece şu class'lar kullanılır:** `.glass`, `.glass-strong`, `.glass-dark`,
`.stat-card-glass` (hepsi `app/globals.css`'te tanımlı).

**Yeni kodda asla inline `backdropFilter` yazılmaz.** Sebep: bu 4 class'ın
`@media (max-width: 1023px)` altında blur'u otomatik kapatan bir performans
kuralı var —

```css
@media (max-width: 1023px) {
  /* Backdrop blur: mobilde en pahalı CSS özelliği, Android'de scroll
     sırasında glitch/çizgi render hatasına sebep oluyor — kaldır. */
  .stat-card-glass { backdrop-filter: none; -webkit-backdrop-filter: none; }
}
```

İnline `backdropFilter` yazan kod bu korumayı atlar ve Android'de aynı
scroll-glitch riskini sessizce geri getirir. Bugün 25'ten fazla yerde bu
atlama zaten var (teknik borç) — yeni kodun bunu çoğaltmaması yeterli.

---

## 7. Dynamic Gradient System

Uygulama genelinde **çok yavaş (8-15sn), asla dikkat dağıtmayan** hareketli
gradient'lar için yeni utility class'lar (additive, `app/globals.css`):

```html
<div class="gradient-animated gradient-violet-blue">...</div>
<div class="gradient-animated gradient-slow gradient-violet-gold">...</div>
```

| Class | Geçiş |
|---|---|
| `.gradient-violet-blue` | Mor → Mavi |
| `.gradient-blue-cyan` | Mavi → Cyan |
| `.gradient-violet-gold` | Mor → Altın |
| `.gradient-violet-pink` | Mor → Pembe |
| `.gradient-green-teal` | Yeşil → Turkuaz |
| `.gradient-red-orange` | Kırmızı → Turuncu — **sadece kritik uyarılar**, dekoratif kullanılmaz |

`.gradient-animated` temel 12sn döngü verir; `.gradient-slow` (15sn) /
`.gradient-fast` (8sn) ile ince ayar yapılır. `background-position` animasyonu
GPU compositor katmanında çalışır (`will-change` ile), transform/opacity gibi
ucuzdur — mevcut `prefers-reduced-motion` bloğu bunları otomatik durdurur, ek
kod gerekmez.

**Kullanılacak alanlar:** hero başlıkları, CTA butonları, progress bar, AI
ekranları, grafikler, seçili/aktif kartlar, splash/loading ekranları.

---

## 8. Animasyon Süreleri

Üç kademe (framer-motion `transition={{duration:...}}` için):

| Kademe | Süre | Kullanım |
|---|---|---|
| Fast | `0.15s` | Press/tap geri bildirimi |
| Base | `0.25s` | Hover, modal açılış, page transition, mikro-etkileşimler |
| Slow | `0.6s` | Progress bar dolumu, grafik reveal — **kasıtlı olarak** daha yavaş, çünkü bir değerin dolarak büyümesi anlık değil "dolarken hissedilmeli" |

Bugün uygulamada `0.18`'den `0.9`'a kadar 10'dan fazla farklı süre değeri var,
tutarlı bir kademelendirme yok — yeni kod yukarıdaki 3 değerden birini seçer.

---

## 9. Component Envanteri — `app/components/ui/index.tsx`

Zaten var olan ve **16 sayfada** kullanılan (`app/ogrenci/*`, birkaç
`app/admin/*`) paylaşılan primitive'ler:

| Component | Özet |
|---|---|
| `Button` | `variant` (primary/secondary/ghost/danger/gold), `size`, `loading` |
| `Card` | Basit `bg-carbon` kart, `hover`/`glow` opsiyonel |
| `StatCard` | Tıklanabilir/animasyonlu istatistik kartı, neon glow, `href`/`onClick` |
| `Input` / `Select` / `Textarea` | Etiketli form alanları |
| `Badge` | Küçük durum etiketi (6 renk) |
| `ProgressBar` | Animasyonlu yatay ilerleme çubuğu |
| `Modal` | Tam modal kabuğu — overlay + mobilde bottom-sheet + sabit header/footer |
| `PageHeader` | Sayfa başlığı + accent çizgi + aksiyon butonları |
| `ScoreBar` | 10 üzerinden skor çubuğu |

**Kural:** Yeni yazılan her ekran/component önce bu listeye bakar. Burada
karşılığı varsa yeniden yazılmaz, buradan import edilir.

**Neden önemli:** Aynı "kart" tarifi bugün ~22 farklı dosyada, aynı gradient
buton ~24 dosyada, aynı modal kabuğu 25'ten fazla yerde sıfırdan
kopyalanmış durumda. Bu envanterin büyümesi yerine **kullanılması** asıl
kazanım.

---

## 10. Yol Haritası (onay bekleyen gelecek fazlar)

Bu doküman sadece temeldir. Sıradaki adımlar (her biri ayrı onay ister):

- **Faz 2:** `app/components/ui/index.tsx`'teki primitive'leri yukarıdaki yeni
  token'lara (`--color-success`/`--color-warning`/`--color-error`/
  `--color-achievement`, gradient sistemi) bağlamak. Bu dosya 16 canlı sayfada
  kullanıldığı için dikkatli, görsel diff kontrollü bir geçiş gerektirir.
- **Faz 3:** En çok tekrar eden kalıpları (odemeler sayfasındaki modallar,
  admin panelindeki 3 ayrı `F` form component'i) shared primitive'lere
  taşımak.
- **Faz 4:** Tek tek ekran redesign'ları — her biri kendi onayıyla.
