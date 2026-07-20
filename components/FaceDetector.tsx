'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { AnggotaEmbedding } from '@/lib/face-matcher';
import { humanConfig } from '@/lib/human-config';

type FaceDetectorStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'detecting'
  | 'matching'
  | 'cooldown'
  | 'error';

interface FaceDetectorState {
  status: FaceDetectorStatus;
  errorMsg?: string;
  faceBbox?: [number, number, number, number] | null;
  faceDetected: boolean;
}

interface FaceDetectorProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  database: AnggotaEmbedding[];
  dbEmpty: boolean;
  isActive: boolean;
  onMatch: (anggota: AnggotaEmbedding) => void;
  onNoMatch: () => void;
  onStatusChange: (state: FaceDetectorState) => void;
  /** Cooldown ms before same person can be matched again */
  cooldownMs?: number;
}

// Minimum frames wajah harus stabil sebelum matching dijalankan
const STABILITY_FRAMES = 8;
// Threshold similarity
const SIMILARITY_THRESHOLD = 0.60;

export default function FaceDetector({
  videoRef,
  database,
  dbEmpty,
  isActive,
  onMatch,
  onNoMatch,
  onStatusChange,
  cooldownMs = 7000,
}: FaceDetectorProps) {
  const humanRef = useRef<unknown>(null);
  const animFrameRef = useRef<number | null>(null);
  const stableCountRef = useRef(0);
  const lastDescRef = useRef<number[] | null>(null);
  const cooldownMapRef = useRef<Map<number, number>>(new Map());
  const matchingRef = useRef(false);
  const mountedRef = useRef(true);
  const loadAttemptedRef = useRef(false);
  const lastDetectTimeRef = useRef(0);

  const emitStatus = useCallback((state: FaceDetectorState) => {
    if (mountedRef.current) onStatusChange(state);
  }, [onStatusChange]);

  // Load Human.js model
  const loadHuman = useCallback(async () => {
    if (loadAttemptedRef.current) return;
    loadAttemptedRef.current = true;

    emitStatus({ status: 'loading', faceDetected: false });

    try {
      // Dynamic import to avoid SSR issues
      const { Human } = await import('@vladmandic/human');

      // @ts-ignore - Human config types can vary
      const human = new Human(humanConfig);

      // Load models with specific error reporting
      try {
        await human.load();
      } catch (loadErr: unknown) {
        const errMsg = loadErr instanceof Error ? loadErr.message : String(loadErr);
        // Try to extract which file failed
        const fileMatch = errMsg.match(/\/models\/([^'"]+)/);
        const failedFile = fileMatch ? fileMatch[1] : 'unknown model file';
        throw new Error(`Gagal memuat model "${failedFile}". Pastikan file model sudah didownload ke folder public/models/`);
      }

      await human.warmup();

      humanRef.current = human;
      if (mountedRef.current) {
        emitStatus({ status: 'ready', faceDetected: false });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat model Human.js';
      console.error('[FaceDetector] Load error:', err);
      if (mountedRef.current) {
        emitStatus({ status: 'error', errorMsg: msg, faceDetected: false });
      }
    }
  }, [emitStatus]);

  // Cosine similarity inline
  function cosineSim(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  // Main detection loop with 10 FPS Throttle for Low-End Device Boost
  const detectLoop = useCallback(async () => {
    if (!mountedRef.current || !isActive) return;
    
    const human = humanRef.current as Record<string, unknown> | null;
    const video = videoRef.current;

    if (!human || !video || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    const now = performance.now();
    // Throttle maksimal 10 FPS (~100ms interval) agar sangat ringan di CPU & GPU spesifikasi rendah
    if (now - lastDetectTimeRef.current < 100) {
      animFrameRef.current = requestAnimationFrame(detectLoop);
      return;
    }
    lastDetectTimeRef.current = now;

    try {
      // Detect at lower resolution for speed
      // @ts-ignore
      const result = await human.detect(video);
      if (!mountedRef.current) return;

      const faces = result?.face ?? [];

      if (faces.length === 0) {
        stableCountRef.current = 0;
        lastDescRef.current = null;
        emitStatus({ status: 'detecting', faceDetected: false, faceBbox: null });
        animFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      // Take the most confident face
      const face = faces[0];
      const bbox = face.box as number[] | undefined;
      const descriptor = face.embedding as number[] | undefined;

      // Normalize bbox [x, y, w, h] to 0-1 relative to video dimensions
      let normalizedBbox: [number, number, number, number] | null = null;
      if (bbox && video.videoWidth > 0 && video.videoHeight > 0) {
        normalizedBbox = [
          bbox[0] / video.videoWidth,
          bbox[1] / video.videoHeight,
          bbox[2] / video.videoWidth,
          bbox[3] / video.videoHeight,
        ];
      }

      emitStatus({ status: 'detecting', faceDetected: true, faceBbox: normalizedBbox });

      if (!descriptor || descriptor.length === 0) {
        stableCountRef.current = 0;
        animFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      // Check stability: compare current descriptor with previous
      const prevDesc = lastDescRef.current;
      if (prevDesc) {
        const sim = cosineSim(descriptor, prevDesc);
        if (sim > 0.97) {
          stableCountRef.current += 1;
        } else {
          stableCountRef.current = 1;
        }
      } else {
        stableCountRef.current = 1;
      }
      lastDescRef.current = Array.from(descriptor);

      // Only run matching when face is stable and not already matching
      if (stableCountRef.current >= STABILITY_FRAMES && !matchingRef.current) {
        matchingRef.current = true;
        stableCountRef.current = 0; // reset

        emitStatus({ status: 'matching', faceDetected: true, faceBbox: normalizedBbox });

        // Run matching
        const desc = Array.from(descriptor);
        let bestSim = -1;
        let bestAnggota: AnggotaEmbedding | null = null;

        for (const anggota of database) {
          for (const storedDesc of anggota.embeddings) {
            const s = cosineSim(desc, storedDesc);
            if (s > bestSim) {
              bestSim = s;
              bestAnggota = anggota;
            }
          }
        }

        if (bestSim >= SIMILARITY_THRESHOLD && bestAnggota) {
          const now = Date.now();
          const lastSeen = cooldownMapRef.current.get(bestAnggota.id) ?? 0;

          if (now - lastSeen > cooldownMs) {
            cooldownMapRef.current.set(bestAnggota.id, now);
            onMatch(bestAnggota);

            // Cooldown period - pause detection
            emitStatus({ status: 'cooldown', faceDetected: true, faceBbox: normalizedBbox });
            await new Promise((r) => setTimeout(r, cooldownMs));
          }
        } else if (database.length > 0) {
          onNoMatch();
        }

        matchingRef.current = false;
        emitStatus({ status: 'detecting', faceDetected: false, faceBbox: null });
      }
    } catch (err) {
      console.warn('[FaceDetector] Detection error:', err);
    }

    if (mountedRef.current && isActive) {
      animFrameRef.current = requestAnimationFrame(detectLoop);
    }
  }, [isActive, database, onMatch, onNoMatch, cooldownMs, emitStatus, videoRef]);

  // Start/stop detection loop when isActive changes
  useEffect(() => {
    if (isActive) {
      loadHuman().then(() => {
        if (mountedRef.current && humanRef.current) {
          emitStatus({ status: 'detecting', faceDetected: false });
          animFrameRef.current = requestAnimationFrame(detectLoop);
        }
      });
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }
  }, [isActive, loadHuman, detectLoop, emitStatus]);

  // Watch humanRef ready + isActive to start loop
  useEffect(() => {
    if (isActive && humanRef.current && animFrameRef.current === null) {
      animFrameRef.current = requestAnimationFrame(detectLoop);
    }
  }, [isActive, detectLoop]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // This is a logic-only component, no UI rendered
  return null;
}
