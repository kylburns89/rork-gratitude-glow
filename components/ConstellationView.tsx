import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  GestureResponderEvent,
  Easing,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { GratitudeEntry } from "@/types/gratitude";
import Svg, { G, Line, Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { Accelerometer } from 'expo-sensors';
import colors from '@/constants/colors';

const { width: winW, height: winH } = Dimensions.get("window");
const PAN_SPEED = 0.0256 as const;
const TILT_STRENGTH = 24 as const;
const TILT_PARALLAX_BOOST = 1.3 as const;

interface ConstellationViewProps {
  entries: GratitudeEntry[];
  isPremium?: boolean;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  ageDays: number;
  color: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: Animated.Value;
  delay: number;
}

interface StarLayer {
  stars: Star[];
  factor: number;
  testID: string;
}

interface SpaceObject {
  x: number;
  y: number;
  size: number;
  core: string;
  glow: string;
  ring?: boolean;
}

interface SpaceLayer {
  objects: SpaceObject[];
  factor: number;
  testID: string;
}

interface ShootingStar {
  id: string;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  duration: number;
  anim: Animated.Value;
  size: number;
  factor: number;
  angleDeg: string;
}

export default function ConstellationView({ entries, isPremium = false }: ConstellationViewProps) {
  const [starLayers, setStarLayers] = useState<StarLayer[]>([]);
  const [spaceLayers, setSpaceLayers] = useState<SpaceLayer[]>([]);
  const [shooting, setShooting] = useState<ShootingStar[]>([]);
  const [viewW, setViewW] = useState<number>(winW);
  const [viewH, setViewH] = useState<number>(winH);
  const panAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const panXY = useRef({ x: 0, y: 0 }).current;
  const scaleRef = useRef(1);
  const tapStart = useRef<{ x: number; y: number } | null>(null);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef<number>(1);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const doubleTapConsumed = useRef<boolean>(false);
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  const MIN_SCALE_FREE = 0.9 as const;
  const MIN_SCALE_PRO = 0.6 as const;
  const zoomUpsellShown = useRef<boolean>(false);

  const positions = useMemo<NodePosition[]>(() => {
    const now = Date.now();
    const baseW = viewW || winW;
    const baseH = viewH || winH;
    return entries.map((entry, index) => {
      const angle = index * 137.508 * (Math.PI / 180);
      const radius = Math.sqrt(index + 1) * 32;
      const cx = Math.cos(angle) * radius + baseW;
      const cy = Math.sin(angle) * radius + baseH * 0.7;
      const ageMs = now - new Date(entry.date).getTime();
      const ageDays = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
      return { id: entry.id, x: cx, y: cy, ageDays, color: entry.color };
    });
  }, [entries, viewW, viewH]);

  const edges = useMemo<{ a: NodePosition; b: NodePosition; d: number }[]>(() => {
    const maxDist = 180;
    const k = 3;
    const acc: { a: NodePosition; b: NodePosition; d: number }[] = [];
    for (let i = 0; i < positions.length; i++) {
      const ni = positions[i];
      const dists: { j: number; d: number }[] = [];
      for (let j = 0; j < positions.length; j++) {
        if (i === j) continue;
        const nj = positions[j];
        const dx = ni.x - nj.x;
        const dy = ni.y - nj.y;
        const d = Math.hypot(dx, dy);
        if (d <= maxDist) dists.push({ j, d });
      }
      dists.sort((a, b) => a.d - b.d);
      for (let n = 0; n < Math.min(k, dists.length); n++) {
        const j = dists[n].j;
        const nj = positions[j];
        acc.push({ a: ni, b: nj, d: dists[n].d });
      }
    }
    return acc;
  }, [positions]);

  const grid = useMemo(() => {
    const cell = 80;
    const map = new Map<string, string[]>();
    positions.forEach((p) => {
      const gx = Math.floor(p.x / cell);
      const gy = Math.floor(p.y / cell);
      const key = `${gx},${gy}`;
      const arr = map.get(key) ?? [];
      arr.push(p.id);
      map.set(key, arr);
    });
    return { cell, map };
  }, [positions]);

  const findNearest = (x: number, y: number): string | null => {
    const c = grid.cell;
    const gx = Math.floor(x / c);
    const gy = Math.floor(y / c);
    let bestId: string | null = null;
    let bestD = 24;
    for (let ix = gx - 1; ix <= gx + 1; ix++) {
      for (let iy = gy - 1; iy <= gy + 1; iy++) {
        const key = `${ix},${iy}`;
        const ids = grid.map.get(key) ?? [];
        for (const id of ids) {
          const p = positions.find((pp) => pp.id === id);
          if (!p) continue;
          const dx = p.x - x;
          const dy = p.y - y;
          const d = Math.hypot(dx, dy);
          if (d < bestD) {
            bestD = d;
            bestId = id;
          }
        }
      }
    }
    return bestId;
  };

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const resetView = useCallback(() => {
    console.log('[Constellation] resetView invoked - recentering first orb star');
    const vw = viewW || winW;
    const vh = viewH || winH;
    
    if (positions.length === 0) {
      console.log('[Constellation] No entries to center, resetting to origin');
      Animated.parallel([
        Animated.timing(panAnim.x, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(panAnim.y, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start(() => {
        panXY.x = 0;
        panXY.y = 0;
        scaleRef.current = 1;
      });
      return;
    }
    
    // Get the first orb star (most recent entry)
    const firstOrb = positions[0];
    const targetScale = 1;
    
    // Calculate the translation needed to center the first orb in the viewport
    // We need to move the constellation so that the first orb appears at the center of the screen
    const targetX = (vw / 2) - firstOrb.x;
    const targetY = (vh / 2) - firstOrb.y;
    
    console.log('[Constellation] Centering first orb star', { 
      orbPosition: { x: firstOrb.x, y: firstOrb.y }, 
      viewport: { w: vw, h: vh },
      target: { x: targetX, y: targetY, scale: targetScale }
    });
    
    // Animate to center the first orb with smooth easing
    Animated.parallel([
      Animated.timing(panAnim.x, { 
        toValue: targetX, 
        duration: 400, 
        useNativeDriver: true, 
        easing: Easing.out(Easing.quad) 
      }),
      Animated.timing(panAnim.y, { 
        toValue: targetY, 
        duration: 400, 
        useNativeDriver: true, 
        easing: Easing.out(Easing.quad) 
      }),
      Animated.timing(scaleAnim, { 
        toValue: targetScale, 
        duration: 400, 
        useNativeDriver: true, 
        easing: Easing.out(Easing.quad) 
      }),
    ]).start(() => {
      panXY.x = targetX;
      panXY.y = targetY;
      scaleRef.current = targetScale;
      console.log('[Constellation] First orb star centered successfully');
    });
  }, [panAnim.x, panAnim.y, scaleAnim, positions, viewW, viewH]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const { locationX, locationY, touches } = e.nativeEvent as any;
        const now = Date.now();
        const last = lastTapRef.current;
        doubleTapConsumed.current = false;
        if (last) {
          const dt = now - last.t;
          const dx = locationX - last.x;
          const dy = locationY - last.y;
          const dist = Math.hypot(dx, dy);
          if (dt < 300 && dist < 24) {
            console.log('[Constellation] double tap detected');
            doubleTapConsumed.current = true;
            resetView();
          }
        }
        lastTapRef.current = { t: now, x: locationX, y: locationY };
        tapStart.current = { x: locationX, y: locationY };
        if (touches && touches.length >= 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          pinchStartDist.current = Math.hypot(dx, dy);
          pinchStartScale.current = scaleRef.current;
        } else {
          pinchStartDist.current = null;
        }
      },
      onPanResponderMove: (e, gesture) => {
        if (doubleTapConsumed.current) return;
        const touches: any[] = (e.nativeEvent as any).touches ?? [];
        if (touches.length >= 2 && pinchStartDist.current !== null) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.hypot(dx, dy);
          const desired = (dist / (pinchStartDist.current || 1)) * pinchStartScale.current;
          const minScale = isPremium ? MIN_SCALE_PRO : MIN_SCALE_FREE;
          let scale = clamp(desired, minScale, 2.5);
          if (!isPremium && desired < MIN_SCALE_FREE && !zoomUpsellShown.current) {
            console.log('[Constellation] Upsell: zoomed beyond free min');
            zoomUpsellShown.current = true;
            try { router.push('/premium'); } catch (err) { console.log('router push failed', err); }
          }
          scaleAnim.setValue(scale);
        } else {
          panAnim.setValue({ x: panXY.x + gesture.dx * PAN_SPEED, y: panXY.y + gesture.dy * PAN_SPEED });
        }
      },
      onPanResponderRelease: async (e: GestureResponderEvent, g) => {
        if (doubleTapConsumed.current) {
          doubleTapConsumed.current = false;
          tapStart.current = null;
          pinchStartDist.current = null;
          return;
        }
        const moved = Math.hypot(g.dx, g.dy);
        panXY.x = panXY.x + g.dx * PAN_SPEED;
        panXY.y = panXY.y + g.dy * PAN_SPEED;
        if (moved < 6 && tapStart.current) {
          const tx = (tapStart.current.x - panXY.x) / scaleRef.current;
          const ty = (tapStart.current.y - panXY.y) / scaleRef.current;
          const id = findNearest(tx, ty);
          if (id) {
            try {
              if (Platform.OS !== "web") {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            } catch (err) {
              console.log('Haptics error', err);
            }
            router.push({ pathname: "/entry-detail", params: { id } });
          }
        }
        tapStart.current = null;
        pinchStartDist.current = null;
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  useEffect(() => {
    const xListener = panAnim.x.addListener(({ value }) => {
      panXY.x = value;
    });
    const yListener = panAnim.y.addListener(({ value }) => {
      panXY.y = value;
    });
    const sListener = scaleAnim.addListener(({ value }) => {
      scaleRef.current = value;
    });
    return () => {
      panAnim.x.removeListener(xListener);
      panAnim.y.removeListener(yListener);
      scaleAnim.removeListener(sListener);
    };
  }, [panAnim, scaleAnim, isPremium]);

  useEffect(() => {
    const area = (viewW || winW) * (viewH || winH);
    const density = 0.00012;
    const baseCount = Math.min(150, Math.max(60, Math.floor(area * density)));
    const boostedCount = Math.floor(baseCount * 5);
    const vw = viewW || winW;
    const vh = viewH || winH;
    const layerDefs: Array<{ factor: number; share: number; sizeRange: [number, number]; testID: string }> = [
      { factor: 0.12, share: 0.25, sizeRange: [0.6, 1.4], testID: "starfield-layer-back" },
      { factor: 0.25, share: 0.3, sizeRange: [0.8, 1.8], testID: "starfield-layer-mid" },
      { factor: 0.45, share: 0.25, sizeRange: [1.0, 2.2], testID: "starfield-layer-front" },
      { factor: 0.7, share: 0.2, sizeRange: [1.2, 2.6], testID: "starfield-layer-foreground" },
    ];
    const layers: StarLayer[] = layerDefs.map((def) => {
      const count = Math.max(1, Math.floor(boostedCount * def.share));
      const stars: Star[] = Array.from({ length: count }).map(() => {
        const sx = Math.random() * vw * 2;
        const sy = Math.random() * vh * 2;
        const size = def.sizeRange[0] + Math.random() * (def.sizeRange[1] - def.sizeRange[0]);
        const opacity = new Animated.Value(Math.random() * 0.6 + 0.2);
        const delay = Math.floor(Math.random() * 4000);
        return { x: sx, y: sy, size, opacity, delay };
      });
      return { stars, factor: def.factor, testID: def.testID };
    });
    setStarLayers(layers);
    layers.forEach((layer) => {
      layer.stars.forEach((star) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(star.opacity, { toValue: 1, duration: 1200, delay: star.delay, useNativeDriver: true }),
            Animated.timing(star.opacity, { toValue: 0.2, duration: 1500, useNativeDriver: true }),
          ])
        ).start();
      });
    });
  }, [viewW, viewH]);

  useEffect(() => {
    const vw = viewW || winW;
    const vh = viewH || winH;
    const layers: SpaceLayer[] = [
      { factor: 0.04, objects: [], testID: 'space-layer-deep' },
    ];

    const makePlanet = (size: number, core: string, glow: string, ring = false): SpaceObject => ({
      x: Math.random() * vw * 2,
      y: Math.random() * vh * 2,
      size,
      core,
      glow,
      ring,
    });

    layers[0].objects.push(makePlanet(160, colors.backgroundLight, colors.primary));
    layers[0].objects.push(makePlanet(90, colors.backgroundDark, colors.secondary, true));
    layers[0].objects.push(makePlanet(60, colors.surface, colors.success));
    layers[0].objects.push(makePlanet(48, colors.backgroundLight, colors.accent));

    setSpaceLayers(layers);
  }, [viewW, viewH]);

  useEffect(() => {
    let mounted = true;
    const minMs = 4500;
    const maxMs = 9000;

    let timeout: number | null = null;

    const vw = viewW || winW;
    const vh = viewH || winH;

    const spawn = () => {
      if (!mounted) return;
      const id = `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
      const edge = Math.random();
      const startX = edge < 0.5 ? -40 : vw * 2 + 40;
      const startY = Math.random() * vh * 1.6;
      const endX = edge < 0.5 ? vw * 2 + 80 : -80;
      const slope = (Math.random() * 0.4 + 0.15) * (edge < 0.5 ? 1 : -1);
      const dx = endX - startX;
      const dy = dx * slope;
      const duration = 1400 + Math.random() * 1200;
      const size = 2 + Math.random() * 2.5;
      const factor = 0.3;
      const angleDeg = `${Math.atan2(dy, dx) * (180 / Math.PI)}deg`;
      const anim = new Animated.Value(0);
      const s: ShootingStar = { id, startX, startY, dx, dy, duration, anim, size, factor, angleDeg };
      setShooting((prev) => [...prev, s]);
      Animated.timing(anim, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
        setShooting((prev) => prev.filter((it) => it.id !== id));
      });
    };

    const schedule = () => {
      const ms = Math.floor(minMs + Math.random() * (maxMs - minMs));
      timeout = setTimeout(() => {
        spawn();
        schedule();
      }, ms) as unknown as number;
    };

    schedule();

    return () => {
      mounted = false;
      if (timeout) clearTimeout(timeout as unknown as number);
    };
  }, [viewW, viewH]);

  useEffect(() => {
    let webDeviceHandler: ((e: any) => void) | null = null;
    let webMouseHandler: ((e: MouseEvent) => void) | null = null;
    let accelSub: { remove?: () => void } | null = null;

    const applyTilt = (nx: number, ny: number) => {
      const tx = nx * TILT_STRENGTH;
      const ty = ny * TILT_STRENGTH;
      tiltX.setValue(tx);
      tiltY.setValue(ty);
    };

    if (Platform.OS === 'web') {
      webDeviceHandler = (e: any) => {
        const gamma: number = (e?.gamma ?? 0) as number;
        const beta: number = (e?.beta ?? 0) as number;
        const nx = clamp(gamma / 45, -1, 1);
        const ny = clamp(beta / 45, -1, 1);
        applyTilt(nx, ny);
      };
      try {
        window.addEventListener('deviceorientation', webDeviceHandler as any, true);
      } catch (err) {
        console.log('deviceorientation listener error', err);
      }
      webMouseHandler = (e: MouseEvent) => {
        const vw = viewW || winW;
        const vh = viewH || winH;
        const nx = (e.clientX / vw) * 2 - 1;
        const ny = (e.clientY / vh) * 2 - 1;
        applyTilt(nx, ny);
      };
      window.addEventListener('mousemove', webMouseHandler);
    } else {
      (async () => {
        try {
          if (!Accelerometer || typeof Accelerometer.isAvailableAsync !== 'function') {
            console.log('expo-sensors not available; skipping native tilt');
            return;
          }
          const available = await Accelerometer.isAvailableAsync();
          if (!available) {
            console.log('Accelerometer unavailable on device');
            return;
          }
          Accelerometer.setUpdateInterval?.(33);
          accelSub = Accelerometer.addListener((data: { x?: number; y?: number }) => {
            const nx = clamp((data?.x ?? 0), -1, 1);
            const ny = clamp(-(data?.y ?? 0), -1, 1);
            applyTilt(nx, ny);
          });
          console.log('Accelerometer listener attached for tilt parallax');
        } catch (e) {
          console.log('Failed to init accelerometer tilt', e);
        }
      })();
    }

    return () => {
      if (webDeviceHandler) window.removeEventListener('deviceorientation', webDeviceHandler as any, true);
      if (webMouseHandler) window.removeEventListener('mousemove', webMouseHandler);
      try { accelSub?.remove?.(); } catch (e) { console.log('accelSub remove failed', e); }
    };
  }, [tiltX, tiltY]);

  useEffect(() => {
    if (positions.length === 0) {
      panXY.x = 0;
      panXY.y = 0;
      panAnim.setValue({ x: 0, y: 0 });
      scaleAnim.setValue(1);
      return;
    }
    const vw = viewW || winW;
    const vh = viewH || winH;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    positions.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const targetX = vw / 2 - centerX;
    const targetY = vh / 2 - centerY;
    panXY.x = targetX;
    panXY.y = targetY;
    panAnim.setValue({ x: targetX, y: targetY });
    scaleAnim.setValue(1);
  }, [positions, panAnim, scaleAnim, viewW, viewH]);

  const openEntry = useCallback(async (id: string) => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.log('Haptics error', err);
    }
    try {
      router.push({ pathname: '/entry-detail', params: { id } });
    } catch (err) {
      console.log('router push failed', err);
    }
  }, []);

  const colorForAge = (ageDays: number, base: string): string => {
    if (ageDays <= 1) return base;
    if (ageDays <= 7) return colors.entryAge.recent;
    if (ageDays <= 30) return colors.entryAge.mature;
    return colors.entryAge.aged;
  };

  const handleWheel = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;
    const ne = e?.nativeEvent as any;
    const deltaY: number = ne?.deltaY ?? 0;
    const clientX: number = ne?.clientX ?? (viewW || winW) / 2;
    const clientY: number = ne?.clientY ?? (viewH || winH) / 2;

    const factor = Math.exp(-deltaY * 0.0015);
    const desired = scaleRef.current * factor;
    const minScale = isPremium ? MIN_SCALE_PRO : MIN_SCALE_FREE;
    const newScale = clamp(desired, minScale, 2.5);
    if (!isPremium && desired < MIN_SCALE_FREE && !zoomUpsellShown.current) {
      console.log('[Constellation] Upsell: wheel zoom beyond free min');
      zoomUpsellShown.current = true;
      try { router.push('/premium'); } catch (err) { console.log('router push failed', err); }
    }
    const s = scaleRef.current;

    const tx = panXY.x;
    const ty = panXY.y;

    const newTx = clientX - (clientX - tx) * (newScale / s);
    const newTy = clientY - (clientY - ty) * (newScale / s);

    scaleAnim.setValue(newScale);
    panAnim.setValue({ x: newTx, y: newTy });
  }, [panAnim, scaleAnim, isPremium, viewW, viewH]);

  const canvasW = (viewW || winW) * 2;
  const canvasH = (viewH || winH) * 2;

  return (
    <View
      style={styles.container}
      {...(Platform.OS === 'web' ? {} : panResponder.panHandlers)}
      testID="constellation-container"
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        const h = e.nativeEvent.layout.height;
        if (w > 0 && h > 0) {
          if (w !== viewW) setViewW(w);
          if (h !== viewH) setViewH(h);
        }
      }}
      {...(Platform.OS === 'web' ? { onWheel: handleWheel as unknown as any } : {})}
    >
      {spaceLayers.map((layer, idx) => (
        <Animated.View
          key={`space-layer-${idx}`}
          pointerEvents="none"
          testID={layer.testID}
          style={[
            styles.constellation,
            { width: canvasW, height: canvasH },
            {
              transform: [
                { translateX: Animated.add(Animated.multiply(panAnim.x, layer.factor), Animated.multiply(tiltX, layer.factor * TILT_PARALLAX_BOOST)) },
                { translateY: Animated.add(Animated.multiply(panAnim.y, layer.factor), Animated.multiply(tiltY, layer.factor * TILT_PARALLAX_BOOST)) },
              ],
            },
          ]}
        >
          <Svg width={canvasW} height={canvasH}>
            <Defs>
              {layer.objects.map((o, i) => (
                <RadialGradient key={`pl-grad-${idx}-${i}`} id={`pl-grad-${idx}-${i}`} cx={o.x} cy={o.y} r={o.size * 1.4} gradientUnits="userSpaceOnUse">
                  <Stop offset="0%" stopColor={o.glow} stopOpacity={0.25} />
                  <Stop offset="60%" stopColor={o.glow} stopOpacity={0.08} />
                  <Stop offset="100%" stopColor={o.glow} stopOpacity={0} />
                </RadialGradient>
              ))}
            </Defs>
            <G>
              {layer.objects.map((o, i) => (
                <G key={`planet-${idx}-${i}`} opacity={0.5}>
                  <Circle cx={o.x} cy={o.y} r={o.size * 0.95} fill={`url(#pl-grad-${idx}-${i})`} />
                  <Circle cx={o.x} cy={o.y} r={o.size * 0.6} fill={o.core} opacity={0.22} />
                  {o.ring ? (
                    <Circle cx={o.x} cy={o.y} r={o.size * 0.8} stroke={o.glow} strokeWidth={2} opacity={0.18} />
                  ) : null}
                </G>
              ))}
            </G>
          </Svg>
        </Animated.View>
      ))}

      {starLayers.map((layer, layerIdx) => (
        <Animated.View
          key={`star-layer-${layerIdx}`}
          pointerEvents="none"
          testID={layer.testID}
          style={[
            styles.constellation,
            { width: canvasW, height: canvasH },
            {
              transform: [
                { translateX: Animated.add(Animated.multiply(panAnim.x, layer.factor), Animated.multiply(tiltX, layer.factor * TILT_PARALLAX_BOOST)) },
                { translateY: Animated.add(Animated.multiply(panAnim.y, layer.factor), Animated.multiply(tiltY, layer.factor * TILT_PARALLAX_BOOST)) }
              ],
            },
          ]}
        >
          {layer.stars.map((star, idx) => (
            <Animated.View
              key={`star-${layerIdx}-${idx}`}
              style={[
                styles.star,
                {
                  left: star.x,
                  top: star.y,
                  width: star.size,
                  height: star.size,
                  borderRadius: star.size / 2,
                  opacity: star.opacity,
                },
              ]}
            />
          ))}
        </Animated.View>
      ))}

      {shooting.map((s) => (
        <Animated.View
          key={s.id}
          pointerEvents="none"
          testID="shooting-star"
          style={[
            styles.shootingStar,
            {
              left: s.startX,
              top: s.startY,
              width: s.size * 10,
              height: s.size,
              transform: [
                { translateX: Animated.add(Animated.add(Animated.multiply(panAnim.x, s.factor), Animated.multiply(tiltX, s.factor * TILT_PARALLAX_BOOST)), Animated.multiply(s.anim, s.dx)) },
                { translateY: Animated.add(Animated.add(Animated.multiply(panAnim.y, s.factor), Animated.multiply(tiltY, s.factor * TILT_PARALLAX_BOOST)), Animated.multiply(s.anim, s.dy)) },
                { rotate: s.angleDeg },
              ],
              opacity: s.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 1, 0] }),
            },
          ]}
        />
      ))}

      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Animated.View style={styles.emptyOrb} />
        </View>
      ) : (
        <Animated.View
          style={[
            styles.constellation,
            { width: canvasW, height: canvasH },
            {
              transform: [
                { scale: scaleAnim },
                { translateX: panAnim.x },
                { translateY: panAnim.y },
              ],
            },
          ]}
        >
          <Svg width={canvasW} height={canvasH}>
            <Defs>
              <RadialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={colors.constellation.orbGlow} stopOpacity="0.6" />
                <Stop offset="100%" stopColor={colors.constellation.orbGlow} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <G testID="connections-layer">
              {edges.map((e, idx) => (
                <Line
                  key={`edge-${idx}`}
                  x1={e.a.x}
                  y1={e.a.y}
                  x2={e.b.x}
                  y2={e.b.y}
                  stroke={`rgba(178,75,243,${Math.max(0.05, 0.25 - e.d / 600)})`}
                  strokeWidth={1}
                />
              ))}
            </G>
            <G testID="orbs-layer">
              {positions.map((p) => {
                const c = colorForAge(p.ageDays, p.color);
                const gradId = `orb-grad-${p.id}`;
                const glowRadius = 46;
                const coreRadius = 6;
                return (
                  <G key={`orb-${p.id}`}>
                    <Defs>
                      <RadialGradient
                        id={gradId}
                        cx={p.x}
                        cy={p.y}
                        r={glowRadius}
                        gradientUnits="userSpaceOnUse"
                      >
                        <Stop offset="0%" stopColor={c} stopOpacity={0.55} />
                        <Stop offset="45%" stopColor={c} stopOpacity={0.22} />
                        <Stop offset="75%" stopColor={c} stopOpacity={0.10} />
                        <Stop offset="100%" stopColor={c} stopOpacity={0} />
                      </RadialGradient>
                    </Defs>
                    <Circle cx={p.x} cy={p.y} r={glowRadius} fill={`url(#${gradId})`} />
                    <Circle cx={p.x} cy={p.y} r={coreRadius} fill={c} />
                  </G>
                );
              })}
            </G>
            <G testID="shimmer-overlay">
              {positions.filter((_, i) => (i + 1) % 10 === 0).map((p, idx) => (
                <Circle key={`milestone-${idx}`} cx={p.x} cy={p.y} r={24} fill="url(#orbGlow)" opacity={0.2} />
              ))}
            </G>
          </Svg>
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, { width: canvasW, height: canvasH }]}>
            {positions.map((p) => (
              <View
                key={`orb-hit-${p.id}`}
                style={{ position: 'absolute', left: p.x - 24, top: p.y - 24, width: 48, height: 48, borderRadius: 24 }}
                testID={`orb-hit-${p.id}`}
              >
                <Pressable onPress={() => openEntry(p.id)} style={StyleSheet.absoluteFill} testID={`orb-press-${p.id}`} accessibilityRole="button" accessibilityLabel={`Open entry ${p.id}`} />
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyOrb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.constellation.emptyOrb,
    borderWidth: 2,
    borderColor: colors.constellation.emptyOrbBorder,
    borderStyle: "dashed" as const,
  },
  constellation: {
    position: "absolute",
    width: winW * 2,
    height: winH * 2,
  },
  star: {
    position: "absolute" as const,
    backgroundColor: colors.constellation.star,
    shadowColor: colors.constellation.starGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
  },
  shootingStar: {
    position: 'absolute' as const,
    backgroundColor: colors.constellation.shootingStar,
    borderRadius: 1,
    shadowColor: colors.constellation.shootingStar,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});