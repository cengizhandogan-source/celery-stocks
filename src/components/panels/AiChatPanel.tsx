'use client';

import { useEffect, useRef, useState } from 'react';
import { useAiChat } from '@/hooks/useAiChat';
import MessageInput from '@/components/chat/MessageInput';
import type { AiChatMessage, AiConversation, AiQuestion } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import Image from 'next/image';
import TickerLogo from '@/components/ui/TickerLogo';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const CHART_COLORS = ['#22d3ee', '#4ade80', '#e9b86e', '#f87171', '#a78bfa', '#fb923c'];

/** Replace <t>SYMBOL</t> HTML tags with markdown links before parsing.
 *  This makes ticker rendering independent of rehype-raw's HTML parsing,
 *  which can fail in certain markdown contexts (tables, headings, etc.). */
function preprocessTickers(content: string): string {
  return content.replace(/<t>([^<]+)<\/t>/gi, (_, sym) => {
    const symbol = sym.trim();
    return `[${symbol}](ticker://${encodeURIComponent(symbol)})`;
  });
}

const TOOL_LABELS: Record<string, string> = {
  get_quote: 'Quote',
  get_quotes: 'Quotes',
  get_key_stats: 'Key Stats',
  get_profile: 'Profile',
  get_news: 'News',
  get_financials: 'Financials',
  get_holders: 'Holders',
  get_filings: 'Filings',
  get_candles: 'Candles',
  get_screener: 'Screener',
  ask_user: 'Question',
};

function formatToolLabel(name: string, args: Record<string, unknown>): string {
  const label = TOOL_LABELS[name] || name;
  const symbol = args.symbol || args.query || (args.symbols as string[])?.join(', ');
  return symbol ? `${label}: ${symbol}` : label;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie';
  title?: string;
  data: { name: string; value: number }[];
  unit?: string;
}

