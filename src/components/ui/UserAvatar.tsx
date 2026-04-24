'use client';

import { useState } from 'react';
import Image from 'next/image';

const SIZE_MAP = {
  xs: { className: 'w-6 h-6', px: 24 },
  sm: { className: 'w-9 h-9', px: 36 },
  md: { className: 'w-11 h-11', px: 44 },
  lg: { className: 'w-14 h-14', px: 56 },
  xl: { className: 'w-24 h-24', px: 96 },
} as const;

interface UserAvatarProps {
  avatarUrl?: string | null;
  size?: keyof typeof SIZE_MAP;
  className?: string;
}

export default function UserAvatar({ avatarUrl, size = 'sm', className = '' }: UserAvatarProps) {
  const [errored, setErrored] = useState(false);
  const { className: sizeClass, px } = SIZE_MAP[size];
  const usingFallback = !avatarUrl || errored;
  const src = usingFallback ? '/coinly-logo.webp' : avatarUrl;

  return (
    <Image
      src={src}
      alt=""
      width={px}
      height={px}
      onError={() => setErrored(true)}
      className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
      unoptimized={!usingFallback}
    />
  );
}
