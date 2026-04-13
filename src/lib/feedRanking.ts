import type { Post } from '@/lib/types';

const TYPE_BONUS: Record<string, number> = {
  position: 40,
  trade: 30,
  strategy: 20,
  text: 0,
};

const VALUE_LOG_MULTIPLIER = 5;
const STRATEGY_RETURN_DIVISOR = 10;
const STRATEGY_RETURN_CAP = 15;
const STRATEGY_SHARPE_MULTIPLIER = 3;
const STRATEGY_SHARPE_CAP = 10;

const LIKE_WEIGHT = 3;
const COMMENT_WEIGHT = 2;

const RECENCY_MAX = 20;
const RECENCY_DECAY_PER_HOUR = 0.5;

const RANDOM_AMPLITUDE = 15;

let sessionSeed = Math.random();

export function resetFeedSeed(): void {
  sessionSeed = Math.random();
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}

function seededRandom(postId: string, seed: number): number {
  const combined = hashCode(postId + String(seed));
  const x = Math.sin(combined) * 10000;
  return x - Math.floor(x);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeScore(post: Post, seed: number): number {
  // Type bonus: positions > strategies > text
  const typeBonus = TYPE_BONUS[post.post_type] ?? 0;

  // Value signal (type-specific)
  let valueSignal = 0;
  if (post.post_type === 'position') {
    const usdValue = (post.position_shares ?? 0) * (post.position_avg_cost ?? 0);
    valueSignal = Math.log10(1 + Math.abs(usdValue)) * VALUE_LOG_MULTIPLIER;
  } else if (post.post_type === 'trade') {
    const usdValue = post.trade_quote_qty ?? 0;
    valueSignal = Math.log10(1 + Math.abs(usdValue)) * VALUE_LOG_MULTIPLIER;
  } else if (post.post_type === 'strategy') {
    const totalReturn = post.strategy?.backtest?.total_return ?? 0;
    const sharpeRatio = post.strategy?.backtest?.sharpe_ratio ?? 0;
    valueSignal =
      clamp(totalReturn / STRATEGY_RETURN_DIVISOR, 0, STRATEGY_RETURN_CAP) +
      clamp(sharpeRatio * STRATEGY_SHARPE_MULTIPLIER, 0, STRATEGY_SHARPE_CAP);
  }

  // Engagement signal
  const engagementSignal =
    Math.log2(1 + post.like_count) * LIKE_WEIGHT +
    Math.log2(1 + post.comment_count) * COMMENT_WEIGHT;

  // Recency bonus (decays over ~40 hours)
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 3_600_000;
  const recencyBonus = Math.max(0, RECENCY_MAX - ageHours * RECENCY_DECAY_PER_HOUR);

  // Random factor (stable within session, varies across sessions)
  const randomFactor = seededRandom(post.id, seed) * RANDOM_AMPLITUDE;

  return typeBonus + valueSignal + engagementSignal + recencyBonus + randomFactor;
}

export function rankPosts(posts: Post[]): Post[] {
  if (posts.length <= 1) return posts;

  return [...posts].sort((a, b) => {
    const scoreA = computeScore(a, sessionSeed);
    const scoreB = computeScore(b, sessionSeed);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
