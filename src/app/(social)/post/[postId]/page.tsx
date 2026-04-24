import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import PostDetailClient from './PostDetailClient';
import SocialTopBar from '@/components/social/SocialTopBar';
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

  const author = post.profile?.username ? `@${post.profile.username}` : 'Unknown';
  const title = `${author} on Coinly`;
  const description = (post.content ?? `${post.post_type} post${post.symbol ? ` — $${post.symbol}` : ''}`).slice(0, 160);
  const url = `${SITE_URL}/post/${postId}`;

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
    <div className="relative flex flex-col">
      <SocialTopBar title="Post" />
      <Link
        href="/"
        aria-label="Back to feed"
        className="absolute top-2 left-0 z-20 inline-flex items-center justify-center w-9 h-9 rounded-full text-text-secondary bg-card/80 border border-border backdrop-blur-sm hover:text-text-primary hover:bg-hover transition-all duration-150 ease-[var(--ease-snap)]"
      >
        <ArrowLeft size={18} strokeWidth={2} />
      </Link>
      <PostDetailClient initialPost={post} />
    </div>
  );
}
