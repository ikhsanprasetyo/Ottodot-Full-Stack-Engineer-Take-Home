import axios from 'axios';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (process.env.NEXT_PUBLIC_API) return `${process.env.NEXT_PUBLIC_API}/v1`;
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:9050/api/v1';
  }
  return 'https://serverottodot.byteseeker.net/api/v1';
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ottodot_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface TrialClass {
  id: string;
  title: string;
  subject: string;
  start_time: string;
  capacity: number;
  enrolled_count: number;
  remaining_seats: number;
  is_full: boolean;
}

export interface Student {
  id: string;
  parent_id: string;
  name: string;
  age: number;
}

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string;
  students: Student[];
}

export interface Booking {
  id: string;
  student_id: string;
  trial_class_id: string;
  status: 'pending_payment' | 'confirmed' | 'payment_failed' | 'cancelled' | 'expired';
  payment_token: string;
  created_at: string;
  student?: Student;
  trial_class?: TrialClass;
}

export interface RosterItem {
  id: string;
  student_id: string;
  trial_class_id: string;
  status: string;
  updated_at: string;
  student: {
    id: string;
    name: string;
    age: number;
    parent: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
}

export const ottodotApi = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  // Classes
  getClasses: async () => {
    const res = await api.get('/classes');
    return res.data.data as TrialClass[];
  },

  updateClassCapacity: async (
    id: string,
    payload: { title: string; subject: string; start_time: string; capacity: number }
  ) => {
    const res = await api.put(`/admin/classes/${id}`, payload);
    return res.data;
  },

  // Bookings
  createBooking: async (studentId: string, trialClassId: string) => {
    const res = await api.post('/bookings', {
      student_id: studentId,
      trial_class_id: trialClassId,
    });
    return res.data;
  },

  // Payments
  processPayment: async (
    bookingId: string,
    paymentToken: string,
    simulateOutcome: 'success' | 'fail_payment'
  ) => {
    try {
      const res = await api.post('/payments/process', {
        booking_id: bookingId,
        payment_token: paymentToken,
        simulate_outcome: simulateOutcome,
      });
      return { success: true, data: res.data };
    } catch (err: any) {
      if (err.response) {
        return { success: false, data: err.response.data };
      }
      return { success: false, data: { message: err.message } };
    }
  },

  // Roster & Demo Data
  getClassRoster: async (classId: string) => {
    const res = await api.get(`/admin/classes/${classId}/roster`);
    return res.data.data as {
      class: TrialClass;
      roster: RosterItem[];
      count: number;
      capacity: number;
    };
  },

  getParentsAndStudents: async () => {
    const res = await api.get('/parents');
    return res.data.data as Parent[];
  },
};
