'use client';

import { useState } from 'react';

const SIZE_CLASSES = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
} as const;

interface UserAvatarProps {
  avatarUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export default function UserAvatar({ avatarUrl, size = 'sm', className = '' }: UserAvatarProps) {
  const [errored, setErrored] = useState(false);
  const src = avatarUrl && !errored ? avatarUrl : '/celery-logo.png';

  return (
    <img
      src={src}
      alt=""
      onError={() => setErrored(true)}
      className={`${SIZE_CLASSES[size]} rounded-full object-cover shrink-0 ${className}`}
    />
  );
}
