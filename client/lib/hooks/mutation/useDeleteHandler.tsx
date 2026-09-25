import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { setDateStr } from '@/lib/date';

type UseDeleteHandlerProps = {
  entityName: string; // Contoh: "Serial Key"
  mutationFn: (id: string, options?: any) => void;
  invalidateQueryKey: string[]; // Contoh: ['serial-keys']
  isPermanentDelete?: boolean;
};

export function useDeleteHandler({
  entityName,
  mutationFn,
  invalidateQueryKey,
  isPermanentDelete = false
}: UseDeleteHandlerProps) {
  const queryClient = useQueryClient();

  const handleDelete = (
    item: any & {
      _id: string;
      key?: string;
      name?: string;
      date?: Date | string | null;
      outlet?: any;
    }
  ) => {
    const name =
      item.key || item.name || setDateStr(item.date, 'DD-MM-YYYY') || item._id;

    if (
      confirm(
        `${isPermanentDelete ? 'Permanently delete' : 'Delete'} ${entityName} "${name}" ${item.outlet?.label || ''}?`
      )
    ) {
      mutationFn(item._id, {
        onSuccess: () => {
          toast.success(
            `${entityName} "${name}" deleted ${isPermanentDelete ? 'permanently successfully' : 'successfully'}`
          );
          queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
        },
        onError: (err: any) => {
          let message = `Failed to ${isPermanentDelete ? 'permanently delete' : 'delete'} ${entityName}`;

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

  return handleDelete;
}
