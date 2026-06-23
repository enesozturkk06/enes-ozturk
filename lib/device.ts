/** İstemci tarafı basit Android tespiti — SSR'da her zaman false döner. */
export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}
