'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, backgroundColor: '#0a0a0a', color: '#a0a0a0', fontFamily: 'monospace' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
          <span style={{ color: '#ef4444', fontSize: '14px' }}>Something went wrong</span>
          <button
            onClick={reset}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              fontFamily: 'monospace',
              border: '1px solid #333',
              background: 'transparent',
              color: '#a0a0a0',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
