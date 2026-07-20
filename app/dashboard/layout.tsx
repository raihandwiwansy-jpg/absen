'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  {
    href: '/dashboard/absensi',
    label: 'Data Absensi',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/anggota',
    label: 'Kelola Anggota',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-dark)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 40,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: '240px',
          minHeight: '100vh',
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border-gold)',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
        }}
        className="dashboard-sidebar"
      >
        {/* Brand */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid var(--border-gold)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #D4AF37, #F0D060)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            🎺
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f5' }}>Simphony</div>
            <div style={{ fontSize: '11px', color: '#888888', marginTop: '2px' }}>Admin Panel</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ fontSize: '11px', color: '#555', fontWeight: 600, padding: '0 8px', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Menu</p>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-gold)' }}>
          <Link href="/" className="sidebar-link" style={{ marginBottom: '4px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            Halaman Absen
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="sidebar-link"
            style={{
              width: '100%',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              fontFamily: 'Poppins, sans-serif',
              cursor: 'pointer',
              color: '#ef4444',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {loggingOut ? 'Keluar...' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="dashboard-main" style={{ flex: 1, marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
        {/* Top bar */}
        <header
          style={{
            height: '60px',
            background: 'rgba(10,10,10,0.8)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border-gold)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: '16px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Hamburger (Mobile Only) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mobile-only"
            style={{
              background: 'none',
              border: 'none',
              color: '#D4AF37',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <span style={{ fontSize: '15px', fontWeight: 600, color: '#D4AF37' }}>
            {navItems.find((n) => pathname.startsWith(n.href))?.label ?? 'Dashboard'}
          </span>
        </header>

        {/* Page content */}
        <main style={{ padding: '24px 20px', maxWidth: '1200px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