function InlineChart({ json }: { json: string }) {
  let config: ChartConfig;
  try {
    config = JSON.parse(json);
    if (!config.data?.length) throw new Error('No data');
  } catch {
    return <pre className="text-down text-xs p-2">Invalid chart data</pre>;
  }

  const { type, data, title, unit } = config;
  const formatValue = (v: number | string) => (unit ? `${unit}${v}` : String(v));

  return (
    <div className="my-2 p-2 bg-terminal-bg rounded border border-terminal-border">
      {title && (
        <div className="text-xxs font-mono text-cyan mb-2 font-semibold">{title}</div>
      )}
      <ResponsiveContainer width="100%" height={180}>
        {type === 'pie' ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={65}
              dataKey="value"
              label={({ name, value }) => `${name}: ${formatValue(value)}`}
              labelLine={false}
              fontSize={10}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatValue(value as number)} />
          </PieChart>
        ) : type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }} />
            <YAxis tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }} />
            <Tooltip formatter={(value) => formatValue(value as number)} />
            <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={{ fill: '#22d3ee', r: 3 }} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }} />
            <YAxis tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }} />
            <Tooltip formatter={(value) => formatValue(value as number)} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function QuestionButtons({
  question,
  onAnswer,
  disabled,
}: {
  question: AiQuestion;
  onAnswer: (answer: string) => void;
  disabled: boolean;
}) {
  const options = question.type === 'yes_no'
    ? ['Yes', 'No']
    : (question.options || []);

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {options.map((opt, i) => {
        const isSelected = question.selectedOption === opt;
        return (
          <button
            key={i}
            onClick={() => !disabled && onAnswer(opt)}
            disabled={disabled}
            className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
              isSelected
                ? 'border-cyan bg-cyan/15 text-cyan'
                : disabled
                  ? 'border-terminal-border text-text-muted cursor-default opacity-50'
                  : 'border-terminal-border text-text-secondary hover:border-cyan/40 hover:text-text-primary'
            }`}
          >
            {question.type === 'multiple_choice' && options.length > 2 ? `${i + 1}. ${opt}` : opt}
          </button>
        );
      })}
    </div>
  );
}

const markdownComponents = {
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-xs font-mono border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="text-left text-cyan px-2 py-1 border-b border-terminal-border-strong font-semibold">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-2 py-1 border-b border-terminal-border text-text-secondary">{children}</td>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const lang = match?.[1];

    if (lang === 'chart') {
      return <InlineChart json={String(children).trim()} />;
    }

    const isBlock = !!className;
    if (isBlock) {
      return (
        <pre className="bg-terminal-bg rounded p-2 my-2 overflow-x-auto text-xs">
          <code className={className} {...props}>{children}</code>
        </pre>
      );
    }

    return (
      <code className="bg-terminal-hover px-1 py-0.5 rounded text-cyan text-xs" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  t: ({ children }: { children?: React.ReactNode }) => {
    const extractText = (node: React.ReactNode): string => {
      if (typeof node === 'string') return node;
      if (typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(extractText).join('');
      if (node && typeof node === 'object' && 'props' in node) {
        return extractText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
      }
      return '';
    };
    const symbol = extractText(children).trim().toUpperCase();
    if (!symbol) return null;
    return (
      <span className="inline-flex items-center gap-1 align-middle">
        <TickerLogo symbol={symbol} size={14} />
        <span className="text-cyan font-semibold">{symbol}</span>
      </span>
    );
  },
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    if (href?.startsWith('ticker://')) {
      const symbol = decodeURIComponent(href.replace('ticker://', '')).toUpperCase();
      return (
        <span className="inline-flex items-center gap-1 align-middle">
          <TickerLogo symbol={symbol} size={14} />
          <span className="text-cyan font-semibold">{symbol}</span>
        </span>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan underline hover:text-cyan/80"
      >
        {children}
      </a>
    );
  },
};

const EXAMPLES = [
  'Analyze AAPL and compare it with MSFT',
  'How is my portfolio performing?',
  'What are the most active stocks today?',
  'Give me a fundamental analysis of NVDA',
];

function WelcomeState({ onSend }: { onSend: (content: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
      <div className="text-center">
        <div className="text-sm font-mono text-cyan mb-1">AI Assistant</div>
        <div className="text-xs font-mono text-text-muted">
          Ask about any stock, your portfolio, or market trends.
        </div>
      </div>
      <div className="flex flex-col gap-1.5 w-full max-w-xs">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => onSend(ex)}
            className="text-left text-xs font-mono text-text-secondary px-3 py-2 rounded border border-terminal-border hover:border-cyan/40 hover:text-text-primary transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageItem({
  msg,
  onAnswer,
  disabled,
}: {
  msg: AiChatMessage;
  onAnswer: (msgId: string, answer: string) => void;
  disabled: boolean;
}) {
  const isUser = msg.role === 'user';

  return (
    <div className={`px-3 py-2 ${isUser ? 'bg-terminal-hover/50' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xxs font-mono font-semibold ${isUser ? 'text-up' : 'text-cyan'}`}>
          {isUser ? 'You' : 'AI'}
        </span>
        <span className="text-xxs font-mono text-text-muted">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {msg.toolCalls && msg.toolCalls.filter(tc => tc.name !== 'ask_user').length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {msg.toolCalls.filter(tc => tc.name !== 'ask_user').map((tc, i) => (
            <span
              key={i}
              className="text-xxs font-mono text-cyan/80 bg-cyan/8 px-1.5 py-0.5 rounded"
            >
              {formatToolLabel(tc.name, tc.args)}
            </span>
          ))}
        </div>
      )}
      {isUser ? (
        <div className="text-sm font-mono text-text-primary whitespace-pre-wrap break-words leading-relaxed">
          {msg.content}
        </div>
      ) : (
        <>
          <div className="ai-prose text-sm font-mono text-text-primary break-words leading-relaxed">
            {msg.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
                rehypePlugins={[[rehypeRaw, { passThrough: ['math', 'inlineMath'] }], rehypeKatex]}
                components={markdownComponents}
              >
                {preprocessTickers(msg.content)}
              </ReactMarkdown>
            ) : !msg.question ? (
              <div className="flex items-center gap-2 py-1">
                <Image
                  src="/icon.png"
                  alt="Thinking"
                  width={24}
                  height={24}
                  className="celery-thinking pixel-logo"
                />
                <span className="text-xxs font-mono text-text-muted animate-pulse">Thinking...</span>
              </div>
            ) : null}
          </div>
          {msg.question && (
            <QuestionButtons
              question={msg.question}
              onAnswer={(answer) => onAnswer(msg.id, answer)}
              disabled={!!msg.question.answered || disabled}
            />
          )}
        </>
      )}
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ConversationList({
  conversations,
  loadingConversations,
  onSelect,
  onDelete,
  onNewChat,
  onSendFromWelcome,
}: {
  conversations: AiConversation[];
  loadingConversations: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onSendFromWelcome: (content: string) => void;
}) {
  if (loadingConversations) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs font-mono text-text-muted animate-pulse">Loading chats...</span>
      </div>
    );
  }

  if (conversations.length === 0) {
    return <WelcomeState onSend={onSendFromWelcome} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-terminal-border">
        <button
          onClick={onNewChat}
          className="w-full text-xs font-mono text-cyan px-3 py-2 rounded border border-terminal-border hover:border-cyan/40 transition-colors"
        >
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto" data-scrollable>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className="flex items-center gap-2 px-3 py-2.5 border-b border-terminal-border hover:bg-terminal-hover/50 cursor-pointer group"
            onClick={() => onSelect(conv.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-text-primary truncate">{conv.title}</div>
              <div className="text-xxs font-mono text-text-muted mt-0.5">
                {formatRelativeDate(conv.updated_at)}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              className="text-xxs font-mono text-text-muted hover:text-down opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AiChatPanel() {
  const {
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
  } = useAiChat();

  const [view, setView] = useState<'list' | 'chat'>('list');
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el) {
      stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    }
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    setView('chat');
  };

  const handleNewChat = () => {
    startNewConversation();
    setView('chat');
  };

  const handleSendFromWelcome = (content: string) => {
    if (content.trim().toLowerCase() === '/clear') {
      startNewConversation();
      return;
    }
    setView('chat');
    sendMessage(content);
  };

  const handleSend = (content: string) => {
    if (content.trim().toLowerCase() === '/clear') {
      startNewConversation();
      return;
    }
    sendMessage(content);
  };

  if (view === 'list') {
    return (
      <div className="flex flex-col h-full">
        <ConversationList
          conversations={conversations}
          loadingConversations={loadingConversations}
          onSelect={handleSelectConversation}
          onDelete={deleteConversation}
          onNewChat={handleNewChat}
          onSendFromWelcome={handleSendFromWelcome}
        />
        <MessageInput
          onSend={handleSendFromWelcome}
          placeholder="Ask about stocks, your portfolio..."
          disabled={isStreaming}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {loadingMessages ? (
        <div className="flex items-center justify-center h-full">
          <span className="text-xs font-mono text-text-muted animate-pulse">Loading messages...</span>
        </div>
      ) : messages.length === 0 ? (
        <>
          <div className="flex items-center px-3 py-1.5 border-b border-terminal-border">
            <button
              onClick={() => setView('list')}
              className="text-xxs font-mono text-text-muted hover:text-text-primary transition-colors mr-2"
            >
              &larr;
            </button>
            <span className="text-xxs font-mono text-text-muted">New Chat</span>
          </div>
          <WelcomeState onSend={handleSend} />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border">
            <div className="flex items-center min-w-0">
              <button
                onClick={() => setView('list')}
                className="text-xxs font-mono text-text-muted hover:text-text-primary transition-colors mr-2 shrink-0"
              >
                &larr;
              </button>
              <span className="text-xxs font-mono text-text-muted truncate">
                {messages.filter((m) => m.role === 'user').length} messages
              </span>
            </div>
            <button
              onClick={handleNewChat}
              className="text-xxs font-mono text-text-muted hover:text-cyan transition-colors shrink-0"
            >
              New Chat
            </button>
          </div>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto"
            data-scrollable
          >
            {messages.map((msg) => (
              <MessageItem key={msg.id} msg={msg} onAnswer={answerQuestion} disabled={isStreaming} />
            ))}
          </div>
        </>
      )}
      {error && (
        <div className="px-3 py-1.5 text-xxs font-mono text-down bg-down/10 border-t border-down/20">
          {error}
        </div>
      )}
      <MessageInput
        onSend={handleSend}
        placeholder="Ask about stocks, your portfolio..."
        disabled={isStreaming}
      />
    </div>
  );
}
