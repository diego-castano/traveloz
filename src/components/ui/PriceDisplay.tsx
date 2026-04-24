'use client';

import * as React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/components/lib/cn';
import { glassMaterials } from '@/components/lib/glass';
import { formatCurrency } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PriceDisplayProps {
  neto: number;
  markup: number; // factor divisor, e.g. 0.88
  venta: number;
  onMarkupChange?: (markup: number) => void;
  onVentaChange?: (venta: number) => void;
  editable?: boolean;
  size?: 'sm' | 'lg';
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Size Variants                                                      */
/* ------------------------------------------------------------------ */

const sizeConfig = {
  sm: {
    wrapper: 'p-2 px-3 gap-3',
    label: 'text-[10px]',
    netoValue: 'text-sm',
    markupValue: 'text-sm',
    ventaValue: 'text-base font-bold',
    arrowSize: 'h-3.5 w-3.5',
    inputMarkup: 'w-14 text-xs',
    inputVenta: 'w-20 text-sm',
    usdSuffix: 'text-[10px]',
  },
  lg: {
    wrapper: 'p-3 px-4 gap-4',
    label: 'text-[11px]',
    netoValue: 'text-base',
    markupValue: 'text-base',
    ventaValue: 'text-lg font-bold',
    arrowSize: 'h-4 w-4',
    inputMarkup: 'w-16 text-sm',
    inputVenta: 'w-24 text-base',
    usdSuffix: 'text-xs',
  },
} as const;

/* ------------------------------------------------------------------ */
/*  PriceDisplay                                                       */
/* ------------------------------------------------------------------ */

function PriceDisplay({
  neto,
  markup,
  venta,
  onMarkupChange,
  onVentaChange,
  editable = false,
  size = 'lg',
  className,
}: PriceDisplayProps) {
  const s = sizeConfig[size];

  return (
    <div
      className={cn(
        'flex items-center rounded-clay',
        s.wrapper,
        className
      )}
      style={glassMaterials.frostedSubtle}
    >
      {/* Neto block */}
      <div className="flex flex-col">
        <span
          className={cn(
            s.label,
            'uppercase text-neutral-400 font-medium tracking-wide'
          )}
        >
          Neto
        </span>
        <span
          className={cn(s.netoValue, 'font-mono text-neutral-600 font-semibold')}
        >
          {formatCurrency(neto)}
        </span>
      </div>

      {/* Arrow 1 */}
      <ArrowRight
        className={cn(s.arrowSize, 'animate-arrow-pulse shrink-0')}
        style={{ color: '#B0B4CD' }}
      />

      {/* Markup block */}
      <div className="flex flex-col">
        <span
          className={cn(
            s.label,
            'uppercase text-orange-400 font-medium tracking-wide'
          )}
        >
          Markup
        </span>
        {editable ? (
          <input
            type="number"
            value={markup}
            onChange={(e) => onMarkupChange?.(Number(e.target.value))}
            className={cn(
              s.inputMarkup,
              'font-mono text-orange-400 font-semibold text-center',
              'rounded-md border border-neutral-150/50 bg-white/50 px-1.5 py-0.5',
              'focus:outline-none focus:shadow-focus-teal'
            )}
            min={0.01}
            max={1}
            step={0.01}
          />
        ) : (
          <span
            className={cn(
              s.markupValue,
              'font-mono text-orange-400 font-semibold'
            )}
          >
            {markup}
          </span>
        )}
      </div>

      {/* Arrow 2 */}
      <ArrowRight
        className={cn(s.arrowSize, 'animate-arrow-pulse shrink-0')}
        style={{ color: '#B0B4CD' }}
      />

      {/* Venta block */}
      <div className="flex flex-col">
        <span
          className={cn(
            s.label,
            'uppercase text-neutral-400 font-medium tracking-wide'
          )}
        >
          Precio Venta
        </span>
        <div className="flex items-baseline gap-1">
          {editable ? (
            <input
              type="number"
              value={venta}
              onChange={(e) => onVentaChange?.(Number(e.target.value))}
              className={cn(
                s.inputVenta,
                'font-mono text-neutral-900 font-bold',
                'rounded-md border border-neutral-150/50 bg-white/50 px-1.5 py-0.5',
                'focus:outline-none focus:shadow-focus-teal'
              )}
              min={0}
            />
          ) : (
            <span
              className={cn(
                s.ventaValue,
                'font-mono text-neutral-900'
              )}
            >
              {formatCurrency(venta)}
            </span>
          )}
          <span className={cn(s.usdSuffix, 'text-neutral-400')}>USD</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { PriceDisplay };
export type { PriceDisplayProps };
