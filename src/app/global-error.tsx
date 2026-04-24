'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, backgroundColor: '#060C0D', color: '#A1A1AA', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
          <span style={{ color: '#FF4D4F', fontSize: '14px' }}>Something went wrong</span>
          <button
            onClick={reset}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              fontFamily: 'Instrument Sans, system-ui, sans-serif',
              border: '1px solid #2A2A35',
              background: 'transparent',
              color: '#A1A1AA',
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
