import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ottodotApi } from '@/lib/ottodot-api';

/**
 * Mutation hook for creating a trial booking
 */
export const useCreateBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      trialClassId
    }: {
      studentId: string;
      trialClassId: string;
    }) => {
      return await ottodotApi.createBooking(studentId, trialClassId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-classes'] });
      queryClient.invalidateQueries({ queryKey: ['parents-students'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['userBookings'] });
    }
  });
};

/**
 * Mutation hook for processing mock payments
 */
export const useProcessPaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      paymentToken,
      outcome
    }: {
      bookingId: string;
      paymentToken: string;
      outcome: 'success' | 'fail_payment';
    }) => {
      return await ottodotApi.processPayment(bookingId, paymentToken, outcome);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-classes'] });
      queryClient.invalidateQueries({ queryKey: ['class-roster'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['userBookings'] });
    }
  });
};

/**
 * Mutation hook for updating class capacity (Admin)
 */
export const useUpdateClassCapacityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload
    }: {
      id: string;
      payload: {
        title: string;
        subject: string;
        start_time: string;
        capacity: number;
      };
    }) => {
      return await ottodotApi.updateClassCapacity(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-classes'] });
      queryClient.invalidateQueries({ queryKey: ['class-roster'] });
    }
  });
};
