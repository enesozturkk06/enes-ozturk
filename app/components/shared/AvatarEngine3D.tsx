"use client";

/**
 * AvatarEngine3D.tsx — Kedi Life v2: generic 3D render motoru.
 *
 * Bu dosya HİÇBİR karakter/pack özel bilgisi İÇERMEZ — sadece
 * `CharacterPackManifest` sözleşmesini (lib/avatarPack.ts) okur. Yeni bir
 * karakter paketi eklendiğinde bu dosyada TEK SATIR değişmez.
 *
 * Sayfalar bu dosyayı DOĞRUDAN import ETMEMELİ — her zaman
 * LazyAvatarEngine3D.tsx üzerinden kullanılmalı (performans sarmalayıcısı,
 * StudentAvatar/LazyStudentAvatar ile AYNI kural).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import type { PresetsType } from "@react-three/drei/helpers/environment-assets";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import type { AvatarActivity, AvatarAction, AvatarExpression } from "@/lib/types";
import type { CharacterPackManifest, AvatarCameraPreset, AvatarLightingPreset, AvatarBoneSocket } from "@/lib/avatarPack";

export interface AvatarEngine3DProps {
  pack: CharacterPackManifest;
  activity: AvatarActivity;
  /** Belirtilirse TEK SEFERLİK oynar (pack.actions'tan), bitince otomatik
   * olarak güncel `activity`'ye geri döner — HİÇBİR ZAMAN loop olmaz
   * (Idle→Jab→Idle). `action` ve `expression` AYNI ANDA verilirse `action`
   * öncelikli. Pack bu action'ı desteklemiyorsa (veya clip GLB'de yoksa)
   * sessizce hiçbir şey oynatmadan `onActionEnd` hemen çağrılır. */
  action?: AvatarAction | null;
  /** Bitince çağrılır — çağıran taraf kendi `action` state'ini bu callback
   * içinde null'a çekmeli (aksi halde aynı action'ı art arda iki kez
   * tetiklemek prop değişmediği için ikinci seferde çalışmaz). */
  onActionEnd?: () => void;
  /** `action` ile AYNI mekanizma, farklı kaynak: pack.facialAnimations'tan.
   * Bu karakterde gerçek yüz/blend-shape rig'i YOK — "expression" burada da
   * tam vücut bir clip'i tek seferlik oynatıp activity'ye döner. */
  expression?: AvatarExpression | null;
  onExpressionEnd?: () => void;
  /** false ise: Canvas render döngüsü TAMAMEN durur (frameloop="demand") —
   * görünmezken/sekme arka plandayken/zayıf donanımda sıfır GPU/CPU maliyeti. */
  animate: boolean;
  /** "reduced" ise piksel yoğunluğu 1x'e sabitlenir (yüksek-DPR ekranlarda
   * 4 kata varan piksel maliyetini keser — canlı FPS ölçümünde bunun tek
   * başına en büyük performans kaldıracı olduğu doğrulandı). */
  quality?: "full" | "reduced";
  /** Cosmetic System V1 — attachment MEKANİZMASININ kanıtı için basit
   * primitive test mesh'leri (kırmızı eldiven/siyah ayakkabı/gri kask
   * BoxGeometry+SphereGeometry). Gerçek EquipmentItem/Cosmetic Pack
   * varlıkları GELMEDİ — bu, sadece `pack.attachmentSockets`→gerçek kemik
   * bulma + `bone.add(mesh)` ile TRUE bone-parenting mekanizmasının
   * çalıştığını doğrulamak için var (bkz. CharacterModel içindeki attach
   * effect'i). */
  testCosmetics?: boolean;
}

const CROSSFADE_SECONDS = 0.4;
const DEFAULT_CAMERA: AvatarCameraPreset = { position: [0, 1.4, 3.2], fov: 38, target: [0, 1, 0] };
const DEFAULT_LIGHTING: AvatarLightingPreset = {
  environmentPreset: "studio",
  keyLight: { color: "#F5D98A", intensity: 1.3 },
  fillLight: { color: "#8B5CF6", intensity: 0.35 },
  ambientIntensity: 0.25,
};

