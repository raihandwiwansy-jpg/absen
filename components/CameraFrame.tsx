'use client';

import { useRef, useEffect, forwardRef } from 'react';

interface CameraFrameProps {
  /** Whether the camera feed is active */
  isActive: boolean;
  /** Face bounding box to overlay [x, y, width, height] normalized 0-1 */
  faceBbox?: [number, number, number, number] | null;
  /** Status message shown inside frame when not active */
  statusMessage?: string;
  /** Whether a face is currently detected */
  faceDetected?: boolean;
}

const CameraFrame = forwardRef<HTMLVideoElement, CameraFrameProps>(
  ({ isActive, faceBbox, faceDetected, statusMessage }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Draw bounding box on canvas whenever faceBbox changes
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (faceBbox) {
        const [x, y, w, h] = faceBbox;
        const px = x * canvas.width;
        const py = y * canvas.height;
        const pw = w * canvas.width;
        const ph = h * canvas.height;

        // Draw rounded bounding box
        ctx.strokeStyle = faceDetected ? '#00ff88' : '#D4AF37';
        ctx.lineWidth = 2;
        ctx.shadowColor = faceDetected ? '#00ff88' : '#D4AF37';
        ctx.shadowBlur = 8;

        const radius = 8;
        ctx.beginPath();
        ctx.moveTo(px + radius, py);
        ctx.lineTo(px + pw - radius, py);
        ctx.quadraticCurveTo(px + pw, py, px + pw, py + radius);
        ctx.lineTo(px + pw, py + ph - radius);
        ctx.quadraticCurveTo(px + pw, py + ph, px + pw - radius, py + ph);
        ctx.lineTo(px + radius, py + ph);
        ctx.quadraticCurveTo(px, py + ph, px, py + ph - radius);
        ctx.lineTo(px, py + radius);
        ctx.quadraticCurveTo(px, py, px + radius, py);
        ctx.closePath();
        ctx.stroke();
      }
    }, [faceBbox, faceDetected]);

    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          aspectRatio: '1 / 1',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '2px solid rgba(212, 175, 55, 0.6)',
          boxShadow: isActive
            ? '0 0 30px rgba(212, 175, 55, 0.4), 0 0 60px rgba(212, 175, 55, 0.15), inset 0 0 30px rgba(212, 175, 55, 0.05)'
            : '0 0 20px rgba(212, 175, 55, 0.2)',
          transition: 'box-shadow 0.5s ease',
          background: '#0a0a0a',
        }}
      >
        {/* Video element */}
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: isActive ? 'block' : 'none',
            transform: 'scaleX(-1)', // mirror for selfie feel
          }}
        />

        {/* Canvas for bounding boxes */}
        <canvas
          ref={canvasRef}
          width={480}
          height={480}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: isActive ? 'block' : 'none',
            pointerEvents: 'none',
            transform: 'scaleX(-1)',
          }}
        />

        {/* Scanner Line */}
        {isActive && (
          <div
            className="animate-scan"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #00ff88, transparent)',
              boxShadow: '0 0 8px #00ff88, 0 0 16px rgba(0,255,136,0.5)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        )}

        {/* Corner decorations */}
        {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
          <div
            key={corner}
            style={{
              position: 'absolute',
              width: '20px',
              height: '20px',
              borderColor: '#D4AF37',
              borderStyle: 'solid',
              borderWidth: 0,
              ...(corner === 'tl' ? { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 4 } : {}),
              ...(corner === 'tr' ? { top: 8, right: 8, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 4 } : {}),
              ...(corner === 'bl' ? { bottom: 8, left: 8, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 4 } : {}),
              ...(corner === 'br' ? { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 4 } : {}),
              zIndex: 20,
              animation: 'cornerBlink 2s ease-in-out infinite',
            }}
          />
        ))}

        {/* Idle / status overlay */}
        {!isActive && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: 'rgba(10, 10, 10, 0.9)',
            }}
          >
            {statusMessage && (
              <p
                style={{
                  fontSize: '14px',
                  color: '#888888',
                  textAlign: 'center',
                  padding: '0 24px',
                  lineHeight: 1.6,
                }}
              >
                {statusMessage}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

CameraFrame.displayName = 'CameraFrame';
export default CameraFrame;
