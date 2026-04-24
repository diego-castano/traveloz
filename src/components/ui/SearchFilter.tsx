'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import { cn } from '@/components/lib/cn';
import { springs, interactions } from '@/components/lib/animations';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FilterChip {
  label: string;
  value: string;
  active: boolean;
}

interface SearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: FilterChip[];
  onFilterToggle: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  SearchFilter                                                       */
/* ------------------------------------------------------------------ */

function SearchFilter({
  searchValue,
  onSearchChange,
  filters,
  onFilterToggle,
  placeholder = 'Buscar...',
  className,
}: SearchFilterProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Glass search bar */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-[12px] border px-3',
          'transition-all duration-200',
          isFocused
            ? 'border-teal-300 bg-white shadow-[0_0_0_4px_rgba(59,191,173,0.12),0_8px_18px_rgba(17,17,36,0.08)]'
            : 'border-neutral-200 bg-white shadow-[0_2px_8px_rgba(17,17,36,0.04)] hover:border-neutral-300'
        )}
        style={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
            isFocused ? 'bg-teal-50 text-teal-600' : 'bg-neutral-50 text-neutral-400'
          )}
        >
          <Search className="h-4 w-4" />
        </span>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="h-10 w-full bg-transparent border-none text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
        />
      </div>

      {/* Filter chips */}
      {filters.map((filter) => (
        <motion.button
          key={filter.value}
          type="button"
          onClick={() => onFilterToggle(filter.value)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium',
            'border transition-colors',
            filter.active
              ? 'text-brand-teal-600 border-brand-teal-200'
              : 'text-neutral-500 border-transparent'
          )}
          style={{
            background: filter.active
              ? 'rgba(230,248,245,0.7)'
              : 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          whileTap={interactions.buttonPress.whileTap}
          transition={springs.snappy}
        >
          {filter.label}
        </motion.button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { SearchFilter };
export type { SearchFilterProps, FilterChip };
