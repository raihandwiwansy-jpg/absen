/**
 * Script untuk mengunduh model @vladmandic/human yang diperlukan
 * ke folder public/models/
 * 
 * Jalankan: npx ts-node scripts/download-models.ts
 * atau: node scripts/download-models.mjs (setelah dikonversi)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'public', 'models');

// Model files dari @vladmandic/human package (sudah terinstall di node_modules)
const MODEL_SOURCE_DIR = path.join(
  __dirname,
  '..',
  'node_modules',
  '@vladmandic',
  'human',
  'models'
);

// File yang dibutuhkan untuk face detection + face description
const REQUIRED_FILES = [
  'blazeface.json',
  'blazeface_back.json',
  // blazeface binary shards
  'group1-shard1of1.bin',
  // faceres (face recognition)
  'faceres.json',
  'faceres.bin',
];

async function main() {
  // Create models directory
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log(`📁 Dibuat folder: ${MODELS_DIR}`);
  }

  // Check if source from node_modules exists
  if (!fs.existsSync(MODEL_SOURCE_DIR)) {
    console.error('❌ Folder node_modules/@vladmandic/human/models tidak ditemukan.');
    console.error('   Pastikan sudah menjalankan: npm install @vladmandic/human');
    process.exit(1);
  }

  console.log('📦 Menyalin model dari node_modules ke public/models/...\n');

  // List all files in source dir
  const sourceFiles = fs.readdirSync(MODEL_SOURCE_DIR);
  let copied = 0;
  let skipped = 0;

  for (const file of sourceFiles) {
    const src = path.join(MODEL_SOURCE_DIR, file);
    const dest = path.join(MODELS_DIR, file);

    // Skip if already exists and same size
    if (fs.existsSync(dest)) {
      const srcStat = fs.statSync(src);
      const destStat = fs.statSync(dest);
      if (srcStat.size === destStat.size) {
        skipped++;
        continue;
      }
    }

    try {
      fs.copyFileSync(src, dest);
      console.log(`  ✓ ${file} (${(fs.statSync(src).size / 1024).toFixed(0)} KB)`);
      copied++;
    } catch (err) {
      console.error(`  ✕ Gagal menyalin ${file}:`, err.message);
    }
  }

  console.log(`\n✅ Selesai! ${copied} file disalin, ${skipped} file sudah ada.`);
  console.log(`   Model tersedia di: ${MODELS_DIR}`);
}

main().catch(console.error);
