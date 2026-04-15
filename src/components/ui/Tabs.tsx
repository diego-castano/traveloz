'use client';

import * as React from 'react';
import { Tabs as RadixTabs } from 'radix-ui';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/components/lib/cn';
import { springs } from '@/components/lib/animations';

/* ------------------------------------------------------------------ */
/*  Context to share active value + layoutId + variant                  */
/* ------------------------------------------------------------------ */

type TabsVariant = 'light' | 'dark';

interface TabsContextValue {
  activeValue: string | undefined;
  layoutId: string;
  variant: TabsVariant;
}

const TabsContext = React.createContext<TabsContextValue>({
  activeValue: undefined,
  layoutId: 'activeTab',
  variant: 'light',
});

/* ------------------------------------------------------------------ */
/*  Tabs (Root)                                                        */
/* ------------------------------------------------------------------ */

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  layoutId?: string;
  /** Color scheme: 'light' for light backgrounds, 'dark' for dark backgrounds */
  variant?: TabsVariant;
  className?: string;
  children: React.ReactNode;
}

function Tabs({
  value,
  defaultValue,
  onValueChange,
  layoutId = 'activeTab',
  variant = 'light',
  className,
  children,
}: TabsProps) {
  // Track active value internally when uncontrolled
  const [internalValue, setInternalValue] = React.useState<string | undefined>(
    defaultValue
  );

  const activeValue = value ?? internalValue;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [value, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ activeValue, layoutId, variant }}>
      <RadixTabs.Root
        value={activeValue}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        className={cn(className)}
      >
        {children}
      </RadixTabs.Root>
    </TabsContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  TabsList                                                           */
/* ------------------------------------------------------------------ */

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

function TabsList({ className, children }: TabsListProps) {
  const { variant } = React.useContext(TabsContext);

  return (
    <RadixTabs.List
      className={cn(
        'relative flex border-b overflow-x-auto scrollbar-none',
        variant === 'dark' ? 'border-white/10' : 'border-neutral-200',
        className
      )}
    >
      {children}
    </RadixTabs.List>
  );
}

/* ------------------------------------------------------------------ */
/*  TabsTrigger                                                        */
/* ------------------------------------------------------------------ */

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

function TabsTrigger({ value, className, children }: TabsTriggerProps) {
  const { activeValue, layoutId, variant } = React.useContext(TabsContext);
  const isActive = activeValue === value;

  return (
    <RadixTabs.Trigger
      value={value}
      className={cn(
        'relative px-4 py-2.5 text-[13.5px] font-medium transition-colors',
        variant === 'dark'
          ? 'text-white/50 hover:text-white/90 hover:bg-white/8 data-[state=active]:text-white data-[state=active]:font-semibold'
          : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 data-[state=active]:text-neutral-900 data-[state=active]:font-semibold',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40',
        className
      )}
    >
      {children}
      {isActive && (
        <motion.div
          layoutId={layoutId}
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #8B5CF6, #3BBFAD)',
          }}
          transition={springs.snappy}
        />
      )}
    </RadixTabs.Trigger>
  );
}

/* ------------------------------------------------------------------ */
/*  TabsContent                                                        */
/* ------------------------------------------------------------------ */

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

function TabsContent({ value, className, children }: TabsContentProps) {
  return (
    <RadixTabs.Content
      value={value}
      className={cn('mt-4 focus-visible:outline-none', className)}
    >
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </RadixTabs.Content>
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps, TabsVariant };
