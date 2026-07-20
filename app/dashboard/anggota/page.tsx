'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const AnggotaModal = dynamic(() => import('@/components/dashboard/AnggotaModal'), { ssr: false });

interface Anggota {
  id: number;
  nama: string;
  thumbnailBase64: string | null;
  createdAt: string;
  _count: { absensi: number };
}

export default function AnggotaPage() {
  const [anggota, setAnggota] = useState<Anggota[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: number; nama: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const fetchAnggota = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/anggota');
      if (res.ok) setAnggota(await res.json());
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnggota();
    // Auto-refresh data tanpa reload (polling 5 detik)
    const timer = setInterval(() => {
      fetchAnggota(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchAnggota]);

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus anggota "${nama}"? Semua data absensinya juga akan dihapus.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/anggota/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAnggota((prev) => prev.filter((a) => a.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = anggota.filter((a) =>
    a.nama.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Modal */}
      {showModal && (
        <AnggotaModal
          editAnggota={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSaved={() => { fetchAnggota(); }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f5f5f5' }}>Kelola Anggota</h1>
          <p style={{ fontSize: '13px', color: '#888888', marginTop: '4px' }}>
            {anggota.length} anggota terdaftar
          </p>
        </div>
        <button
          id="btn-tambah-anggota"
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="btn-gold"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Anggota
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '320px' }}>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888888' }}
        >
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama anggota..."
          className="input-dark"
          style={{ paddingLeft: '38px' }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid rgba(212,175,55,0.2)', borderTopColor: '#D4AF37', borderRadius: '50%' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#555',
            borderRadius: '12px',
            border: '1px dashed rgba(212,175,55,0.2)',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👤</div>
          <p style={{ fontSize: '15px', color: '#666' }}>
            {search ? 'Anggota tidak ditemukan' : 'Belum ada anggota terdaftar'}
          </p>
          {!search && (
            <p style={{ fontSize: '13px', color: '#444', marginTop: '6px' }}>
              Klik "Tambah Anggota" untuk mendaftarkan anggota pertama
            </p>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {filtered.map((a) => (
            <div
              key={a.id}
              className="card-dark"
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {/* Avatar */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {a.thumbnailBase64 ? (
                  <img
                    src={a.thumbnailBase64}
                    alt={a.nama}
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid rgba(212,175,55,0.4)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: 'rgba(212,175,55,0.1)',
                      border: '2px solid rgba(212,175,55,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                    }}
                  >
                    👤
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f5', marginBottom: '4px' }}>
                  {a.nama}
                </p>
                <p style={{ fontSize: '12px', color: '#888888' }}>
                  {a._count.absensi}× hadir
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setEditTarget({ id: a.id, nama: a.nama }); setShowModal(true); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    background: 'rgba(212,175,55,0.1)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    color: '#D4AF37',
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                    transition: 'background 0.2s ease',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(a.id, a.nama)}
                  disabled={deletingId === a.id}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  {deletingId === a.id ? '...' : 'Hapus'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
