'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { AiChatMessage, AiToolCallResult, AiConversation } from '@/lib/types';
import { useAppStore } from '@/stores/appStore';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

function generateTitle(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= 80) return trimmed;
  const cut = trimmed.slice(0, 80);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + '...';
}

export function useAiChat() {
  const { user } = useUser();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const activeConversationIdRef = useRef<string | null>(null);
  activeConversationIdRef.current = activeConversationId;

  // Load conversations on mount
  const initialized = useRef(false);
  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    (async () => {
      const { data } = await supabase
        .from('ai_conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      if (data) setConversations(data);
      setLoadingConversations(false);
    })();
  }, [user]);

  const selectConversation = useCallback(async (id: string) => {
    if (isStreaming) return;
    setActiveConversationId(id);
    setMessages([]);
    setLoadingMessages(true);
    setError(null);

    const { data } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(
        data.map((row) => ({
          id: row.id,
          role: row.role as 'user' | 'assistant',
          content: row.content,
          timestamp: new Date(row.created_at).getTime(),
          toolCalls: row.tool_calls ?? undefined,
        }))
      );
    }
    setLoadingMessages(false);
  }, [isStreaming]);

  const startNewConversation = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
    setIsStreaming(false);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    await supabase.from('ai_conversations').delete().eq('id', id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationIdRef.current === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (isStreaming) return;

    const trimmed = content.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      setError('Message too long. Please keep it under 2,000 characters.');
      return;
    }

    const userMsg: AiChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const assistantMsg: AiChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      toolCalls: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setError(null);

    // Build context from stores
    const activeSymbol = useAppStore.getState().activeSymbol;
    const watchlist = useWatchlistStore.getState().symbols;
    const { positions, portfolios, activePortfolioId } = usePortfolioStore.getState();
    const activePortfolio = portfolios.find((p) => p.id === activePortfolioId);

    const historyForApi = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const abortController = new AbortController();
    abortRef.current = abortController;

    let finalAssistantContent = '';
    let finalToolCalls: AiToolCallResult[] = [];
    let streamCompleted = false;

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyForApi,
          activeSymbol,
          watchlist,
          portfolioContext: positions.length > 0 ? {
            portfolioName: activePortfolio?.name || 'Portfolio',
            positions: positions.map((p) => ({
              symbol: p.symbol,
              shares: p.shares,
              avgCost: p.avgCost,
            })),
          } : undefined,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'delta') {
              finalAssistantContent += data.content;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + data.content };
                }
                return updated;
              });
            } else if (data.type === 'tool_call') {
              const toolCall: AiToolCallResult = { name: data.name, args: data.args };
              finalToolCalls = [...finalToolCalls, toolCall];
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    toolCalls: [...(last.toolCalls || []), toolCall],
                  };
                }
                return updated;
              });
            } else if (data.type === 'error') {
              setError(data.content);
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      streamCompleted = true;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;

      // Persist to Supabase after stream completes
      if (streamCompleted && finalAssistantContent && user) {
        try {
          let convId = activeConversationIdRef.current;

          if (!convId) {
            // Create new conversation
            const { data: conv } = await supabase
              .from('ai_conversations')
              .insert({ user_id: user.id, title: generateTitle(content) })
              .select()
              .single();

            if (conv) {
              convId = conv.id;
              setActiveConversationId(conv.id);
              setConversations((prev) => [conv, ...prev]);
            }
          } else {
            // Update timestamp for existing conversation
            await supabase
              .from('ai_conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', convId);

            setConversations((prev) => {
              const idx = prev.findIndex((c) => c.id === convId);
              if (idx <= 0) return prev;
              const updated = [...prev];
              const [moved] = updated.splice(idx, 1);
              return [{ ...moved, updated_at: new Date().toISOString() }, ...updated];
            });
          }

          if (convId) {
            await supabase.from('ai_messages').insert([
              { conversation_id: convId, role: 'user', content },
              {
                conversation_id: convId,
                role: 'assistant',
                content: finalAssistantContent,
                tool_calls: finalToolCalls.length > 0 ? finalToolCalls : null,
              },
            ]);
          }
        } catch {
          // Silent fail on persistence — messages are still in local state
        }
      }
    }
  }, [isStreaming, messages, user]);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    startNewConversation,
    conversations,
    activeConversationId,
    loadingConversations,
    loadingMessages,
    selectConversation,
    deleteConversation,
  };
}
