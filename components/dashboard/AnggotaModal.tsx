'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { humanConfig } from '@/lib/human-config';

interface AnggotaModalProps {
  onClose: () => void;
  onSaved: () => void;
  editAnggota?: { id: number; nama: string } | null;
}

const SAMPLE_COUNT = 5;

const SAMPLE_INSTRUCTIONS = [
  {
    title: "1. Tatap Lurus ke Depan",
    desc: "Posisi wajah netral menghadap langsung ke lensa kamera.",
    icon: "😐"
  },
  {
    title: "2. Tersenyum Natural",
    desc: "Tatap lurus ke depan dengan sedikit senyuman natural.",
    icon: "😊"
  },
  {
    title: "3. Menoleh Sedikit ke KIRI",
    desc: "Putar kepala sekitar 15° ke kiri agar profil samping kiri terdata.",
    icon: "⬅️"
  },
  {
    title: "4. Menoleh Sedikit ke KANAN",
    desc: "Putar kepala sekitar 15° ke kanan agar profil samping kanan terdata.",
    icon: "➡️"
  },
  {
    title: "5. Sedikit Tundukkan / Angkat Dagu",
    desc: "Miringkan kepala sedikit ke atas atau bawah untuk variasi vertikal.",
    icon: "↕️"
  }
];

