'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Root wrapper
const Tabs = TabsPrimitive.Root;

// ====================== Tabs List ======================
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'relative flex items-center justify-start gap-1.5 rounded-sm border border-gray-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-md h-11',
      'dark:border-gray-800 dark:bg-gray-900/60',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

// ====================== Tabs Trigger ======================
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    {...props}
    className={cn(
      'relative flex items-center justify-center px-4 py-1.5 text-sm font-semibold transition-all duration-200 rounded-sm h-9 cursor-pointer select-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
      'text-gray-600 bg-gray-100/70 border border-gray-200/60 hover:text-gray-900 hover:bg-white',
      'dark:text-gray-300 dark:bg-gray-800/60 dark:hover:text-white dark:hover:bg-gray-800',
      'disabled:opacity-50 disabled:pointer-events-none',
      // Aktif → Warna biru korporat solid dengan shadow menonjol
      'data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-transparent dark:data-[state=active]:bg-blue-600',
      'data-[state=active]:font-bold data-[state=active]:shadow-md',
      className
    )}
  >
    {children}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

// ====================== Tabs Content ======================
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    {...props}
    className={cn('w-full', 'data-[state=inactive]:hidden', className)}
  >
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  </TabsPrimitive.Content>
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

// ====================== Export ======================
export { Tabs, TabsList, TabsTrigger, TabsContent };
