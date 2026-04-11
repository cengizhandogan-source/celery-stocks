'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { AiChatMessage, AiToolCallResult, AiConversation, AiQuestion } from '@/lib/types';
import { useAppStore } from '@/stores/appStore';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useStrategyStore } from '@/stores/strategyStore';
import type { WindowType } from '@/lib/types';
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

const CLIENT_TOOL_NAMES = new Set(['open_windows', 'close_windows', 'list_windows', 'set_active_symbol', 'create_strategy', 'edit_strategy', 'run_strategy']);

function executeClientTool(name: string, args: Record<string, unknown>): void {
  const layoutStore = useLayoutStore.getState();
  const appStore = useAppStore.getState();
  const strategyStore = useStrategyStore.getState();

  switch (name) {
    case 'open_windows': {
      const windows = args.windows as Array<{ type: string; symbol?: string }>;
      for (const w of windows) {
        layoutStore.addWindow(w.type as WindowType, w.symbol);
      }
      break;
    }
    case 'close_windows': {
      if (args.close_all) {
        const toClose = layoutStore.windows.filter(w => w.type !== 'ai-chat');
        for (const w of toClose) {
          layoutStore.removeWindow(w.id);
        }
      } else if (args.types) {
        const types = args.types as string[];
        const toClose = layoutStore.windows.filter(w => types.includes(w.type) && w.type !== 'ai-chat');
        for (const w of toClose) {
          layoutStore.removeWindow(w.id);
        }
      }
      break;
    }
    case 'set_active_symbol': {
      appStore.setActiveSymbol(args.symbol as string);
      break;
    }
    case 'create_strategy': {
      strategyStore.createStrategy({
        name: args.name as string,
        description: args.description as string,
        code: args.code as string,
        symbols: args.symbols as string[],
      }).then((strategy) => {
        if (strategy) {
          layoutStore.addWindow('strategy-editor' as WindowType, undefined, strategy.id);
        }
      });
      break;
    }
    case 'edit_strategy': {
      const id = args.strategy_id as string;
      const code = args.code as string;
      if (id && code) {
        strategyStore.updateStrategy(id, { code });
      }
      break;
    }
    case 'run_strategy': {
      // Signal to run — the editor panel handles actual execution
      const stratId = args.strategy_id as string;
      if (stratId) {
        // Open the strategy editor for the given strategy
        layoutStore.addWindow('strategy-editor' as WindowType, undefined, stratId);
      }
      break;
    }
  }
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
          question: row.question ? { ...row.question, answered: true } : undefined,
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
    const openWindows = useLayoutStore.getState().windows.map(w => ({
      type: w.type, symbol: w.symbol, title: w.title,
    }));
    const activePortfolio = portfolios.find((p) => p.id === activePortfolioId);
    const strategies = useStrategyStore.getState().strategies;

    const historyForApi = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const abortController = new AbortController();
    abortRef.current = abortController;

    let finalAssistantContent = '';
    let finalToolCalls: AiToolCallResult[] = [];
    let finalQuestion: AiQuestion | undefined;
    let streamCompleted = false;

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyForApi,
          activeSymbol,
          watchlist,
          openWindows,
          portfolioContext: positions.length > 0 ? {
            portfolioName: activePortfolio?.name || 'Portfolio',
            positions: positions.map((p) => ({
              symbol: p.symbol,
              shares: p.shares,
              avgCost: p.avgCost,
            })),
          } : undefined,
          strategiesContext: strategies.length > 0 ? strategies.map(s => ({
            id: s.id,
            name: s.name,
            symbols: s.symbols,
          })) : undefined,
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
              if (CLIENT_TOOL_NAMES.has(data.name)) {
                executeClientTool(data.name, data.args);
              }
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
            } else if (data.type === 'question') {
              const question: AiQuestion = {
                type: data.questionType,
                question: data.question,
                options: data.options,
                answered: false,
              };
              finalQuestion = question;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, question };
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
                question: finalQuestion ?? null,
              },
            ]);
          }
        } catch {
          // Silent fail on persistence — messages are still in local state
        }
      }
    }
  }, [isStreaming, messages, user]);

  const answerQuestion = useCallback((messageId: string, answer: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.question
          ? { ...m, question: { ...m.question, answered: true, selectedOption: answer } }
          : m
      )
    );
    sendMessage(answer);
  }, [sendMessage]);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    answerQuestion,
    startNewConversation,
    conversations,
    activeConversationId,
    loadingConversations,
    loadingMessages,
    selectConversation,
    deleteConversation,
  };
}
