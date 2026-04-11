'use client';

import { useState, useCallback, useRef, type KeyboardEvent } from 'react';
import StrategyPicker from './StrategyPicker';
import type { Strategy } from '@/lib/types';

interface MessageInputProps {
  onSend: (content: string, strategyId?: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MessageInput({ onSend, placeholder = 'Type a message...', disabled }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [attachedStrategy, setAttachedStrategy] = useState<Strategy | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const trimmed = value.trim();
        if ((trimmed || attachedStrategy) && !disabled) {
          onSend(trimmed || (attachedStrategy ? `Shared strategy: ${attachedStrategy.name}` : ''), attachedStrategy?.id);
          setValue('');
          setAttachedStrategy(null);
          if (inputRef.current) inputRef.current.style.height = 'auto';
        }
      }
    },
    [value, onSend, disabled, attachedStrategy]
  );

  const handleInput = useCallback(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, []);

  const handleSelectStrategy = useCallback((strategy: Strategy) => {
    setAttachedStrategy(strategy);
    setShowPicker(false);
  }, []);

  return (
    <div className="border-t border-terminal-border relative">
      {/* Attached strategy preview */}
      {attachedStrategy && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-terminal-hover/50 border-b border-terminal-border">
          <span className="text-xxs font-mono text-text-muted">Strategy:</span>
          <span className="text-xxs font-mono text-up truncate">{attachedStrategy.name}</span>
          <button
            onClick={() => setAttachedStrategy(null)}
            className="text-xxs font-mono text-text-muted hover:text-down transition-colors ml-auto shrink-0"
          >
            x
          </button>
        </div>
      )}

      <div className="px-3 py-2 flex items-end gap-2">
        {/* Strategy attach button */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowPicker(v => !v)}
            className={`text-sm font-mono transition-colors pb-1 ${
              showPicker ? 'text-up' : 'text-text-muted hover:text-text-primary'
            }`}
            title="Attach strategy"
          >
            {}
          </button>
          {showPicker && (
            <StrategyPicker
              onSelect={handleSelectStrategy}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>

        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-terminal-input text-sm font-mono text-text-primary placeholder:text-text-muted px-3 py-2 rounded border border-terminal-border focus:border-up/40 focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}
