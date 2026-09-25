import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';

type UseRestoreHandlerProps = {
  entityName: string; // Contoh: "Material"
  mutationFn: (id: string, options?: any) => void;
  invalidateQueryKey: string[]; // Contoh: ['materials']
};

export function useRestoreHandler({
  entityName,
  mutationFn,
  invalidateQueryKey
}: UseRestoreHandlerProps) {
  const queryClient = useQueryClient();

  const handleRestore = (
    item: any & { _id: string; key?: string; name?: string }
  ) => {
    const name = item.key || item.name || item._id;

    if (confirm(`Restore ${entityName} "${name}"?`)) {
      mutationFn(item._id, {
        onSuccess: () => {
          toast.success(`${entityName} "${name}" restored successfully`);
          queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
        },
        onError: (err: any) => {
          let message = `Failed to restore ${entityName}`;

          if (isAxiosError(err)) {
            message =
              err.response?.data?.message ||
              err.response?.data?.errors?.[0]?.message ||
              err.message ||
              message;
          } else {
            message =
              err?.response?.data?.message ||
              err?.data?.message ||
              err?.message ||
              message;
          }

          toast.error(message);
        }
      });
    }
  };

  return handleRestore;
}
