'use client';

import { useState, useCallback, useRef, type KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MessageInput({ onSend, placeholder = 'Type a message...', disabled }: MessageInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed && !disabled) {
          onSend(trimmed);
          setValue('');
          if (inputRef.current) inputRef.current.style.height = 'auto';
        }
      }
    },
    [value, onSend, disabled]
  );

  const handleInput = useCallback(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, []);

  return (
    <div className="border-t border-terminal-border px-3 py-2">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); handleInput(); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="w-full bg-terminal-input text-sm font-mono text-text-primary placeholder:text-text-muted px-3 py-2 rounded border border-terminal-border focus:border-up/40 focus:outline-none resize-none"
      />
    </div>
  );
}
