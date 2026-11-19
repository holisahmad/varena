'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, HelpCircle, ShieldCheck } from 'lucide-react';

export type DialogVariant = 'emerald' | 'amber' | 'rose' | 'espresso' | 'gold';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  detail?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  icon?: 'check' | 'warning' | 'info' | 'shield' | 'question';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  detail,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'emerald',
  icon = 'check',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  // Icon styling mapping
  const renderIcon = () => {
    switch (icon) {
      case 'check':
        return <CheckCircle2 className="w-6 h-6 text-emerald-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
      case 'shield':
        return <ShieldCheck className="w-6 h-6 text-emerald-700" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-600" />;
      case 'question':
      default:
        return <HelpCircle className="w-6 h-6 text-varena-gold" />;
    }
  };

  const getVariantButtonClass = () => {
    switch (variant) {
      case 'rose':
        return 'bg-rose-700 hover:bg-rose-800 text-white shadow-rose-900/20';
      case 'amber':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20';
      case 'espresso':
        return 'bg-varena-espresso hover:bg-varena-espresso-dark text-varena-gold-light shadow-varena-espresso/20';
      case 'gold':
        return 'bg-varena-gold hover:bg-varena-gold-dark text-white shadow-varena-gold/20';
      case 'emerald':
      default:
        return 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-900/20';
    }
  };

  const getIconContainerBg = () => {
    switch (variant) {
      case 'rose':
        return 'bg-rose-50 border-rose-200';
      case 'amber':
        return 'bg-amber-50 border-amber-200';
      case 'espresso':
        return 'bg-varena-ivory border-varena-gold/30';
      case 'gold':
        return 'bg-amber-50/70 border-varena-gold/40';
      case 'emerald':
      default:
        return 'bg-emerald-50 border-emerald-200';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-fadeIn"
        onClick={() => !isLoading && onCancel()}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-varena-gold/40 overflow-hidden z-10 animate-scaleUp">
        {/* Luxury Gold/Espresso Header Stripe */}
        <div className="h-1.5 bg-gradient-to-r from-varena-gold via-varena-espresso to-varena-gold" />

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${getIconContainerBg()}`}>
              {renderIcon()}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif text-base font-bold text-varena-espresso leading-snug">
                  {title}
                </h3>
                {!isLoading && (
                  <button
                    onClick={onCancel}
                    className="text-varena-taupe hover:text-varena-espresso p-1 rounded-lg hover:bg-varena-ivory transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-varena-taupe-dark mt-1 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Optional Detail Box */}
          {detail && (
            <div className="p-3.5 rounded-xl bg-varena-ivory-light border border-varena-taupe/20 text-xs text-varena-espresso">
              {detail}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-varena-taupe/30 text-xs font-semibold text-varena-espresso hover:bg-varena-ivory transition disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition shadow-md flex items-center gap-1.5 disabled:opacity-50 ${getVariantButtonClass()}`}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