export default function AnggotaModal({ onClose, onSaved, editAnggota }: AnggotaModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const humanRef = useRef<unknown>(null);

  const [nama, setNama] = useState(editAnggota?.nama ?? '');
  const [step, setStep] = useState<'form' | 'capture' | 'processing' | 'done'>('form');
  const [samples, setSamples] = useState<number[][]>([]);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [duplicateErrorMsg, setDuplicateErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [humanLoading, setHumanLoading] = useState(false);
  const [humanError, setHumanError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Load Human and start camera when entering capture step
  const startCaptureMode = useCallback(async () => {
    if (!nama.trim()) return;
    setStep('capture');
    setCameraError(null);
    setHumanError(null);
    setDuplicateErrorMsg(null);
    setSamples([]);
    setThumbnail(null);
    setHumanLoading(true);

    // Start camera dengan constraint hemat untuk device berspesifikasi rendah
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480, max: 640 }, height: { ideal: 480, max: 640 }, frameRate: { ideal: 24, max: 30 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
      setHumanLoading(false);
      return;
    }

    // Load Human.js
    try {
      const { Human } = await import('@vladmandic/human');
      // @ts-ignore
      const human = new Human(humanConfig);
      await human.load();
      await human.warmup();
      humanRef.current = human;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const fileMatch = errMsg.match(/\/models\/([^'"]+)/);
      const failedFile = fileMatch ? fileMatch[1] : 'unknown model file';
      if (mountedRef.current) {
        setHumanError(`Gagal memuat model "${failedFile}". Pastikan file model sudah ada di public/models/.`);
      }
    } finally {
      if (mountedRef.current) setHumanLoading(false);
    }
  }, [nama]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  // Capture one sample
  const captureOneSample = useCallback(async () => {
    const human = humanRef.current as Record<string, unknown> | null;
    const video = videoRef.current;
    if (!human || !video || capturing) return;

    setCapturing(true);

    try {
      // @ts-ignore
      const result = await human.detect(video);
      const faces = result?.face ?? [];

      if (faces.length === 0) {
        alert('Wajah tidak terdeteksi. Pastikan wajah terlihat jelas di kamera.');
        setCapturing(false);
        return;
      }

      const face = faces[0];
      const embedding = face.embedding as number[] | undefined;

      if (!embedding || embedding.length === 0) {
        alert('Gagal mengambil embedding wajah. Coba lagi.');
        setCapturing(false);
        return;
      }

      const newSamples = [...samples, Array.from(embedding)];
      setSamples(newSamples);

      // Save thumbnail from first sample
      if (newSamples.length === 1 && video) {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, 160, 160);
          setThumbnail(canvas.toDataURL('image/jpeg', 0.7));
        }
      }

      // All samples collected
      if (newSamples.length >= SAMPLE_COUNT) {
        setStep('processing');
        stopCamera();
        await saveAnggota(newSamples);
      }
    } catch (err) {
      console.error('Capture error:', err);
      alert('Error saat capture. Coba lagi.');
    } finally {
      if (mountedRef.current) setCapturing(false);
    }
  }, [samples, capturing, stopCamera]);

  const saveAnggota = useCallback(
    async (descriptors: number[][]) => {
      setSaving(true);
      try {
        const url = editAnggota ? `/api/anggota/${editAnggota.id}` : '/api/anggota';
        const method = editAnggota ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama: nama.trim(),
            embeddings: descriptors,
            thumbnailBase64: thumbnail,
          }),
        });

        if (res.ok) {
          setStep('done');
          onSaved();
        } else {
          const err = await res.json();
          const msg = err.error || 'Gagal menyimpan anggota.';
          setDuplicateErrorMsg(msg);
          setSamples([]);
          setStep('capture');
        }
      } catch {
        setDuplicateErrorMsg('Terjadi kesalahan saat menyimpan.');
        setSamples([]);
        setStep('capture');
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    },
    [editAnggota, nama, thumbnail, onSaved]
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-fade-in-up card-dark"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '28px 24px',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f5f5f5' }}>
            {editAnggota ? 'Edit Anggota' : 'Tambah Anggota'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888888',
              cursor: 'pointer',
              fontSize: '20px',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Step: Form */}
        {step === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#D4AF37', marginBottom: '6px', fontWeight: 500 }}>
                Nama Anggota
              </label>
              <input
                id="input-nama-anggota"
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="input-dark"
                autoFocus
              />
            </div>
            <button
              id="btn-open-camera-capture"
              onClick={startCaptureMode}
              disabled={!nama.trim()}
              className="btn-gold"
              style={{
                padding: '14px',
                borderRadius: '10px',
                fontSize: '15px',
                fontFamily: 'Poppins, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: nama.trim() ? 1 : 0.5,
                cursor: nama.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Buka Kamera & Capture Wajah
            </button>
          </div>
        )}

        {/* Step: Capture */}
        {step === 'capture' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            {/* Progress */}
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: '#888888' }}>Sample wajah</span>
                <span style={{ color: '#D4AF37', fontWeight: 600 }}>{samples.length} / {SAMPLE_COUNT}</span>
              </div>
              <div style={{ height: '6px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(samples.length / SAMPLE_COUNT) * 100}%`,
                    background: 'linear-gradient(90deg, #D4AF37, #F0D060)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Error box untuk Duplikasi Wajah */}
            {duplicateErrorMsg && (
              <div
                className="animate-fade-in"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#ef4444',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '18px', flexShrink: 0 }}>🚫</span>
                <div>
                  <strong style={{ display: 'block', marginBottom: '2px', color: '#ff6b6b' }}>Duplikasi / Error Registrasi</strong>
                  {duplicateErrorMsg}
                </div>
              </div>
            )}

            {/* Camera */}
            {cameraError ? (
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444',
                  fontSize: '13px',
                  textAlign: 'center',
                }}
              >
                {cameraError}
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '2px solid rgba(212,175,55,0.5)',
                  position: 'relative',
                  background: '#0a0a0a',
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                  }}
                />
                {humanLoading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      className="animate-spin"
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid rgba(212,175,55,0.3)',
                        borderTopColor: '#D4AF37',
                        borderRadius: '50%',
                      }}
                    />
                    <p style={{ fontSize: '13px', color: '#D4AF37' }}>Memuat model AI...</p>
                  </div>
                )}
              </div>
            )}

            {humanError && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444',
                  fontSize: '12px',
                  lineHeight: 1.6,
                }}
              >
                {humanError}
              </div>
            )}

            {/* Instruksi Gerakan Kepala Dinamis */}
            {samples.length < SAMPLE_COUNT && (
              <div
                className="animate-fade-in"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(212,175,55,0.12)',
                  border: '1px solid rgba(212,175,55,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '28px', flexShrink: 0 }}>
                  {SAMPLE_INSTRUCTIONS[samples.length]?.icon || '📸'}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#D4AF37', marginBottom: '2px' }}>
                    Arahan Sample #{samples.length + 1}: {SAMPLE_INSTRUCTIONS[samples.length]?.title.split('. ')[1]}
                  </p>
                  <p style={{ fontSize: '12px', color: '#dddddd', lineHeight: 1.4 }}>
                    {SAMPLE_INSTRUCTIONS[samples.length]?.desc}
                  </p>
                </div>
              </div>
            )}

            {/* Sample dots */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '4px 0' }}>
              {Array.from({ length: SAMPLE_COUNT }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: i < samples.length ? '#D4AF37' : 'rgba(212,175,55,0.2)',
                    border: i === samples.length ? '2px solid #f5f5f5' : '1px solid rgba(212,175,55,0.4)',
                    boxShadow: i < samples.length ? '0 0 8px rgba(212,175,55,0.6)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            {/* Capture button */}
            <button
              id="btn-capture-sample"
              onClick={captureOneSample}
              disabled={capturing || humanLoading || !!humanError || !!cameraError}
              className="btn-gold"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                fontSize: '15px',
                fontFamily: 'Poppins, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: (capturing || humanLoading || !!humanError || !!cameraError) ? 0.5 : 1,
                cursor: (capturing || humanLoading || !!humanError || !!cameraError) ? 'not-allowed' : 'pointer',
              }}
            >
              {capturing ? (
                <>
                  <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%' }} />
                  Mengambil...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  Ambil Sample {samples.length + 1} ({SAMPLE_INSTRUCTIONS[samples.length]?.title.split('. ')[1] || ''})
                </>
              )}
            </button>

            <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', lineHeight: 1.5 }}>
              💡 <strong style={{ color: '#aaa' }}>Mengapa bergerak sedikit?</strong> Variasi posisi wajah (depan, senyum, kiri, kanan, & atas/bawah) memastikan sistem mengenali anggota dari berbagai sudut saat absensi lapangan.
            </p>

            <button
              onClick={() => { stopCamera(); setStep('form'); setSamples([]); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#888888',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              Batal
            </button>
          </div>
        )}

        {/* Step: Processing / Saving */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div
              className="animate-spin"
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid rgba(212,175,55,0.2)',
                borderTopColor: '#D4AF37',
                borderRadius: '50%',
              }}
            />
            <p style={{ fontSize: '15px', color: '#f5f5f5' }}>Menyimpan data wajah...</p>
            <p style={{ fontSize: '13px', color: '#888888' }}>Harap tunggu</p>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(34,197,94,0.15)',
                border: '2px solid rgba(34,197,94,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
              }}
            >
              ✓
            </div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#22c55e', marginBottom: '6px' }}>Berhasil Disimpan!</p>
              <p style={{ fontSize: '14px', color: '#888888' }}>{nama} telah terdaftar dengan {SAMPLE_COUNT} sample wajah.</p>
            </div>
            <button
              onClick={onClose}
              className="btn-gold"
              style={{ padding: '12px 32px', borderRadius: '10px', fontSize: '14px', fontFamily: 'Poppins, sans-serif' }}
            >
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
