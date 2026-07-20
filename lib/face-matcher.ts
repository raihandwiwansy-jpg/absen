/**
 * Face matching utilities using cosine similarity.
 * Semua proses matching dilakukan di sisi client (browser).
 */

// Threshold similarity untuk match (0.0 - 1.0)
// Semakin tinggi = lebih ketat, semakin rendah = lebih longgar
export const SIMILARITY_THRESHOLD = 0.60;

/**
 * Hitung cosine similarity antara dua descriptor vector.
 * Return nilai 0.0 - 1.0 (semakin mendekati 1.0 = semakin mirip)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dot = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Hitung rata-rata dari beberapa descriptor (hasil dari beberapa sample wajah).
 */
export function averageDescriptors(descriptors: number[][]): number[] {
  if (descriptors.length === 0) return [];
  const len = descriptors[0].length;
  const avg = new Array(len).fill(0);
  
  for (const desc of descriptors) {
    for (let i = 0; i < len; i++) {
      avg[i] += desc[i];
    }
  }
  
  return avg.map((v) => v / descriptors.length);
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
