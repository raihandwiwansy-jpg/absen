/**
 * Face matching utilities using cosine similarity.
 * Semua proses matching dilakukan di sisi client (browser).
 */

// Threshold similarity untuk match (0.0 - 1.0)
// Semakin tinggi = lebih ketat, semakin rendah = lebih longgar
// Threshold similarity untuk match (0.0 - 1.0)
// Untuk neural net descriptor (@vladmandic/human faceres 1024 vector),
// dua wajah berbeda memiliki cosine similarity ~0.65-0.82, sedangkan wajah yang sama >= 0.86.
export const SIMILARITY_THRESHOLD = 0.86;

/**
 * Hitung cosine similarity antara dua descriptor vector.
 * Return nilai 0.0 - 1.0 (semakin mendekati 1.0 = semakin mirip)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || !Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return 0;
  
  let dot = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    const valA = Number(a[i]) || 0;
    const valB = Number(b[i]) || 0;
    dot += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Hitung rata-rata dari beberapa descriptor (hasil dari beberapa sample wajah).
 */
export function averageDescriptors(descriptors: number[][]): number[] {
  if (!descriptors || !Array.isArray(descriptors) || descriptors.length === 0) return [];
  const validDescs = descriptors.filter((d) => Array.isArray(d) && d.length > 0);
  if (validDescs.length === 0) return [];
  
  const len = validDescs[0].length;
  const avg = new Array(len).fill(0);
  
  for (const desc of validDescs) {
    if (desc.length === len) {
      for (let i = 0; i < len; i++) {
        avg[i] += Number(desc[i]) || 0;
      }
    }
  }
  
  return avg.map((v) => v / validDescs.length);
}

export interface AnggotaEmbedding {
  id: number;
  nama: string;
  // embeddings adalah array of descriptor (tiap descriptor = float[])
  embeddings: number[][];
}

export interface MatchResult {
  matched: boolean;
  anggota?: AnggotaEmbedding;
  similarity?: number;
}

/**
 * Cocokkan satu descriptor wajah dengan semua anggota terdaftar.
 * Strategi: untuk tiap anggota, bandingkan descriptor input dengan semua
 * descriptor yang tersimpan, ambil similarity tertinggi, lalu cari anggota
 * dengan similarity tertinggi yang melebihi threshold.
 */
export function matchFace(
  descriptor: number[],
  database: AnggotaEmbedding[]
): MatchResult {
  if (database.length === 0) {
    return { matched: false };
  }

  let bestSimilarity = -1;
  let bestAnggota: AnggotaEmbedding | undefined;

  for (const anggota of database) {
    for (const storedDesc of anggota.embeddings) {
      const sim = cosineSimilarity(descriptor, storedDesc);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestAnggota = anggota;
      }
    }
  }

  if (bestSimilarity >= SIMILARITY_THRESHOLD && bestAnggota) {
    return {
      matched: true,
      anggota: bestAnggota,
      similarity: bestSimilarity,
    };
  }

  return {
    matched: false,
    similarity: bestSimilarity,
  };
}
