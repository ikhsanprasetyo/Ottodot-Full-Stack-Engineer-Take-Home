'use client';

import { DialogBase } from './dialog-base';
import { Button } from './button';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  isDestructive = true,
  isLoading = false
}: ConfirmationDialogProps) {
  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <div className="flex w-full justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="text-gray-500 font-bold hover:bg-gray-100 hover:text-gray-900 h-9"
          >
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'primary'}
            isLoading={isLoading}
            onClick={async () => {
              await onConfirm();
              onOpenChange(false);
            }}
            className="h-9 font-bold"
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="text-sm text-gray-600">
        <p>{description}</p>
      </div>
    </DialogBase>
  );
}
