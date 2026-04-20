import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import PostDetailClient from './PostDetailClient';
import type { Post } from '@/lib/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://coinly.club';

const POST_SELECT = `
  *,
  profile:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth)
`;

async function fetchPost(postId: string): Promise<Post | null> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.from('posts').select(POST_SELECT).eq('id', postId).single();
  if (!data) return null;

  const profile = Array.isArray(data.profile) ? data.profile[0] : data.profile;
  return {
    ...data,
    profile,
    liked_by_me: false,
  } as Post;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  const post = await fetchPost(postId);
  if (!post) return { title: 'Post not found' };

  const author = post.profile?.display_name ?? 'Unknown';
  const title = `${author} on Coinly`;
  const description = (post.content ?? `${post.post_type} post${post.symbol ? ` — $${post.symbol}` : ''}`).slice(0, 160);
  const url = `${SITE_URL}/social/post/${postId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: { canonical: url },
  };
}

export default async function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const post = await fetchPost(postId);
  if (!post) notFound();

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-base/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <Link
            href="/social"
            className="text-text-muted hover:text-text-primary transition-colors text-sm font-mono"
            aria-label="Back to feed"
          >
            &larr;
          </Link>
          <h1 className="text-sm font-mono font-bold text-text-primary uppercase tracking-wider">
            Post
          </h1>
        </div>
      </div>
      <PostDetailClient initialPost={post} />
    </div>
  );
}
