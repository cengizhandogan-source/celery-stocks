'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLayoutStore } from '@/stores/layoutStore';

const DEBOUNCE_MS = 500;

export default function TextNotePanel({ windowId, content }: { windowId: string; content?: string }) {
  const [text, setText] = useState(content ?? '');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const updateWindowContent = useLayoutStore((s) => s.updateWindowContent);

  useEffect(() => {
    setText(content ?? '');
  }, [content]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateWindowContent(windowId, value);
    }, DEBOUNCE_MS);
  }, [windowId, updateWindowContent]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <textarea
        value={text}
        onChange={handleChange}
        placeholder="Type your notes here..."
        className="flex-1 w-full bg-transparent text-sm font-mono text-text-primary placeholder:text-text-muted px-3 py-2 resize-none focus:outline-none"
        spellCheck={false}
      />
    </div>
  );
}
