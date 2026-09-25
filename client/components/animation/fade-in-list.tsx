'use client';

import React from 'react';
import { motion, Variants, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FadeInListProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  staggerDelay?: number;
}

const defaultContainerVariants = (staggerDelay = 0.05): Variants => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay
    }
  }
});

export function FadeInList({
  children,
  className,
  staggerDelay = 0.05,
  ...props
}: FadeInListProps) {
  const containerVariants = defaultContainerVariants(staggerDelay);

  return (
    <motion.div
      className={cn(className)}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface FadeInItemProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  yOffset?: number;
  hoverEffect?: boolean;
}

const defaultItemVariants = (yOffset = 15): Variants => ({
  hidden: { opacity: 0, y: yOffset },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  }
});

export function FadeInItem({
  children,
  className,
  yOffset = 15,
  hoverEffect = true,
  ...props
}: FadeInItemProps) {
  const itemVariants = defaultItemVariants(yOffset);

  const hoverProps = hoverEffect
    ? {
        whileHover: { y: -3, scale: 1.012 },
        transition: { type: 'spring' as const, stiffness: 450, damping: 25 }
      }
    : {};

  return (
    <motion.div
      className={cn(className)}
      variants={itemVariants}
      {...hoverProps}
      {...props}
    >
      {children}
    </motion.div>
  );
}
