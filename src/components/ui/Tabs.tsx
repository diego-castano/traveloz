'use client';

import * as React from 'react';
import { Tabs as RadixTabs } from 'radix-ui';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/components/lib/cn';
import { springs } from '@/components/lib/animations';

/* ------------------------------------------------------------------ */
/*  Context to share active value + layoutId across sub-components     */
/* ------------------------------------------------------------------ */

interface TabsContextValue {
  activeValue: string | undefined;
  layoutId: string;
}

const TabsContext = React.createContext<TabsContextValue>({
  activeValue: undefined,
  layoutId: 'activeTab',
});

/* ------------------------------------------------------------------ */
/*  Tabs (Root)                                                        */
/* ------------------------------------------------------------------ */

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  layoutId?: string;
  className?: string;
  children: React.ReactNode;
}

function Tabs({
  value,
  defaultValue,
  onValueChange,
  layoutId = 'activeTab',
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
    <TabsContext.Provider value={{ activeValue, layoutId }}>
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
  return (
    <RadixTabs.List
      className={cn(
        'relative flex border-b border-white/10',
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
  const { activeValue, layoutId } = React.useContext(TabsContext);
  const isActive = activeValue === value;

  return (
    <RadixTabs.Trigger
      value={value}
      className={cn(
        'relative px-4 py-2.5 text-[13.5px] font-medium transition-colors',
        'text-white/50 hover:text-white/90 hover:bg-white/8',
        'data-[state=active]:text-white data-[state=active]:font-semibold',
        'focus-visible:outline-none focus-visible:shadow-focus-teal',
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
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps };
