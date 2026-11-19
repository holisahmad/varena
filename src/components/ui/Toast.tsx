'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  isOpen: boolean;
  type?: 'success' | 'error' | 'info';
  title?: string;
  message: string;
  duration?: number;
  onClose: () => void;
}

export default function Toast({
  isOpen,
  type = 'success',
  title,
  message,
  duration = 4000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (!isOpen || duration <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getTheme = () => {
    switch (type) {
      case 'error':
        return {
          border: 'border-rose-300',
          bg: 'bg-white',
          iconBg: 'bg-rose-100 text-rose-700',
          icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
          titleColor: 'text-rose-900',
          defaultTitle: 'Terjadi Kesalahan',
        };
      case 'info':
        return {
          border: 'border-blue-300',
          bg: 'bg-white',
          iconBg: 'bg-blue-100 text-blue-700',
          icon: <Info className="w-5 h-5 text-blue-600" />,
          titleColor: 'text-blue-900',
          defaultTitle: 'Informasi',
        };
      case 'success':
      default:
        return {
          border: 'border-emerald-300',
          bg: 'bg-white',
          iconBg: 'bg-emerald-100 text-emerald-700',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
          titleColor: 'text-emerald-950',
          defaultTitle: 'Berhasil',
        };
    }
  };

  const theme = getTheme();

  return (
    <div className="fixed top-5 right-5 z-[110] max-w-sm w-full animate-slideIn">
      <div
        className={`p-4 rounded-2xl shadow-xl border ${theme.border} ${theme.bg} flex items-start gap-3 relative overflow-hidden`}
      >
        {/* Accent Bar */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 ${
            type === 'error' ? 'bg-rose-600' : type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'
          }`}
        />

        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${theme.iconBg}`}>
          {theme.icon}
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <div className={`font-serif text-xs font-bold ${theme.titleColor}`}>
            {title || theme.defaultTitle}
          </div>
          <div className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
            {message}
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
