'use client';

import dynamic from 'next/dynamic';

const TerminalShell = dynamic(() => import('@/components/layout/TerminalShell'), {
  ssr: false,
});

export default function TerminalPage() {
  return <TerminalShell />;
}
