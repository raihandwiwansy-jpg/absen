'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import CameraFrame from '@/components/CameraFrame';
import { ToastContainer, useToast } from '@/components/Toast';
import type { AnggotaEmbedding } from '@/lib/face-matcher';

// FaceDetector must be client-only (uses browser APIs)
const FaceDetector = dynamic(() => import('@/components/FaceDetector'), { ssr: false });

type PageState = 'idle' | 'requesting' | 'denied' | 'active' | 'error';

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [pageState, setPageState] = useState<PageState>('idle');
  const [detectorStatus, setDetectorStatus] = useState<string>('');
  const [faceBbox, setFaceBbox] = useState<[number, number, number, number] | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [database, setDatabase] = useState<AnggotaEmbedding[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { toasts, addToast, dismissToast } = useToast();

  // Fetch face database
  const fetchDatabase = useCallback(async () => {
    try {
      const res = await fetch('/api/embeddings');
      if (res.ok) {
        const data = await res.json();
        setDatabase(data);
      }
    } catch {
      // ignore
    } finally {
      setDbLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchDatabase();
    // Auto-refresh data tanpa reload (polling 5 detik)
    const timer = setInterval(() => {
      fetchDatabase();
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchDatabase]);

  // Start camera
  const startCamera = useCallback(async () => {
    setPageState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 480, max: 640 },
          height: { ideal: 480, max: 640 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setPageState('active');
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPageState('denied');
      } else {
        setPageState('error');
        addToast('Gagal mengakses kamera. Coba refresh halaman.', 'error');
      }
    }
  }, [addToast]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setPageState('idle');
    setFaceBbox(null);
    setFaceDetected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Handle face match
  const handleMatch = useCallback(
    async (anggota: AnggotaEmbedding) => {
      try {
        const res = await fetch('/api/absensi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anggotaId: anggota.id }),
        });
        const data = await res.json();

        if (data.alreadyRecorded) {
          addToast(`ℹ️ Halo ${anggota.nama}, Anda sudah absen hari ini!`, 'info', 6000);
          stopCamera();
        } else if (res.ok && data.success) {
          addToast(`✅ Halo ${anggota.nama}! Absen berhasil dicatat ✓`, 'success', 6000);
          stopCamera();
        } else {
          addToast(`❌ Gagal mencatat absensi untuk ${anggota.nama}: ${data.error || 'Error'}`, 'error', 5000);
        }
      } catch {
        addToast(`Halo, ${anggota.nama}! (Gagal terhubung ke server)`, 'warning', 5000);
      }
    },
    [addToast, stopCamera]
  );

  // Handle no match
  const handleNoMatch = useCallback(() => {
    if (database.length === 0) {
      addToast('Belum ada wajah terdaftar. Hubungi admin.', 'info', 3000);
    } else {
      addToast('Wajah tidak terdaftar', 'warning', 3000);
    }
  }, [database.length, addToast]);

  // Handle detector status changes
  const handleStatusChange = useCallback(
    (state: { status: string; errorMsg?: string; faceBbox?: [number, number, number, number] | null; faceDetected: boolean }) => {
      setFaceBbox(state.faceBbox ?? null);
      setFaceDetected(state.faceDetected);

      switch (state.status) {
        case 'loading':
          setDetectorStatus('Memuat model AI...');
          break;
        case 'ready':
          setDetectorStatus('Siap mendeteksi wajah');
          break;
        case 'detecting':
          setDetectorStatus(state.faceDetected ? 'Wajah terdeteksi...' : 'Arahkan wajah ke kamera');
          break;
        case 'matching':
          setDetectorStatus('Mencocokkan wajah...');
          break;
        case 'cooldown':
          setDetectorStatus('Tercatat! Tunggu sebentar...');
          break;
        case 'error':
          setDetectorStatus(state.errorMsg ?? 'Error');
          addToast(state.errorMsg ?? 'Error memuat model', 'error', 8000);
          break;
      }
    },
    [addToast]
  );

  const dbEmpty = dbLoaded && database.length === 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
      <Navbar />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Face Detector (logic only, no UI) */}
      {pageState === 'active' && dbLoaded && (
        <FaceDetector
          videoRef={videoRef}
          database={database}
          dbEmpty={dbEmpty}
          isActive={pageState === 'active'}
          onMatch={handleMatch}
          onNoMatch={handleNoMatch}
          onStatusChange={handleStatusChange}
          cooldownMs={7000}
        />
      )}

      {/* Main content */}
      <main
        style={{
          paddingTop: '80px',
          paddingBottom: '48px',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: '20px',
          paddingRight: '20px',
        }}
      >
        <div className="desktop-split" style={{ width: '100%', maxWidth: '1080px' }}>
          
          {/* Sisi Kiri: Scanner Kamera & Kontrol */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Header text */}
            <div
              style={{ textAlign: 'center', marginBottom: '24px' }}
              className="animate-fade-in-up"
            >
              <h1
                style={{
                  fontSize: 'clamp(24px, 4vw, 36px)',
                  fontWeight: 700,
                  color: '#D4AF37',
                  marginBottom: '6px',
                  letterSpacing: '-0.01em',
                }}
              >
                Absensi Face Recognition
              </h1>
              <p style={{ fontSize: '14px', color: '#888888' }}>
                Arahkan wajah Anda ke bingkai emas untuk mencatat kehadiran
              </p>
            </div>

            {/* Camera Frame */}
            <div
              style={{ width: '100%', maxWidth: '480px', display: 'flex', justifyContent: 'center' }}
              className="animate-fade-in-up"
            >
              <CameraFrame
                ref={videoRef}
                isActive={pageState === 'active'}
                faceBbox={faceBbox}
                faceDetected={faceDetected}
                statusMessage={
                  pageState === 'idle'
                    ? 'Tekan tombol di bawah untuk mulai absen'
                    : pageState === 'denied'
                    ? 'Akses kamera ditolak'
                    : pageState === 'requesting'
                    ? 'Meminta izin kamera...'
                    : undefined
                }
              />
            </div>

            {/* Status label below frame */}
            {pageState === 'active' && detectorStatus && (
              <p
                style={{
                  marginTop: '16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: faceDetected ? '#00ff88' : '#888888',
                  transition: 'color 0.3s ease',
                }}
                className="animate-fade-in"
              >
                {detectorStatus}
              </p>
            )}

            {/* Action area */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
              
              {/* === IDLE: big start button === */}
              {pageState === 'idle' && (
                <button
                  id="btn-mulai-absen"
                  onClick={startCamera}
                  className="btn-gold animate-gold-pulse animate-fade-in-up"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '16px 36px',
                    fontSize: '18px',
                    fontWeight: 700,
                    borderRadius: '16px',
                    letterSpacing: '0.02em',
                    fontFamily: 'Poppins, sans-serif',
                    width: '100%',
                    maxWidth: '320px',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Mulai Absen
                </button>
              )}

              {/* === REQUESTING: loading indicator === */}
              {pageState === 'requesting' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#D4AF37' }}>
                  <div
                    className="animate-spin"
                    style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid rgba(212,175,55,0.3)',
                      borderTopColor: '#D4AF37',
                      borderRadius: '50%',
                    }}
                  />
                  <span style={{ fontSize: '14px' }}>Meminta izin kamera...</span>
                </div>
              )}

              {/* === DENIED: error + retry === */}
              {pageState === 'denied' && (
                <div
                  className="animate-fade-in"
                  style={{
                    textAlign: 'center',
                    padding: '20px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    maxWidth: '340px',
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>🚫</div>
                  <p style={{ fontSize: '14px', color: '#f5f5f5', marginBottom: '6px', fontWeight: 600 }}>
                    Akses Kamera Ditolak
                  </p>
                  <p style={{ fontSize: '13px', color: '#888888', lineHeight: 1.6, marginBottom: '16px' }}>
                    Aktifkan izin kamera di pengaturan browser untuk melakukan absen.
                  </p>
                  <button
                    onClick={startCamera}
                    className="btn-outline-gold"
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  >
                    Coba Lagi
                  </button>
                </div>
              )}

              {/* === ACTIVE: stop button === */}
              {pageState === 'active' && (
                <button
                  onClick={stopCamera}
                  className="btn-outline-gold"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                  Stop Kamera
                </button>
              )}

              {/* === DB EMPTY warning === */}
              {pageState === 'active' && dbEmpty && (
                <p
                  className="animate-fade-in"
                  style={{
                    fontSize: '13px',
                    color: '#D4AF37',
                    textAlign: 'center',
                    maxWidth: '320px',
                    lineHeight: 1.6,
                  }}
                >
                  ⚠️ Belum ada wajah terdaftar. Hubungi admin untuk mendaftarkan wajah anggota.
                </p>
              )}
            </div>
          </div>

          {/* Sisi Kanan / Bawah pada Mobile: Command Center Widget */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            
            {/* Widget Jam Digital Real-Time */}
            <div
              className="card-dark"
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(17,17,17,0.9))',
                border: '1px solid var(--border-gold-bright)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  🕒 Waktu Lokal (WIB)
                </span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 8px #00ff88' }} />
              </div>

              <div style={{ fontSize: '32px', fontWeight: 700, color: '#f5f5f5', fontFamily: 'monospace', letterSpacing: '0.04em', margin: '4px 0' }}>
                {currentTime ? (
                  `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}:${String(currentTime.getSeconds()).padStart(2, '0')}`
                ) : (
                  '--:--:--'
                )}
              </div>

              <div style={{ fontSize: '13px', color: '#aaa', marginTop: '4px', fontWeight: 500 }}>
                {currentTime ? (
                  currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                ) : (
                  'Memuat tanggal...'
                )}
              </div>
            </div>

            {/* Widget Status & Instruksi */}
            <div className="card-dark" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37' }}>
                  📌
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f5' }}>Panduan Absensi</div>
                  <div style={{ fontSize: '12px', color: '#888888' }}>Ikuti 3 langkah cepat</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#ccc' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#D4AF37', fontWeight: 700 }}>1.</span>
                  <span>Klik tombol <b>Mulai Absen</b> dan berikan izin kamera pada browser.</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#D4AF37', fontWeight: 700 }}>2.</span>
                  <span>Posisikan wajah di dalam kotak emas hingga berubah warna menjadi hijau.</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#D4AF37', fontWeight: 700 }}>3.</span>
                  <span>Tunggu 1-2 detik hingga muncul notifikasi konfirmasi absensi berhasil!</span>
                </div>
              </div>

              <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888888' }}>
                <span>👥 Anggota Terdaftar:</span>
                <span style={{ color: '#D4AF37', fontWeight: 600 }}>{database.length} Wajah</span>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Bottom decoration */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)',
        }}
      />
    </div>
  );
}
