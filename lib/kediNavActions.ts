/**
 * lib/kediNavActions.ts — Kedi AI'nin sohbet cevabına ekleyebileceği
 * navigasyon linklerinin İZİN VERİLEN (whitelist) listesi.
 *
 * Model KENDİ URL'sini üretemez — sadece bu sözlükteki ANAHTARLARDAN birini
 * (ör. "randevu") görünmez bir <!--nav:randevu--> işaretleyicisiyle seçebilir
 * (bkz. lib/kediAi.ts extractNavDelta, buildSystemPrompt). Whitelist DIŞINDA
 * bir anahtar gelirse (halüsinasyon/geçersiz) sessizce YOK sayılır — hiçbir
 * zaman rastgele bir href render edilmez.
 */
export interface KediNavAction {
  href: string;
  label: string;
}

export const KEDI_NAV_ACTIONS: Record<string, KediNavAction> = {
  randevu:   { href: "/ogrenci/randevu",   label: "Randevularım" },
  profil:    { href: "/ogrenci/profil",    label: "Profilim" },
  seviye:    { href: "/ogrenci/seviye",    label: "Seviye Merkezi" },
  rozetler:  { href: "/ogrenci/rozetler",  label: "Rozetlerim" },
  saglik:    { href: "/ogrenci/saglik",    label: "Sağlık" },
  avatar:    { href: "/ogrenci/avatar",    label: "Avatarım" },
  gelisim:   { href: "/ogrenci/gelisim",   label: "Gelişimim" },
  antrenman: { href: "/ogrenci/antrenman", label: "AI Antrenman" },
};

export type KediNavActionKey = keyof typeof KEDI_NAV_ACTIONS;

export function isValidKediNavKey(key: string): key is KediNavActionKey {
  return Object.prototype.hasOwnProperty.call(KEDI_NAV_ACTIONS, key);
}
