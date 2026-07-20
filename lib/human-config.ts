/**
 * Konfigurasi @vladmandic/human untuk face detection & recognition.
 * Hanya load modul yang diperlukan untuk efisiensi maksimal.
 */
export const humanConfig = {
  // Model path - harus sesuai dengan lokasi download model
  modelBasePath: '/models',
  
  // Backend: WebGL dengan fallback WASM
  backend: 'webgl' as const,
  
  // Resolusi processing (bukan preview) - lebih kecil = lebih cepat
  filter: {
    enabled: true,
    equalization: false,
    flip: false,
  },

  // Face detection & recognition saja
  face: {
    enabled: true,
    detector: {
      enabled: true,
      rotation: true,
      return: true,
      mask: false,
      // Model: blazeface
      modelPath: 'blazeface.json',
      maxDetected: 1,        // Hanya deteksi 1 wajah utama untuk hemat RAM/GPU
      skipFrames: 8,         // skip frames agar GPU tidak terbebani
      skipTime: 120,         // skip jika frame dipanggil lebih cepat dari 120ms
      minConfidence: 0.5,
    },
    mesh: { enabled: false },
    attention: { enabled: false },
    iris: { enabled: false },
    description: {
      enabled: true,
      // Model: faceres (face recognition/embedding)
      modelPath: 'faceres.json',
      skipFrames: 12,        // hanya hitung embedding tiap 12 frame
      minConfidence: 0.2,
    },
    emotion: { enabled: false },
    gender: { enabled: false },
    age: { enabled: false },
    antispoof: { enabled: false },
    liveness: { enabled: false },
  },

  // Matikan semua modul lain
  body: { enabled: false },
  hand: { enabled: false },
  gesture: { enabled: false },
  object: { enabled: false },
  segmentation: { enabled: false },

  // Performa
  async: true,
  warmup: 'face' as const,
  cacheSensitivity: 0.7,
  
  debug: false,
};

export type HumanConfig = typeof humanConfig;
