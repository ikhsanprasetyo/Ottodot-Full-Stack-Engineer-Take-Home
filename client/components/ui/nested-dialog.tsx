'use client';

/**
 * NestedDialog - Komponen dialog khusus untuk digunakan di dalam dialog lain.
 *
 * Masalah: Radix UI Dialog menggunakan DismissableLayer yang secara otomatis menutup
 * dialog "luar" ketika dialog "dalam" membuka overlay-nya. Solusinya adalah menggunakan
 * z-index lebih tinggi dan mencegah semua outside events dari nested dialog ke parent.
 *
 * Penggunaan:
 *   Ganti Dialog/DialogContent/DialogHeader/etc dengan NestedDialog/NestedDialogContent/etc
 *   saat dialog ada di dalam dialog lain.
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const NestedDialog = DialogPrimitive.Root;
const NestedDialogTrigger = DialogPrimitive.Trigger;
const NestedDialogPortal = DialogPrimitive.Portal;
const NestedDialogClose = DialogPrimitive.Close;

/**
 * Overlay untuk NestedDialog - z-[60] agar tampil di atas parent dialog overlay (z-50),
 * dan stopPropagation untuk mencegah event ke parent.
 */
const NestedDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, onClick, onPointerDown, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    onPointerDown={(e) => {
      onPointerDown?.(e);
      e.stopPropagation();
    }}
    onClick={(e) => {
      onClick?.(e);
      e.stopPropagation();
    }}
    className={cn(
      'fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
NestedDialogOverlay.displayName = 'NestedDialogOverlay';

/**
 * Content untuk NestedDialog - z-[61] lebih tinggi dari parent (z-50) + semua
 * outside events di-prevent agar parent dialog tidak ikut tertutup.
 */
const NestedDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(
  (
    {
      className,
      children,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      onEscapeKeyDown,
      ...props
    },
    ref
  ) => (
    <NestedDialogPortal>
      <NestedDialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-[50%] top-[50%] z-[61] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-lg sm:rounded-sm',
          className
        )}
        onPointerDownOutside={(e) => {
          onPointerDownOutside?.(e);
          e.preventDefault();
          e.stopPropagation();
        }}
        onFocusOutside={(e) => {
          onFocusOutside?.(e);
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          onInteractOutside?.(e);
          e.preventDefault();
          e.stopPropagation();
        }}
        onEscapeKeyDown={(e) => {
          // Hanya tutup nested dialog saat ESC, jangan propagate ke parent
          onEscapeKeyDown?.(e);
          e.stopPropagation();
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </NestedDialogPortal>
  )
);
NestedDialogContent.displayName = 'NestedDialogContent';

const NestedDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className
    )}
    {...props}
  />
);
NestedDialogHeader.displayName = 'NestedDialogHeader';

const NestedDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
);
NestedDialogFooter.displayName = 'NestedDialogFooter';

const NestedDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
NestedDialogTitle.displayName = DialogPrimitive.Title.displayName;

const NestedDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
NestedDialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  NestedDialog,
  NestedDialogPortal,
  NestedDialogOverlay,
  NestedDialogTrigger,
  NestedDialogClose,
  NestedDialogContent,
  NestedDialogHeader,
  NestedDialogFooter,
  NestedDialogTitle,
  NestedDialogDescription
};
