import { ImageResponse } from 'next/og';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export const alt = 'Coinly post';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TYPE_LABEL: Record<string, string> = {
  text: 'Post',
  position: 'Position',
  trade: 'Trade',
};

export default async function Image({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const supabase = createClient(await cookies());
  const { data } = await supabase
    .from('posts')
    .select('content, post_type, symbol, position_symbol, trade_symbol, profile:profiles!user_id(username, avatar_color)')
    .eq('id', postId)
    .single();

  const profile = data && (Array.isArray(data.profile) ? data.profile[0] : data.profile);
  const authorName = profile?.username ? `@${profile.username}` : 'Unknown';
  const authorColor = profile?.avatar_color ?? '#00FFA3';
  const symbol = data?.symbol ?? data?.position_symbol ?? data?.trade_symbol;
  const content = (data?.content ?? '').slice(0, 280);
  const typeLabel = TYPE_LABEL[data?.post_type ?? 'text'] ?? 'Post';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0B0B0F',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 64,
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#FFFFFF',
        }}
      >
        {/* Top: author */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 32,
            color: authorColor,
            letterSpacing: '0.03em',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: authorColor,
            }}
          />
          <span style={{ fontWeight: 700 }}>{authorName}</span>
          <span style={{ color: '#52525B', fontSize: 20, marginLeft: 8 }}>{typeLabel}</span>
          {symbol && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 24,
                color: '#F5C542',
                padding: '4px 12px',
                background: '#F5C5421a',
                borderRadius: 8,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              ${symbol}
            </span>
          )}
        </div>

        {/* Middle: content */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            marginTop: 40,
            fontSize: 40,
            lineHeight: 1.3,
            color: '#FFFFFF',
          }}
        >
          {content || `${authorName} shared a ${typeLabel.toLowerCase()}`}
        </div>

        {/* Bottom: brand */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 20,
            color: '#A1A1AA',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ color: '#FFD76A', fontWeight: 700 }}>Coinly</span>
          <span style={{ color: '#F5C542' }}>coinly.club</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
