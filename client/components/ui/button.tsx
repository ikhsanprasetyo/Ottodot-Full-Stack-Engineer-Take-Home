'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { motion, AnimatePresence } from 'framer-motion';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] transition-all duration-200 cursor-pointer',
  {
    variants: {
      size: {
        default: 'h-10 px-8 rounded-sm py-2',
        xs: 'h-7 rounded-sm px-3',
        sm: 'h-8 rounded-sm px-3',
        lg: 'h-11 rounded-sm px-8',
        icon: 'h-10 w-10',
        action: 'h-9 px-4 gap-1.5',
        primary: 'h-9 px-4 gap-1.5'
      },
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        submit:
          'bg-blue-600 text-white hover:bg-blue-600/90 focus-visible:ring-blue-500 w-full',
        social: 'w-full bg-background border border-input hover:bg-accent',
        green:
          'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none shadow-sm hover:shadow-lg hover:scale-[1.02] font-bold',
        primary:
          'bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-sm transition-colors',
        reset:
          'text-red-500 hover:text-red-700 text-xs font-bold hover:underline transition-colors bg-transparent'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'primary'
    }
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode | React.ComponentType<any>;
  href?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'primary',
      asChild = false,
      isLoading = false,
      icon,
      href,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const router = useRouter();

    const [showSuccess, setShowSuccess] = React.useState(false);
    const prevLoading = React.useRef(isLoading);

    React.useEffect(() => {
      if (prevLoading.current && !isLoading) {
        setShowSuccess(true);
        const timer = setTimeout(() => {
          setShowSuccess(false);
        }, 1800);
        return () => clearTimeout(timer);
      }
      prevLoading.current = isLoading;
    }, [isLoading]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (props.disabled || isLoading || showSuccess) return;
      if (href) {
        e.preventDefault();
        router.push(href);
      }
      onClick?.(e);
    };

    const renderIcon = () => {
      if (!icon) return null;
      if (React.isValidElement(icon)) {
        return icon;
      }
      const IconComponent = icon as React.ComponentType<any>;
      return <IconComponent className="h-4 w-4" />;
    };

    return (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          showSuccess &&
            '!bg-emerald-600 hover:!bg-emerald-600 !text-white !border-emerald-600',
          className
        )}
        disabled={props.disabled || isLoading || showSuccess}
        onClick={handleClick as any}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center justify-center gap-1.5"
              >
                <svg
                  className="h-4 w-4 stroke-current"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="3.5"
                >
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      delay: 0.05,
                      duration: 0.35,
                      ease: 'easeOut'
                    }}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Berhasil!</span>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center"
              >
                {isLoading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {!isLoading && icon && (
                  <span
                    className={
                      size === 'icon' || !children
                        ? 'flex items-center justify-center'
                        : 'mr-1 flex items-center justify-center'
                    }
                  >
                    {renderIcon()}
                  </span>
                )}
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';
