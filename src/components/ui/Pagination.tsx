'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between text-xs px-3 py-2 bg-white rounded-xl border border-varena-taupe/20 ${className}`}>
      {totalItems !== undefined ? (
        <span className="text-varena-taupe text-[11px] font-mono">
          Total: {totalItems.toLocaleString('id-ID')}
        </span>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Halaman Sebelumnya"
          className="p-1.5 rounded-lg border border-varena-taupe/30 hover:bg-varena-ivory text-varena-espresso disabled:opacity-30 disabled:pointer-events-none transition flex items-center justify-center"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="font-mono text-varena-espresso font-semibold text-[11px] px-2.5 py-1 bg-varena-ivory-light rounded-md border border-varena-taupe/20">
          {currentPage} dari {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Halaman Berikutnya"
          className="p-1.5 rounded-lg border border-varena-taupe/30 hover:bg-varena-ivory text-varena-espresso disabled:opacity-30 disabled:pointer-events-none transition flex items-center justify-center"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
