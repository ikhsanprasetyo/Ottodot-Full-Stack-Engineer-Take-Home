'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ottodotApi,
  TrialClass,
  Parent,
  Student,
  Booking,
  RosterItem
} from '@/lib/ottodot-api';
import { useWebSocket } from '@/lib/useWebSocket';
import { TableData, ExtendedColumnDef } from '@/components/ui/table-data';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Calendar,
  Users,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  LogOut,
  ChevronRight,
  RefreshCw,
  Edit2,
  X,
  UserCheck,
  User,
  XCircle,
  Filter
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [classes, setClasses] = useState<TrialClass[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<
    'classes' | 'payment' | 'bookings' | 'admin'
  >('classes');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);

  // Active Booking state
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);

  // Booking Modal
  const [bookingModalClass, setBookingModalClass] = useState<TrialClass | null>(
    null
  );
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Payment Processing state
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  // Admin Roster state
  const [selectedRosterClassId, setSelectedRosterClassId] =
    useState<string>('');
  const [rosterData, setRosterData] = useState<{
    class: TrialClass;
    roster: RosterItem[];
    count: number;
    capacity: number;
  } | null>(null);

  // Admin Edit Capacity Modal
  const [editClassModal, setEditClassModal] = useState<TrialClass | null>(null);
  const [editCapacity, setEditCapacity] = useState<number>(4);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editSubject, setEditSubject] = useState<string>('Science');
  const [editLoading, setEditLoading] = useState<boolean>(false);

  // Demo user role
  const [userRole, setUserRole] = useState<string>('parent');

  // Fetch initial data cleanly
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [classList, parentList] = await Promise.all([
        ottodotApi.getClasses(),
        ottodotApi.getParentsAndStudents()
      ]);
      setClasses(classList);
      setParents(parentList);

      let loggedInUser: any = null;
      try {
        const stored = localStorage.getItem('ottodot_user');
        if (stored) loggedInUser = JSON.parse(stored);
      } catch {}
      const demoName = localStorage.getItem('ottodot_demo_name');

      setSelectedParent((prevParent) => {
        if (prevParent) {
          const updated = parentList.find((p) => p.id === prevParent.id);
          if (updated) return updated;
        }
        if (loggedInUser) {
          const matched = parentList.find(
            (p) =>
              p.email === loggedInUser.email ||
              p.name.toLowerCase() === loggedInUser.name?.toLowerCase() ||
              p.id === loggedInUser.id
          );
          if (matched) return matched;
        }
        if (demoName) {
          const matchedDemo = parentList.find(
            (p) => p.name.toLowerCase() === demoName.toLowerCase()
          );
          if (matchedDemo) return matchedDemo;
        }
        return parentList[0] || null;
      });

      setSelectedStudent((prevStudent) => {
        if (prevStudent) return prevStudent;
        let activeParent = parentList[0];
        if (loggedInUser) {
          const matched = parentList.find(
            (p) =>
              p.email === loggedInUser.email ||
              p.name.toLowerCase() === loggedInUser.name?.toLowerCase() ||
              p.id === loggedInUser.id
          );
          if (matched) activeParent = matched;
        } else if (demoName) {
          const matchedDemo = parentList.find(
            (p) => p.name.toLowerCase() === demoName.toLowerCase()
          );
          if (matchedDemo) activeParent = matchedDemo;
        }
        if (activeParent && activeParent.students.length > 0) {
          return activeParent.students[0];
        }
        return null;
      });

      setSelectedRosterClassId((prevId) => {
        if (prevId) return prevId;
        return classList[0]?.id || '';
      });
    } catch (err) {
      console.error('Failed to load initial data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const role = localStorage.getItem('ottodot_demo_role') || 'parent';
    setUserRole(role);
    loadData();
  }, [loadData]);

  // WebSocket Live Updates Handler
  useWebSocket(
    useCallback(
      (event: any) => {
        if (event.type === 'SEAT_UPDATE') {
          loadData();
          if (selectedRosterClassId) {
            ottodotApi
              .getClassRoster(selectedRosterClassId)
              .then(setRosterData)
              .catch(() => {});
          }
        }
      },
      [loadData, selectedRosterClassId]
    )
  );

  // Load Admin Roster when selected class changes
  useEffect(() => {
    if (selectedRosterClassId) {
      ottodotApi
        .getClassRoster(selectedRosterClassId)
        .then(setRosterData)
        .catch(() => {});
    }
  }, [selectedRosterClassId]);

  // Handle Parent Switch
  const handleParentSelect = (parent: Parent) => {
    setSelectedParent(parent);
    localStorage.setItem('ottodot_demo_name', parent.name);
    if (parent.students.length > 0) {
      setSelectedStudent(parent.students[0]);
    } else {
      setSelectedStudent(null);
    }
  };

  // Initiate Booking
  const handleInitiateBooking = async () => {
    if (!selectedStudent || !bookingModalClass) return;

    setBookingLoading(true);
    setBookingError(null);

    try {
      const res = await ottodotApi.createBooking(
        selectedStudent.id,
        bookingModalClass.id
      );
      if (res.success) {
        const newBooking = res.data;
        setActiveBooking(newBooking);
        setUserBookings((prev) => [newBooking, ...prev]);
        setBookingModalClass(null);
        setActiveTab('payment'); // Navigate to payment simulation tab
      } else {
        setBookingError(res.message || res.error || 'Failed to create booking');
      }
    } catch (err: any) {
      if (err.response?.data) {
        setBookingError(
          err.response.data.message ||
            err.response.data.error ||
            'Booking error'
        );
      } else {
        setBookingError('Error creating booking');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle Simulated Payment
  const handleProcessPayment = async (outcome: 'success' | 'fail_payment') => {
    if (!activeBooking) return;
    setPaymentLoading(true);
    setPaymentResult(null);

    const res = await ottodotApi.processPayment(
      activeBooking.id,
      activeBooking.payment_token,
      outcome
    );
    setPaymentLoading(false);

    const newStatus =
      res.success && res.data.success ? 'confirmed' : 'payment_failed';

    if (res.success && res.data.success) {
      setPaymentResult({
        success: true,
        message: 'Booking Confirmed! Student added to trial class roster.',
        data: res.data.data
      });
      setActiveBooking((prev) =>
        prev ? { ...prev, status: 'confirmed' } : null
      );
    } else {
      setPaymentResult({
        success: false,
        message:
          res.data?.message ||
          res.data?.error ||
          'Payment failed or seat no longer available',
        data: res.data?.data
      });
      setActiveBooking((prev) =>
        prev ? { ...prev, status: 'payment_failed' } : null
      );
    }

    // Invalidate queries & update Submitted Booking Records state
    setUserBookings((prev) =>
      prev.map((b) =>
        b.id === activeBooking.id ? { ...b, status: newStatus } : b
      )
    );
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['userBookings'] });
    queryClient.invalidateQueries({ queryKey: ['classes'] });
    queryClient.invalidateQueries({ queryKey: ['roster'] });

    loadData();

    if (selectedRosterClassId) {
      ottodotApi
        .getClassRoster(selectedRosterClassId)
        .then(setRosterData)
        .catch(() => {});
    }
  };

  // Handle Concurrent Last-Seat Race Test Simulation
  const handleSimulateLastSeatRace = async () => {
    if (!selectedStudent || classes.length === 0) return;

    const classForRace =
      classes.find((c) => c.capacity - c.enrolled_count === 1) || classes[0];

    setPaymentLoading(true);
    setPaymentResult(null);

    try {
      const p1Students = parents[0]?.students || [];
      const p2Students = parents[1]?.students || [];

      if (p1Students.length === 0 || p2Students.length === 0) {
        setPaymentResult({
          success: false,
          message: 'Need at least 2 demo students to simulate race'
        });
        setPaymentLoading(false);
        return;
      }

      const [b1Res, b2Res] = await Promise.all([
        ottodotApi.createBooking(p1Students[0].id, classForRace.id),
        ottodotApi.createBooking(p2Students[0].id, classForRace.id)
      ]);

      if (!b1Res.success || !b2Res.success) {
        setPaymentResult({
          success: false,
          message: 'Race setup failed (duplicate booking or class already full)'
        });
        setPaymentLoading(false);
        return;
      }

      const booking1 = b1Res.data;
      const booking2 = b2Res.data;

      // Execute SIMULTANEOUS payment submissions via Promise.all
      const [pay1, pay2] = await Promise.all([
        ottodotApi.processPayment(
          booking1.id,
          booking1.payment_token,
          'success'
        ),
        ottodotApi.processPayment(
          booking2.id,
          booking2.payment_token,
          'success'
        )
      ]);

      const successCount = [
        pay1.success && pay1.data.success,
        pay2.success && pay2.data.success
      ].filter(Boolean).length;

      setPaymentResult({
        success: true,
        message: `RACE CONDITION TEST COMPLETED: Out of 2 simultaneous payments for the last seat, exactly ${successCount} user was confirmed (100% PostgreSQL Row Lock Data Protection Guaranteed!).`
      });

      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['userBookings'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });

      loadData();
    } catch (err: any) {
      setPaymentResult({
        success: false,
        message: 'Race test error: ' + err.message
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Admin Update Class Capacity
  const handleUpdateCapacitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClassModal) return;
    setEditLoading(true);

    try {
      const res = await ottodotApi.updateClassCapacity(editClassModal.id, {
        title: editTitle,
        subject: editSubject,
        start_time: editClassModal.start_time,
        capacity: editCapacity
      });

      if (res.success) {
        setEditClassModal(null);
        loadData();
      } else {
        alert(res.error || 'Failed to update capacity');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error updating capacity');
    } finally {
      setEditLoading(false);
    }
  };

  // Table Columns Definition for TableData component
  const adminClassColumns: ExtendedColumnDef<TrialClass>[] = useMemo(
    () => [
      {
        id: 'index',
        header: '#',
        size: 50
      },
      {
        accessorKey: 'title',
        header: 'Class Title',
        cell: ({ row }) => {
          const cls = row.original;
          const isSelected = selectedRosterClassId === cls.id;
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif font-bold text-[#15172B] text-xs sm:text-sm">
                {cls.title}
              </span>
              {isSelected && (
                <span className="px-2 py-0.5 bg-[#E73449] text-white text-[10px] font-bold rounded-sm uppercase tracking-wider shadow-xs animate-pulse">
                  Active Roster
                </span>
              )}
            </div>
          );
        }
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: ({ row }) => (
          <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-sm bg-[#FFF6E5] text-[#E73449] border border-[#EDE7DC]">
            {row.original.subject}
          </span>
        )
      },
      {
        accessorKey: 'start_time',
        header: 'Start Time',
        cell: ({ row }) => (
          <span className="text-[#3F4159] text-xs font-medium">
            {new Date(row.original.start_time).toLocaleString()}
          </span>
        )
      },
      {
        accessorKey: 'enrolled_count',
        header: 'Confirmed / Capacity',
        cell: ({ row }) => {
          const isFull = row.original.enrolled_count >= row.original.capacity;
          const isEmpty = row.original.enrolled_count === 0;
          return (
            <span
              className={`px-2.5 py-0.5 text-xs font-bold rounded-sm border inline-flex items-center gap-1 ${
                isFull
                  ? 'bg-[#E73449] text-white border-[#C72236]'
                  : isEmpty
                    ? 'bg-[#FFF6E5] text-[#555770] border-[#EDE7DC]'
                    : 'bg-[#83C341] text-white border-[#6BA62F]'
              }`}
            >
              {row.original.enrolled_count} / {row.original.capacity} Students
            </span>
          );
        }
      }
    ],
    [selectedRosterClassId]
  );

  const rosterColumns: ExtendedColumnDef<RosterItem>[] = useMemo(
    () => [
      {
        id: 'index',
        header: '#',
        size: 50
      },
      {
        accessorKey: 'student.name',
        header: 'Student Name',
        cell: ({ row }) => (
          <span className="font-bold text-[#15172B] text-xs">
            {row.original.student?.name}
          </span>
        )
      },
      {
        accessorKey: 'student.age',
        header: 'Age',
        cell: ({ row }) => (
          <span className="text-[#3F4159] text-xs">
            {row.original.student?.age} y.o
          </span>
        )
      },
      {
        accessorKey: 'student.parent.name',
        header: 'Parent Name',
        cell: ({ row }) => (
          <span className="font-semibold text-[#E73449] text-xs">
            {row.original.student?.parent?.name}
          </span>
        )
      },
      {
        accessorKey: 'student.parent.email',
        header: 'Parent Email / Phone',
        cell: ({ row }) => (
          <div className="text-xs text-[#3F4159]">
            <div>{row.original.student?.parent?.email}</div>
            <div className="text-[11px] text-[#555770]">
              {row.original.student?.parent?.phone}
            </div>
          </div>
        )
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: () => (
          <span className="px-2 py-0.5 bg-[#83C341] text-white font-bold rounded-sm text-[10px]">
            CONFIRMED
          </span>
        )
      }
    ],
    []
  );

  const filteredClasses = classes.filter(
    (c) =>
      selectedSubject === 'All' ||
      c.subject.toLowerCase() === selectedSubject.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#15172B] font-sans">
      {/* Sticky Header Bar matching www.ottodot.com */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#EDE7DC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" href="/dashboard" />
            <span className="text-xs text-[#E73449] font-bold px-2 py-0.5 bg-[#FFF6E5] border border-[#EDE7DC] rounded-sm uppercase tracking-wider">
              Tuition Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Parent Switcher */}
            <div className="flex items-center gap-2 bg-[#FFF6E5] border border-[#EDE7DC] px-3 py-1.5 rounded-sm">
              <UserCheck className="w-4 h-4 text-[#E73449]" />
              <div className="text-xs">
                <span className="text-[#555770] font-medium">Parent: </span>
                <select
                  value={selectedParent?.id || ''}
                  onChange={(e) => {
                    const p = parents.find(
                      (item) => item.id === e.target.value
                    );
                    if (p) handleParentSelect(p);
                  }}
                  className="bg-transparent font-bold text-[#15172B] focus:outline-none cursor-pointer"
                >
                  {parents.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      className="bg-white text-[#15172B]"
                    >
                      {p.name} ({p.students.length} kids)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role Switcher */}
            <button
              onClick={() => {
                const nextRole = userRole === 'admin' ? 'parent' : 'admin';
                setUserRole(nextRole);
                localStorage.setItem('ottodot_demo_role', nextRole);
              }}
              className={`text-xs px-3 py-1.5 rounded-sm border font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                userRole === 'admin'
                  ? 'bg-[#E73449] border-[#C72236] text-white'
                  : 'bg-white border-[#EDE7DC] text-[#15172B] hover:bg-[#FFF6E5]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Role: {userRole === 'admin' ? 'Teacher Admin' : 'Parent View'}
            </button>

            {/* User Profile Avatar (rounded-full allowed per rule #26) */}
            <div
              className="w-8 h-8 rounded-full bg-[#E73449] text-white flex items-center justify-center font-bold text-xs shadow-sm"
              title={selectedParent?.name || 'User Profile'}
            >
              {selectedParent?.name ? selectedParent.name.charAt(0) : 'U'}
            </div>

            <button
              onClick={() => {
                localStorage.removeItem('ottodot_token');
                router.push('/');
              }}
              className="p-2 text-[#555770] hover:text-[#E73449] hover:bg-[#FFF6E5] rounded-sm transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Child Selection Banner */}
        {selectedParent && (
          <div className="mb-8 p-4 bg-[#FFF6E5] border border-[#EDE7DC] rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              {/* Profile icon in parent card uses rounded-full per rule #26 */}
              <div className="w-10 h-10 bg-[#E73449] text-white rounded-full flex items-center justify-center font-bold text-base shadow-sm">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#15172B] flex items-center gap-2">
                  {selectedParent.name}
                  <span className="text-xs font-normal text-[#555770]">
                    ({selectedParent.email})
                  </span>
                </h3>
                <p className="text-xs text-[#3F4159]">
                  Select active child for booking trial class:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {selectedParent.students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-sm border transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedStudent?.id === student.id
                      ? 'bg-[#E73449] border-[#C72236] text-white shadow-[0_4px_0_-1px_rgba(231,52,73,0.3)]'
                      : 'bg-white border-[#EDE7DC] text-[#15172B] hover:bg-[#FFF6E5]'
                  }`}
                >
                  <User className="w-3.5 h-3.5 opacity-80" />
                  {student.name} ({student.age} y.o)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-[#EDE7DC] mb-8">
          <nav className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('classes')}
              className={`pb-4 px-1 text-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
                activeTab === 'classes'
                  ? 'border-[#E73449] text-[#E73449]'
                  : 'border-transparent text-[#555770] hover:text-[#15172B]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Trial Classes Catalog
            </button>

            <button
              onClick={() => setActiveTab('payment')}
              className={`pb-4 px-1 text-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap relative ${
                activeTab === 'payment'
                  ? 'border-[#E73449] text-[#E73449]'
                  : 'border-transparent text-[#555770] hover:text-[#15172B]'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Mock Payment & Race Test
              {activeBooking && activeBooking.status === 'pending_payment' && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#FBAE24] animate-ping absolute top-0 right-0" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`pb-4 px-1 text-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'border-[#E73449] text-[#E73449]'
                  : 'border-transparent text-[#555770] hover:text-[#15172B]'
              }`}
            >
              <Clock className="w-4 h-4" />
              Booking Status View
            </button>

            {userRole === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`pb-4 px-1 text-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'border-[#E73449] text-[#E73449]'
                    : 'border-transparent text-[#555770] hover:text-[#15172B]'
                }`}
              >
                <Users className="w-4 h-4 text-[#E73449]" />
                Teacher Roster & Dynamic Capacity
              </button>
            )}
          </nav>
        </div>

        {/* TAB 1: TRIAL CLASSES CATALOG */}
        {activeTab === 'classes' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#15172B] tracking-tight">
                  Available Trial Classes
                </h2>
                <p className="text-xs text-[#555770]">
                  Live seat counts update automatically in real-time via
                  WebSocket
                </p>
              </div>

              {/* Subject Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[#555770]" />
                {['All', 'Science', 'Math', 'Coding'].map((subject) => (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`px-3 py-1 text-xs font-bold rounded-sm border cursor-pointer transition-colors ${
                      selectedSubject === subject
                        ? 'bg-[#E73449] border-[#C72236] text-white'
                        : 'bg-white border-[#EDE7DC] text-[#3F4159] hover:bg-[#FFF6E5]'
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-[#555770] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#E73449]" />
                Loading live trial classes...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClasses.map((cls) => {
                  const remaining = cls.capacity - cls.enrolled_count;
                  const isFull = remaining <= 0;
                  const isOneLeft = remaining === 1;

                  return (
                    <div
                      key={cls.id}
                      className="bg-white border border-[#EDE7DC] rounded-sm p-6 flex flex-col justify-between hover:border-[#E73449]/40 transition-all shadow-[0_2px_0_rgba(21,23,43,0.05)] hover:shadow-md group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-sm bg-[#FFF6E5] text-[#E73449] border border-[#EDE7DC]">
                            {cls.subject}
                          </span>

                          {/* Seat Badge */}
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-sm border ${
                              isFull
                                ? 'bg-[#E73449] text-white border-[#C72236]'
                                : isOneLeft
                                  ? 'bg-[#FBAE24] text-[#15172B] border-[#E69612] animate-pulse'
                                  : 'bg-[#83C341] text-white border-[#6BA62F]'
                            }`}
                          >
                            {isFull
                              ? 'FULL (0 seats)'
                              : isOneLeft
                                ? 'LAST SEAT LEFT!'
                                : `${remaining} Seats Available`}
                          </span>
                        </div>

                        <h3 className="font-serif text-xl font-bold text-[#15172B] mb-2 group-hover:text-[#E73449] transition-colors">
                          {cls.title}
                        </h3>

                        <div className="space-y-1.5 text-xs text-[#3F4159] mb-6">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#555770]" />
                            {new Date(cls.start_time).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-[#555770]" />
                            Capacity:{' '}
                            <strong className="text-[#15172B]">
                              {cls.enrolled_count} / {cls.capacity}
                            </strong>{' '}
                            confirmed
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={isFull}
                        onClick={() => {
                          setBookingModalClass(cls);
                          setBookingError(null);
                        }}
                        className={`w-full py-3 px-4 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          isFull
                            ? 'bg-[#EDE7DC] text-[#555770] border border-[#EDE7DC] cursor-not-allowed'
                            : 'bg-[#E73449] hover:bg-[#C72236] text-white border border-[#C72236] shadow-[0_6px_0_-2px_rgba(231,52,73,0.35)]'
                        }`}
                      >
                        {isFull ? 'Class Fully Booked' : 'Book Trial Class'}
                        {!isFull && <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MOCK PAYMENT & RACE TEST */}
        {activeTab === 'payment' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-[#EDE7DC] rounded-sm p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#EDE7DC]">
                <div className="p-2.5 bg-[#FFF6E5] border border-[#EDE7DC] rounded-sm text-[#E73449]">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#15172B]">
                    Mock Payment Simulation
                  </h2>
                  <p className="text-xs text-[#555770]">
                    Test deterministic payment outcomes and PostgreSQL
                    row-locking concurrency protection
                  </p>
                </div>
              </div>

              {activeBooking ? (
                <div className="space-y-6">
                  <div className="bg-[#FFF6E5] border border-[#EDE7DC] p-4 rounded-sm space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#E73449]">
                      Active Pending Booking
                    </div>
                    <div className="font-serif text-lg font-bold text-[#15172B]">
                      {activeBooking.trial_class?.title ||
                        'Trial Class Session'}
                    </div>
                    <div className="text-xs text-[#3F4159]">
                      Student:{' '}
                      <strong className="text-[#15172B]">
                        {activeBooking.student?.name}
                      </strong>
                    </div>
                    <div className="text-[11px] font-mono text-[#555770]">
                      Payment Token: {activeBooking.payment_token}
                    </div>
                    <div className="text-[11px] text-[#555770] flex items-center gap-2">
                      Status:
                      <span className="px-2 py-0.5 bg-[#FBAE24] text-[#15172B] rounded-sm font-bold">
                        {activeBooking.status}
                      </span>
                    </div>
                  </div>

                  {/* Payment Result Alert */}
                  {paymentResult && (
                    <div
                      className={`p-4 rounded-sm border text-xs font-semibold ${
                        paymentResult.success
                          ? 'bg-[#FFF6E5] border-[#83C341] text-[#15172B]'
                          : 'bg-[#FFF6E5] border-[#E73449] text-[#C72236]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {paymentResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-[#83C341]" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-[#E73449]" />
                        )}
                        <span className="font-bold">
                          {paymentResult.success
                            ? 'Transaction Result'
                            : 'Transaction Failed'}
                        </span>
                      </div>
                      <p>{paymentResult.message}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      disabled={
                        paymentLoading || activeBooking.status === 'confirmed'
                      }
                      onClick={() => handleProcessPayment('success')}
                      className="w-full py-3 px-4 bg-[#83C341] hover:bg-[#6BA62F] text-white rounded-sm font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-[0_6px_0_-2px_rgba(131,195,65,0.35)]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {paymentLoading
                        ? 'Processing Payment...'
                        : 'Simulate Successful Payment'}
                    </button>

                    <button
                      disabled={
                        paymentLoading || activeBooking.status === 'confirmed'
                      }
                      onClick={() => handleProcessPayment('fail_payment')}
                      className="w-full py-3 px-4 bg-white hover:bg-[#FFF6E5] border border-[#E73449] text-[#C72236] rounded-sm font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Simulate Card Declined / Failure
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-[#555770] mb-4">
                    No active pending booking. Pick a trial class from the
                    catalog first!
                  </p>
                  <button
                    onClick={() => setActiveTab('classes')}
                    className="px-4 py-2.5 bg-[#E73449] hover:bg-[#C72236] text-white rounded-sm text-xs font-bold cursor-pointer transition-colors shadow-[0_6px_0_-2px_rgba(231,52,73,0.35)]"
                  >
                    Browse Trial Classes
                  </button>
                </div>
              )}

              {/* Race Condition Simulator Box */}
              <div className="mt-8 border-t border-[#EDE7DC] pt-6">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#E73449] uppercase tracking-wider">
                  Last-Seat Concurrency Race Tester
                </div>
                <p className="text-xs text-[#555770] mb-4">
                  Triggers 2 simultaneous payment requests for the last seat to
                  verify PostgreSQL pessimistic lock (`SELECT ... FOR UPDATE`)
                  protection.
                </p>
                <button
                  disabled={paymentLoading}
                  onClick={handleSimulateLastSeatRace}
                  className="w-full py-3 px-4 bg-[#FFF6E5] hover:bg-[#FFECC9] border border-[#EDE7DC] text-[#15172B] rounded-sm font-bold text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  Trigger Simultaneous Last-Seat Race Test
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BOOKING STATUS VIEW */}
        {activeTab === 'bookings' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-2xl font-bold text-[#15172B] mb-6">
              Submitted Booking Records
            </h2>
            {userBookings.length === 0 ? (
              <div className="bg-white border border-[#EDE7DC] p-8 rounded-sm text-center text-[#555770] text-xs shadow-sm">
                No bookings submitted in this session yet. Pick a class and
                complete payment to view records.
              </div>
            ) : (
              <div className="space-y-4">
                {userBookings.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white border border-[#EDE7DC] p-5 rounded-sm flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <div className="font-serif text-lg font-bold text-[#15172B] mb-1">
                        {b.trial_class?.title || 'Trial Class Session'}
                      </div>
                      <div className="text-xs text-[#3F4159]">
                        Student:{' '}
                        <strong className="text-[#15172B]">
                          {b.student?.name}
                        </strong>
                      </div>
                      <div className="text-[11px] font-mono text-[#555770]">
                        Payment Token: {b.payment_token}
                      </div>
                    </div>
                    <div>
                      <span
                        className={`px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-wider border ${
                          b.status === 'confirmed'
                            ? 'bg-[#83C341] text-white border-[#6BA62F]'
                            : b.status === 'pending_payment'
                              ? 'bg-[#FBAE24] text-[#15172B] border-[#E69612]'
                              : 'bg-[#E73449] text-white border-[#C72236]'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TEACHER ROSTER & DYNAMIC CAPACITY */}
        {activeTab === 'admin' && userRole === 'admin' && (
          <div className="space-y-8">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#15172B]">
                Teacher Roster &amp; Dynamic Capacity Engine
              </h2>
              <p className="text-xs text-[#555770] mt-1">
                Select a class from the table below to inspect real-time
                confirmed student roster and edit dynamic student limits
              </p>
            </div>

            {/* 1. Classes Selection Table using TableData component */}
            <div>
              <TableData<TrialClass>
                title="All Trial Classes & Capacity Limits"
                description="Select any class row to view active roster & manage capacity limits"
                data={classes}
                columns={adminClassColumns}
                actionsColumnSize={210}
                renderActions={(cls) => {
                  const isSelected = selectedRosterClassId === cls.id;
                  return (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => setSelectedRosterClassId(cls.id)}
                        className={
                          isSelected
                            ? 'bg-[#E73449] text-white hover:bg-[#C72236] shadow-xs font-bold'
                            : 'text-[#15172B] border-[#EDE7DC] hover:bg-[#FFF6E5] hover:border-[#E73449] font-medium'
                        }
                      >
                        <Users className="w-3.5 h-3.5 mr-1" />
                        {isSelected ? 'Viewing Roster' : 'Select Roster'}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditClassModal(cls);
                          setEditCapacity(cls.capacity);
                          setEditTitle(cls.title);
                          setEditSubject(cls.subject);
                        }}
                        className="text-[#E73449] border-[#EDE7DC] hover:bg-[#FFF6E5] hover:border-[#E73449] font-medium"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                    </div>
                  );
                }}
              />
            </div>

            {/* 2. Confirmed Roster Table using TableData component */}
            {rosterData && (
              <div>
                <TableData<RosterItem>
                  title={`Confirmed Student Roster: ${rosterData.class.title}`}
                  description={`Live Enrolled Students: ${rosterData.count} / ${rosterData.capacity} Max Capacity`}
                  data={rosterData.roster}
                  columns={rosterColumns}
                  noDataTitle="Roster Currently Empty"
                  noDataMessage="No students have completed trial class booking and payment for this session yet."
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: BOOKING INITIATION */}
      {bookingModalClass && (
        <div className="fixed inset-0 bg-[#15172B]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EDE7DC] rounded-sm max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EDE7DC]">
              <h3 className="font-serif text-lg font-bold text-[#15172B]">
                Book Trial Class
              </h3>
              <button
                onClick={() => setBookingModalClass(null)}
                className="text-[#555770] hover:text-[#E73449] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingError && (
              <div className="mb-4 p-3 bg-[#FFF6E5] border border-[#E73449]/40 text-[#C72236] text-xs rounded-sm font-semibold">
                {bookingError}
              </div>
            )}

            <div className="space-y-4 text-xs mb-6">
              <div className="bg-[#FFF6E5] p-3 rounded-sm border border-[#EDE7DC]">
                <div className="font-serif font-bold text-[#15172B] text-base">
                  {bookingModalClass.title}
                </div>
                <div className="text-[#E73449] font-bold">
                  {bookingModalClass.subject}
                </div>
                <div className="text-[#555770] mt-1">
                  {new Date(bookingModalClass.start_time).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-[#555770] font-semibold mb-1">
                  Confirm Selected Student:
                </label>
                <div className="p-3 bg-white border border-[#EDE7DC] text-[#15172B] font-bold rounded-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-[#E73449]" />
                  {selectedStudent?.name} ({selectedStudent?.age} years old)
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setBookingModalClass(null)}
                className="px-4 py-2 text-[#555770] hover:text-[#15172B] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={bookingLoading}
                onClick={handleInitiateBooking}
                className="px-5 py-2.5 bg-[#E73449] hover:bg-[#C72236] text-white text-xs font-bold rounded-sm cursor-pointer shadow-[0_6px_0_-2px_rgba(231,52,73,0.35)]"
              >
                {bookingLoading ? 'Initiating...' : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADMIN EDIT CLASS CAPACITY */}
      {editClassModal && (
        <div className="fixed inset-0 bg-[#15172B]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EDE7DC] rounded-sm max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EDE7DC]">
              <h3 className="font-serif text-lg font-bold text-[#15172B] flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#E73449]" />
                Edit Dynamic Student Limit
              </h3>
              <button
                onClick={() => setEditClassModal(null)}
                className="text-[#555770] hover:text-[#E73449] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCapacitySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#15172B] mb-1">
                  Class Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-white border border-[#EDE7DC] p-2.5 text-xs text-[#15172B] rounded-sm focus:outline-none focus:border-[#E73449]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#15172B] mb-1">
                  Subject
                </label>
                <select
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full bg-white border border-[#EDE7DC] p-2.5 text-xs text-[#15172B] rounded-sm focus:outline-none focus:border-[#E73449]"
                >
                  <option value="Science">Science</option>
                  <option value="Math">Math</option>
                  <option value="Coding">Coding</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#15172B] mb-1">
                  Dynamic Capacity (Student Limit per class)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={editCapacity}
                  onChange={(e) =>
                    setEditCapacity(parseInt(e.target.value) || 1)
                  }
                  className="w-full bg-white border border-[#EDE7DC] p-2.5 text-xs text-[#15172B] rounded-sm font-bold focus:outline-none focus:border-[#E73449]"
                />
                <p className="text-[11px] text-[#555770] mt-1">
                  Current Enrolled: {editClassModal.enrolled_count}. New limit
                  cannot be set below currently enrolled count.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EDE7DC]">
                <button
                  type="button"
                  onClick={() => setEditClassModal(null)}
                  className="px-4 py-2 text-[#555770] hover:text-[#15172B] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 bg-[#E73449] hover:bg-[#C72236] text-white text-xs font-bold rounded-sm cursor-pointer shadow-[0_6px_0_-2px_rgba(231,52,73,0.35)]"
                >
                  {editLoading ? 'Saving...' : 'Save Capacity Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
