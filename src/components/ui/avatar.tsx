import * as React from 'react';

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0]?.toUpperCase())
    .slice(0, 2)
    .join('');
  return (
    <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs text-slate-200">
      {initials || '?'}
    </div>
  );
}
