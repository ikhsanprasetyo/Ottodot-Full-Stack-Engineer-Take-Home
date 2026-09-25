import { useQuery } from '@tanstack/react-query';
import { ottodotApi, TrialClass, Parent, RosterItem } from '@/lib/ottodot-api';

/**
 * Fetch all available trial classes
 */
export const useGetTrialClasses = (enabled: boolean = true) => {
  return useQuery<TrialClass[]>({
    queryKey: ['trial-classes'],
    queryFn: async () => {
      return await ottodotApi.getClasses();
    },
    staleTime: 1000 * 5,
    enabled
  });
};

/**
 * Fetch parents and their children/students
 */
export const useGetParentsAndStudents = (enabled: boolean = true) => {
  return useQuery<Parent[]>({
    queryKey: ['parents-students'],
    queryFn: async () => {
      return await ottodotApi.getParentsAndStudents();
    },
    staleTime: 1000 * 60 * 5,
    enabled
  });
};

/**
 * Fetch confirmed student roster for a specific trial class
 */
export const useGetClassRoster = (classId: string, enabled: boolean = true) => {
  return useQuery<{
    class: TrialClass;
    roster: RosterItem[];
    count: number;
    capacity: number;
  }>({
    queryKey: ['class-roster', classId],
    queryFn: async () => {
      if (!classId) throw new Error('Class ID is required');
      return await ottodotApi.getClassRoster(classId);
    },
    enabled: Boolean(enabled && classId),
    staleTime: 1000 * 5
  });
};
