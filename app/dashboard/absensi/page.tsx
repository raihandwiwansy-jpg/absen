'use client';

import { useState, useEffect, useCallback } from 'react';

interface AbsensiRow {
  id: number;
  tanggal: string;
  anggota: { id: number; nama: string };
}

interface AnggotaOption {
  id: number;
  nama: string;
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// Helper untuk format YYYY-MM-DD lokal
function getLocalYYYYMMDD(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AbsensiPage() {
  const [absensi, setAbsensi] = useState<AbsensiRow[]>([]);
  const [anggotaList, setAnggotaList] = useState<AnggotaOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab Mode: 'hari_ini' (default otomatis), 'pilih_tanggal', 'pilih_bulan', 'semua'
  const [tabMode, setTabMode] = useState<'hari_ini' | 'pilih_tanggal' | 'pilih_bulan' | 'semua'>('hari_ini');

  // Filter state
  const [filterAnggota, setFilterAnggota] = useState('');
  const [filterTanggal, setFilterTanggal] = useState(getLocalYYYYMMDD());
  const [filterBulan, setFilterBulan] = useState(String(new Date().getMonth() + 1));
  const [filterTahun, setFilterTahun] = useState(String(new Date().getFullYear()));

  // Fetch anggota list untuk dropdown & statistik progress
  useEffect(() => {
    fetch('/api/anggota').then((r) => r.json()).then(setAnggotaList).catch(() => {});
  }, []);

  const fetchAbsensi = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAnggota) params.set('anggotaId', filterAnggota);

      if (tabMode === 'hari_ini') {
        params.set('tanggal', getLocalYYYYMMDD());
      } else if (tabMode === 'pilih_tanggal' && filterTanggal) {
        params.set('tanggal', filterTanggal);
      } else if (tabMode === 'pilih_bulan') {
        if (filterBulan) params.set('bulan', filterBulan);
        if (filterTahun) params.set('tahun', filterTahun);
      }
      // Jika tabMode === 'semua', tidak kirim param tanggal/bulan/tahun

      const res = await fetch(`/api/absensi?${params}`);
      if (res.ok) setAbsensi(await res.json());
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tabMode, filterAnggota, filterTanggal, filterBulan, filterTahun]);

  useEffect(() => {
    fetchAbsensi();
    // Auto-refresh data tanpa reload (polling 5 detik) untuk dashboard
    const timer = setInterval(() => {
      fetchAbsensi(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchAbsensi]);

  // Statistik Cepat (berdasarkan data yang dimuat saat ini)
  const totalHadir = absensi.length;
  let absenPertama = '-';
  let absenTerakhir = '-';

  if (absensi.length > 0) {
    const times = absensi.map((r) => new Date(r.tanggal).getTime());
    const minTime = new Date(Math.min(...times));
    const maxTime = new Date(Math.max(...times));
    const formatTime = (d: Date) =>
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0') + ':' +
      String(d.getSeconds()).padStart(2, '0') + ' WIB';
    absenPertama = formatTime(minTime);
    absenTerakhir = formatTime(maxTime);
  }

  const todayDateObj = new Date();
  const todayFormatted = `${HARI[todayDateObj.getDay()]}, ${todayDateObj.getDate()} ${BULAN[todayDateObj.getMonth()]} ${todayDateObj.getFullYear()}`;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Judul */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f5f5f5' }}>Data Absensi Anggota</h1>
        <p style={{ fontSize: '13px', color: '#888888' }}>
          {tabMode === 'hari_ini'
            ? `Menampilkan rekap absensi otomatis hari ini (${todayFormatted})`
            : tabMode === 'pilih_tanggal'
            ? `Menampilkan absensi untuk tanggal ${filterTanggal || '-'}`
            : tabMode === 'pilih_bulan'
            ? `Menampilkan absensi bulan ${BULAN[Number(filterBulan) - 1] || ''} ${filterTahun}`
            : 'Menampilkan seluruh riwayat absensi'}
        </p>
      </div>

      {/* Tab Navigasi Cepat & Interaktif */}
      <div
        className="card-dark"
        style={{
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            onClick={() => setTabMode('hari_ini')}
            className={`tab-btn ${tabMode === 'hari_ini' ? 'active' : ''}`}
          >
            <span>🌟</span>
            Hari Ini
          </button>
          <button
            onClick={() => setTabMode('pilih_tanggal')}
            className={`tab-btn ${tabMode === 'pilih_tanggal' ? 'active' : ''}`}
          >
            <span>📅</span>
            Pilih Tanggal
          </button>
          <button
            onClick={() => setTabMode('pilih_bulan')}
            className={`tab-btn ${tabMode === 'pilih_bulan' ? 'active' : ''}`}
          >
            <span>🗓️</span>
            Bulan & Tahun
          </button>
          <button
            onClick={() => setTabMode('semua')}
            className={`tab-btn ${tabMode === 'semua' ? 'active' : ''}`}
          >
            <span>📋</span>
            Semua Riwayat
          </button>
        </div>

        {/* Filter Anggota (selalu tersedia) */}
        <div style={{ minWidth: '180px', flexGrow: 1, maxWidth: '260px' }}>
          <select
            value={filterAnggota}
            onChange={(e) => setFilterAnggota(e.target.value)}
            className="input-dark"
            style={{ appearance: 'none', cursor: 'pointer', fontSize: '13px', padding: '8px 12px' }}
          >
            <option value="">👤 Semua Anggota</option>
            {anggotaList.map((a) => (
              <option key={a.id} value={a.id}>{a.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Panel Pilihan Tambahan sesuai Tab */}
      {(tabMode === 'pilih_tanggal' || tabMode === 'pilih_bulan') && (
        <div className="card-dark animate-fade-in" style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', background: 'rgba(212, 175, 55, 0.04)' }}>
          {tabMode === 'pilih_tanggal' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', color: '#D4AF37', fontWeight: 600 }}>Tanggal:</label>
              <input
                type="date"
                value={filterTanggal}
                onChange={(e) => setFilterTanggal(e.target.value)}
                className="input-dark"
                style={{ width: 'auto', padding: '6px 12px' }}
              />
            </div>
          )}

          {tabMode === 'pilih_bulan' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', color: '#D4AF37', fontWeight: 600 }}>Bulan & Tahun:</label>
              <select
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                className="input-dark"
                style={{ width: 'auto', padding: '6px 12px' }}
              >
                {BULAN.map((b, i) => (
                  <option key={i} value={i + 1}>{b}</option>
                ))}
              </select>
              <select
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
                className="input-dark"
                style={{ width: 'auto', padding: '6px 12px' }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Hero Statistik Cepat */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <div className="card-dark" style={{ padding: '16px', borderLeft: '4px solid #D4AF37', background: 'linear-gradient(135deg, rgba(212,175,55,0.08), transparent)' }}>
          <p style={{ fontSize: '12px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Hadir</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#D4AF37' }}>{totalHadir}</span>
            {anggotaList.length > 0 && (tabMode === 'hari_ini' || tabMode === 'pilih_tanggal') && (
              <span style={{ fontSize: '13px', color: '#666' }}>/ {anggotaList.length} Anggota</span>
            )}
          </div>
        </div>

        <div className="card-dark" style={{ padding: '16px', borderLeft: '4px solid #00ff88', background: 'linear-gradient(135deg, rgba(0,255,136,0.06), transparent)' }}>
          <p style={{ fontSize: '12px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Absen Pertama</p>
          <span style={{ fontSize: '20px', fontWeight: 600, color: '#00ff88', fontFamily: 'monospace' }}>{absenPertama}</span>
        </div>

        <div className="card-dark" style={{ padding: '16px', borderLeft: '4px solid #60a5fa', background: 'linear-gradient(135deg, rgba(96,165,250,0.06), transparent)' }}>
          <p style={{ fontSize: '12px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Absen Terakhir</p>
          <span style={{ fontSize: '20px', fontWeight: 600, color: '#60a5fa', fontFamily: 'monospace' }}>{absenTerakhir}</span>
        </div>
      </div>

      {/* Konten Utama: Tabel Desktop & Daftar Kartu Mobile */}
      {loading ? (
        <div className="card-dark" style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid rgba(212,175,55,0.2)', borderTopColor: '#D4AF37', borderRadius: '50%' }} />
        </div>
      ) : absensi.length === 0 ? (
        <div
          className="card-dark"
          style={{
            textAlign: 'center',
            padding: '64px 20px',
            color: '#555',
            border: '1px dashed rgba(212,175,55,0.2)',
          }}
        >
          <div style={{ fontSize: '44px', marginBottom: '14px' }}>📋</div>
          <p style={{ fontSize: '16px', color: '#f5f5f5', fontWeight: 600, marginBottom: '6px' }}>
            {tabMode === 'hari_ini' ? 'Belum Ada Absensi Hari Ini' : 'Tidak Ada Data Absensi'}
          </p>
          <p style={{ fontSize: '13px', color: '#888888', maxWidth: '340px', margin: '0 auto', lineHeight: 1.6 }}>
            {tabMode === 'hari_ini'
              ? `Anggota yang memindai wajah pada hari ini (${todayFormatted}) akan langsung muncul di sini secara otomatis.`
              : 'Gunakan tab atau filter di atas untuk memilih rentang waktu lain.'}
          </p>
        </div>
      ) : (
        <>
          {/* TAMPILAN DESKTOP (TABLE) */}
          <div className="card-dark desktop-table" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-dark">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>No</th>
                    <th style={{ textAlign: 'left' }}>Nama Anggota</th>
                    <th style={{ textAlign: 'left' }}>Hari</th>
                    <th style={{ textAlign: 'left' }}>Tanggal Lengkap</th>
                    <th style={{ textAlign: 'center' }}>Jam (Waktu Presisi)</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {absensi.map((row, idx) => {
                    const date = new Date(row.tanggal);
                    const hari = HARI[date.getDay()];
                    const tanggalLengkap = `${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()}`;
                    const jam = String(date.getHours()).padStart(2, '0') + ':' +
                                String(date.getMinutes()).padStart(2, '0') + ':' +
                                String(date.getSeconds()).padStart(2, '0') + ' WIB';

                    return (
                      <tr key={row.id}>
                        <td style={{ color: '#666', width: '50px' }}>{idx + 1}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#f5f5f5' }}>{row.anggota.nama}</span>
                        </td>
                        <td style={{ color: '#D4AF37', fontWeight: 500 }}>{hari}</td>
                        <td>{tanggalLengkap}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '13px', color: '#00ff88', fontWeight: 600 }}>
                          {jam}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge-hadir">✓ Hadir</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* TAMPILAN MOBILE (CARD LIST) */}
          <div className="mobile-card-list">
            {absensi.map((row) => {
              const date = new Date(row.tanggal);
              const hari = HARI[date.getDay()];
              const tanggalLengkap = `${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()}`;
              const jam = String(date.getHours()).padStart(2, '0') + ':' +
                          String(date.getMinutes()).padStart(2, '0') + ':' +
                          String(date.getSeconds()).padStart(2, '0') + ' WIB';

              return (
                <div
                  key={row.id}
                  className="card-dark"
                  style={{
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    borderLeft: '4px solid #D4AF37',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f5' }}>
                      {row.anggota.nama}
                    </span>
                    <span className="badge-hadir">✓ Hadir</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
                    <div style={{ color: '#888888' }}>
                      <span style={{ color: '#D4AF37', fontWeight: 500 }}>{hari}</span>, {tanggalLengkap}
                    </div>
                    <div style={{ fontFamily: 'monospace', color: '#00ff88', fontWeight: 600, background: 'rgba(0,255,136,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                      {jam}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

    </div>
  );
}
