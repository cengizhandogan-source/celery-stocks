'use client';

import { useState } from 'react';
import { EXCHANGE_METADATA } from '@/lib/constants';
import type { ExchangeName } from '@/lib/types';

type Step = 'select' | 'credentials' | 'validating' | 'success' | 'error';

const EXCHANGES = Object.entries(EXCHANGE_METADATA) as [ExchangeName, { displayName: string; requiresPassphrase: boolean }][];

const API_KEY_GUIDES: Partial<Record<ExchangeName, string>> = {
  binance: 'https://www.youtube.com/watch?v=k9sR7UkXX-s',
  coinbase: 'https://www.youtube.com/watch?v=qWlkZ6z_Amc',
};

export default function ConnectExchangeModal({
  onConnect,
  onClose,
}: {
  onConnect: (params: { exchange: ExchangeName; apiKey: string; apiSecret: string; passphrase?: string; label?: string }) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>('select');
  const [exchange, setExchange] = useState<ExchangeName | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');

  const meta = exchange ? EXCHANGE_METADATA[exchange] : null;

  const handleSelectExchange = (ex: ExchangeName) => {
    setExchange(ex);
    setStep('credentials');
  };

  const handleSubmit = async () => {
    if (!exchange || !apiKey.trim() || !apiSecret.trim()) return;

    setStep('validating');
    setError('');

    const result = await onConnect({
      exchange,
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      passphrase: passphrase.trim() || undefined,
      label: label.trim() || undefined,
    });

    if (result.success) {
      setStep('success');
    } else {
      setError(result.error ?? 'Connection failed');
      setStep('error');
    }
  };

  return (
    <div className="border border-border rounded bg-surface p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono font-bold text-text-primary">
          {step === 'select' && 'Connect Exchange'}
          {step === 'credentials' && meta?.displayName}
          {step === 'validating' && 'Validating...'}
          {step === 'success' && 'Connected!'}
          {step === 'error' && 'Connection Failed'}
        </h3>
        <button
          onClick={onClose}
          className="text-xxs font-mono text-text-muted hover:text-text-secondary transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Step: Select Exchange */}
      {step === 'select' && (
        <div className="grid grid-cols-2 gap-2">
          {EXCHANGES.map(([key, { displayName }]) => (
            <button
              key={key}
              onClick={() => handleSelectExchange(key)}
              className="text-xs font-mono text-text-secondary border border-border hover:border-info/40 hover:text-info px-3 py-2 rounded transition-colors text-left"
            >
              {displayName}
            </button>
          ))}
        </div>
      )}

      {/* Step: Enter Credentials */}
      {step === 'credentials' && (
        <div className="space-y-3">
          <p className="text-xxs font-mono text-gold/80 bg-gold/5 border border-gold/20 rounded px-2 py-1.5">
            Create a read-only API key on {meta?.displayName}. This app never places trades.
            {exchange && API_KEY_GUIDES[exchange] && (
              <>
                {' '}
                <a
                  href={API_KEY_GUIDES[exchange]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-info underline hover:text-info/80"
                >
                  Watch guide →
                </a>
              </>
            )}
          </p>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-border focus:border-info/40 focus:outline-none"
            placeholder="Label (optional, e.g. 'Main account')"
          />
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-border focus:border-info/40 focus:outline-none"
            placeholder="API Key"
          />
          <input
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            type="password"
            className="w-full bg-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-border focus:border-info/40 focus:outline-none"
            placeholder="API Secret"
          />
          {meta?.requiresPassphrase && (
            <input
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              type="password"
              className="w-full bg-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-border focus:border-info/40 focus:outline-none"
              placeholder="Passphrase"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!apiKey.trim() || !apiSecret.trim()}
              className="text-xxs font-mono text-profit border border-profit/30 hover:bg-profit/10 px-3 py-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Connect
            </button>
            <button
              onClick={() => { setStep('select'); setExchange(null); setApiKey(''); setApiSecret(''); setPassphrase(''); setLabel(''); }}
              className="text-xxs font-mono text-text-muted hover:text-text-secondary px-3 py-1.5 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Step: Validating */}
      {step === 'validating' && (
        <div className="flex items-center gap-2 py-4">
          <div className="w-3 h-3 border-2 border-info border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-text-muted">Validating credentials with {meta?.displayName}...</span>
        </div>
      )}

      {/* Step: Success */}
      {step === 'success' && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-profit">Successfully connected to {meta?.displayName}!</p>
          <button
            onClick={onClose}
            className="text-xxs font-mono text-text-secondary border border-border hover:border-info/40 px-3 py-1.5 rounded transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Step: Error */}
      {step === 'error' && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-loss">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setStep('credentials')}
              className="text-xxs font-mono text-info border border-info/30 hover:bg-info/10 px-3 py-1.5 rounded transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="text-xxs font-mono text-text-muted hover:text-text-secondary px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
