import React from 'react';

interface NotifBadgeProps {
  count: number;
  className?: string;
}

/**
 * Red dot badge — renders only when count > 0.
 * Position it with `relative` on the parent and `absolute` via className if needed.
 */
export default function NotifBadge({ count, className = '' }: NotifBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none shadow ${className}`}
      aria-label={`${count} notifikasi`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}
