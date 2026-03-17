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
          'flex items-center gap-2 rounded-[10px] border border-neutral-150/50 px-3',
          'transition-shadow duration-200',
          isFocused && 'shadow-focus-teal'
        )}
        style={{
          width: 260,
          background: isFocused
            ? 'rgba(255,255,255,0.85)'
            : 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <Search className="h-4 w-4 shrink-0 text-neutral-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="h-9 w-full bg-transparent border-none focus:outline-none text-sm text-neutral-700 placeholder:text-neutral-400"
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
