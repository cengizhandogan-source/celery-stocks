'use client';

import { useState } from 'react';

const SIZE_CLASSES = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-16 h-16',
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
