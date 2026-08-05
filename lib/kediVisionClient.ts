/**
 * lib/kediVisionClient.ts — Kedi AI Vision, TARAYICI-tarafı yardımcıları.
 * lib/kediVision.ts SUNUCU-only kodları (process.env, crypto) içerir; bu
 * dosya bilerek AYRI tutuldu ki bir client component yanlışlıkla server-only
 * bir bağımlılığı bundle'a almasın (bkz. lib/kediProgramLabels.ts'teki aynı
 * ayrım gerekçesi).
 *
 * Görseller sunucuya gönderilmeden önce burada KÜÇÜLTÜLÜR (canvas ile
 * yeniden boyutlandırma) — hem Supabase Storage'da yer kaplamasın hem de
 * OpenRouter'a gönderilen base64 payload gereksiz büyük olmasın.
 */

export async function compressImageToDataUrl(file: File, maxPx = 900, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * ratio));
      canvas.height = Math.max(1, Math.round(img.height * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context alınamadı.")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("Görsel yüklenemedi."));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Bir video dosyasından eşit aralıklarla `frameCount` kare çıkarır (canvas
 * ile), her birini küçültülmüş bir JPEG data URL'ine çevirir. Videonun
 * kendisi hiçbir yere yüklenmez/gönderilmez — sadece bu kareler AI'ya
 * gönderilir (frame-by-frame analiz için yeterli, video dosyasının tamamını
 * taşımaktan çok daha hafif).
 */
export async function extractVideoFrames(file: File, frameCount = 5, maxPx = 480): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    const frames: string[] = [];
    let index = 0;
    let timestamps: number[] = [];
    const cleanup = () => URL.revokeObjectURL(url);

    const seekNext = () => {
      if (index >= timestamps.length) { cleanup(); resolve(frames); return; }
      video.currentTime = timestamps[index];
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) {
        cleanup();
        reject(new Error("Video süresi okunamadı."));
        return;
      }
      const margin = duration * 0.05;
      const span = Math.max(0, duration - margin * 2);
      timestamps = Array.from({ length: frameCount }, (_, i) =>
        margin + (span * i) / Math.max(1, frameCount - 1));
      seekNext();
    };

    video.onseeked = () => {
      const ratio = Math.min(maxPx / video.videoWidth, maxPx / video.videoHeight, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(video.videoWidth * ratio));
      canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.8));
      }
      index += 1;
      seekNext();
    };

    video.onerror = () => { cleanup(); reject(new Error("Video yüklenemedi.")); };
  });
}
