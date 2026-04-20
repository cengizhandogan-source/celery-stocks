'use client';

import { useState } from 'react';

const SIZE_CLASSES = {
  xs: 'w-6 h-6',
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
  xl: 'w-24 h-24',
} as const;

interface UserAvatarProps {
  avatarUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export default function UserAvatar({ avatarUrl, size = 'sm', className = '' }: UserAvatarProps) {
  const [errored, setErrored] = useState(false);
  const src = avatarUrl && !errored ? avatarUrl : '/coinly-logo.png';

  return (
    <img
      src={src}
      alt=""
      onError={() => setErrored(true)}
      className={`${SIZE_CLASSES[size]} rounded-full object-cover shrink-0 ${className}`}
    />
  );
}