function CharacterModel({ pack, activity, action, expression, onActionEnd, onExpressionEnd, testCosmetics }: Omit<AvatarEngine3DProps, "animate">) {
  // version cache-busting — bkz. lib/db.ts uploadStudentAvatar'daki ?v= deseniyle aynı fikir
  const modelUrl = pack.version ? `${pack.model.url}?v=${pack.version}` : pack.model.url;
  const { scene, animations } = useGLTF(modelUrl);
  // SkeletonUtils.clone kullanılıyor — düz Object3D.clone() rigli/skinned
  // mesh'lerde kemik bağlarını (skeleton bindings) DOĞRU kopyalamaz (bilinen
  // three.js kısıtı). Bu, aynı GLB'nin birden fazla sahnede/örnekte
  // sorunsuz kullanılabilmesi için gerekli.
  const model = useMemo(() => cloneSkeleton(scene), [scene]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  // Bir action/expression (tek seferlik) oynarken activity-loop efekti
  // araya girmesin diye — bkz. aşağıdaki iki useEffect.
  const playingOneShotRef = useRef(false);
  // "en GÜNCEL" activity'yi tutar (effect ile — render sırasında ref
  // yazılmaz) — bir one-shot bitince dönülecek doğru activity'yi bulmak
  // için (one-shot sırasında activity prop'u değişmiş olabilir).
  const latestActivityRef = useRef(activity);
  useEffect(() => { latestActivityRef.current = activity; }, [activity]);

  useEffect(() => {
    const mixer = new THREE.AnimationMixer(model);
    mixerRef.current = mixer;
    return () => { mixer.stopAllAction(); mixerRef.current = null; };
  }, [model]);

  // Cosmetic System V1 — attachment mekanizması. `pack.attachmentSockets`
  // soyut soket adını (hand_l vb.) bu rig'deki GERÇEK kemik adına çözer,
  // kemiği CLONE'lanmış model üzerinde `getObjectByName` ile bulur ve
  // primitive test mesh'ini `bone.add()` ile o kemiğin GERÇEK çocuğu yapar
  // — three.js her frame'de zaten AnimationMixer'ın güncellediği kemik
  // transform'unu ebeveyn→çocuk zincirinde otomatik yayar, yani mesh
  // manuel senkron kodu OLMADAN kemikle birlikte hareket eder (yumruk
  // atarken eldiven de gider). EquipmentItem/gerçek varlık YOK — sadece
  // mekanizmanın kanıtı için sabit kırmızı/siyah/gri primitive'ler.
  useEffect(() => {
    if (!testCosmetics || !pack.attachmentSockets) return;
    const attached: THREE.Mesh[] = [];

    const attach = (socket: AvatarBoneSocket, mesh: THREE.Mesh) => {
      const boneName = pack.attachmentSockets?.[socket];
      if (!boneName) return;
      const bone = model.getObjectByName(boneName);
      if (!bone) return;
      bone.add(mesh);
      attached.push(mesh);
    };

    const gloveMat = new THREE.MeshStandardMaterial({ color: "#DC2626" });
    const shoeMat = new THREE.MeshStandardMaterial({ color: "#111111" });
    const helmetMat = new THREE.MeshStandardMaterial({ color: "#9CA3AF" });

    // Boyutlar bu rig'in kemik-lokal birim ölçeğine göre (kök node'a
    // gömülü 0.01 dönüşüm — bkz. lib/avatarPack.ts HUMAN_RIG_DEV_PACK notu)
    // canlı ekran görüntüsüyle KALİBRE EDİLDİ, tahmini bırakılmadı.
    attach("hand_l", new THREE.Mesh(new THREE.BoxGeometry(9, 9, 9), gloveMat));
    attach("hand_r", new THREE.Mesh(new THREE.BoxGeometry(9, 9, 9), gloveMat));
    attach("foot_l", new THREE.Mesh(new THREE.BoxGeometry(7, 5, 16), shoeMat));
    attach("foot_r", new THREE.Mesh(new THREE.BoxGeometry(7, 5, 16), shoeMat));
    attach("head", new THREE.Mesh(new THREE.SphereGeometry(11, 16, 16), helmetMat));

    return () => {
      attached.forEach((mesh) => {
        mesh.parent?.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    };
  }, [testCosmetics, pack, model]);

  // LOOP olarak bir clip'e geç (activity durumları için) — bir one-shot'tan
  // dönerken de kullanılıyor, bu yüzden setLoop/clampWhenFinished'ı HER
  // seferinde açıkça sıfırlıyor (aksi halde önceki bir action/expression
  // kullanımından kalan LoopOnce+clamp ayarı yapışıp kalabilir).
  const crossfadeToLoopingClip = useCallback((clipName: string | undefined): THREE.AnimationAction | null => {
    const mixer = mixerRef.current;
    if (!mixer || !clipName) return null;
    const clip = THREE.AnimationClip.findByName(animations, clipName);
    if (!clip) return null;

    const nextAction = mixer.clipAction(clip);
    nextAction.setLoop(THREE.LoopRepeat, Infinity);
    nextAction.clampWhenFinished = false;
    nextAction.reset().play();
    const prevAction = currentActionRef.current;
    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, CROSSFADE_SECONDS, true);
    }
    currentActionRef.current = nextAction;
    return nextAction;
  }, [animations]);

  // Activity (döngü) — bir one-shot (action/expression) oynarken bu efekt
  // araya GİRMEZ (playingOneShotRef kontrolü); one-shot bitince kendi
  // "finished" handler'ı zaten en güncel activity'ye dönüyor.
  useEffect(() => {
    if (playingOneShotRef.current) return;
    const clipName = pack.animations[activity] ?? pack.animations.idle;
    crossfadeToLoopingClip(clipName);
  }, [activity, pack, animations, crossfadeToLoopingClip]);

  // Action + Expression — İKİSİ DE AYNI "bir kez oynat, activity'ye dön"
  // mekanizmasını kullanır (tek effect'te birleştirilmiş: action varsa o
  // önceliklidir — iki ayrı effect olsaydı ikisi aynı anda tetiklenirse
  // birbirinin "finished" callback'ini kaybettirebilirdi).
  useEffect(() => {
    const mixer = mixerRef.current;
    if (!mixer) return;
    if (!action && !expression) return; // hiçbiri istenmiyor — activity efekti zaten devrede

    const isAction = !!action;
    const clipName = isAction
      ? pack.actions?.[action as AvatarAction]
      : pack.facialAnimations?.[expression as AvatarExpression];
    const notifyDone = () => { if (isAction) onActionEnd?.(); else onExpressionEnd?.(); };

    if (!clipName) { notifyDone(); return; } // pack bu action/expression'ı desteklemiyor — sessizce atla
    const clip = THREE.AnimationClip.findByName(animations, clipName);
    if (!clip) { notifyDone(); return; }

    playingOneShotRef.current = true;
    const nextAction = mixer.clipAction(clip);
    nextAction.setLoop(THREE.LoopOnce, 1);
    nextAction.clampWhenFinished = true;
    nextAction.reset().play();
    const prevAction = currentActionRef.current;
    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, CROSSFADE_SECONDS, true);
    }
    currentActionRef.current = nextAction;

    const handleFinished = (event: { action: THREE.AnimationAction }) => {
      if (event.action !== nextAction) return; // bize ait değil (başka bir one-shot bitti)
      mixer.removeEventListener("finished", handleFinished);
      playingOneShotRef.current = false;
      const returnClipName = pack.animations[latestActivityRef.current] ?? pack.animations.idle;
      crossfadeToLoopingClip(returnClipName);
      notifyDone();
    };
    mixer.addEventListener("finished", handleFinished);
    return () => { mixer.removeEventListener("finished", handleFinished); };
    // onActionEnd/onExpressionEnd BİLEREK deps dışında — çağıran taraftan
    // gelen inline callback'ler her render'da yeni referans olabilir, deps'e
    // eklenirse one-shot her render'da yeniden başlardı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, expression, pack, animations, crossfadeToLoopingClip]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return <primitive object={model} />;
}

export default function AvatarEngine3D({
  pack, activity, action, onActionEnd, expression, onExpressionEnd, animate, quality = "full", testCosmetics,
}: AvatarEngine3DProps) {
  const cam = pack.cameraPreset ?? DEFAULT_CAMERA;
  const light = pack.lightingPreset ?? DEFAULT_LIGHTING;

  return (
    <Canvas
      frameloop={animate ? "always" : "demand"}
      camera={{ position: cam.position, fov: cam.fov }}
      dpr={quality === "reduced" ? 1 : [1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
    >
      <Suspense fallback={null}>
        <CharacterModel
          pack={pack}
          activity={activity}
          action={action}
          onActionEnd={onActionEnd}
          expression={expression}
          onExpressionEnd={onExpressionEnd}
          testCosmetics={testCosmetics}
        />
        <Environment preset={light.environmentPreset as PresetsType} />
      </Suspense>
      {/* 3 nokta ışık — pack'in kendi ışık ayarı yoksa altın-siyah premium varsayılan */}
      <directionalLight position={[3, 5, 2]} intensity={light.keyLight.intensity} color={light.keyLight.color} />
      <directionalLight position={[-3, 2, -2]} intensity={light.fillLight.intensity} color={light.fillLight.color} />
      <ambientLight intensity={light.ambientIntensity} />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.6}
        maxDistance={6}
        target={cam.target}
      />
    </Canvas>
  );
}
