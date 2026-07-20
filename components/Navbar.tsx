'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
      }}
    >
      {/* Logo / Brand */}
      <Link href="/" style={{ textDecoration: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #D4AF37, #F0D060)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            🎺
          </div>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#D4AF37',
              letterSpacing: '0.05em',
            }}
          >
            Simphony
          </span>
        </div>
      </Link>

      {/* Admin Login Button */}
      <Link href="/login" style={{ textDecoration: 'none' }}>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            background: 'transparent',
            color: '#D4AF37',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            transition: 'all 0.2s ease',
            fontFamily: 'Poppins, sans-serif',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(212, 175, 55, 0.1)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#D4AF37';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(212, 175, 55, 0.4)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Login Admin
        </button>
      </Link>
    </nav>
  );
}
