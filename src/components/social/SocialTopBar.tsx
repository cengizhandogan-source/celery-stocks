import { ReactNode } from 'react';

export default function SocialTopBar({
  title,
  left,
  right,
}: {
  title: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-10 h-[56px] bg-base/80 backdrop-blur-md border-b border-border">
        <div className="relative h-full flex items-center">
          {left && <div className="absolute left-[calc(240px+1rem)] flex items-center">{left}</div>}
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-sans font-semibold text-text-primary tracking-tight">
            {title}
          </h1>
          {right && <div className="absolute right-4 flex items-center">{right}</div>}
        </div>
      </div>
      <div className="h-[56px]" aria-hidden />
    </>
  );
}
