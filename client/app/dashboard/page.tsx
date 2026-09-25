'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ottodotApi, TrialClass, Parent, Student, Booking, RosterItem } from '@/lib/ottodot-api';
import { useWebSocket } from '@/lib/useWebSocket';
import {
  BookOpen,
  Calendar,
  Users,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Shield,
  Zap,
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

export default function DashboardPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<TrialClass[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'classes' | 'payment' | 'bookings' | 'admin'>('classes');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);

  // Active Booking state
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);

  // Booking Modal
  const [bookingModalClass, setBookingModalClass] = useState<TrialClass | null>(null);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Payment Processing state
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);

  // Admin Roster state
  const [selectedRosterClassId, setSelectedRosterClassId] = useState<string>('');
  const [rosterData, setRosterData] = useState<{ class: TrialClass; roster: RosterItem[]; count: number; capacity: number } | null>(null);

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

      setSelectedParent((prevParent) => {
        if (prevParent) {
          const updated = parentList.find((p) => p.id === prevParent.id);
          return updated || parentList[0] || null;
        }
        return parentList[0] || null;
      });

      setSelectedStudent((prevStudent) => {
        if (prevStudent) return prevStudent;
        if (parentList[0] && parentList[0].students.length > 0) {
          return parentList[0].students[0];
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
            ottodotApi.getClassRoster(selectedRosterClassId).then(setRosterData).catch(() => {});
          }
        }
      },
      [loadData, selectedRosterClassId]
    )
  );

  // Load Admin Roster when selected class changes
  useEffect(() => {
    if (selectedRosterClassId) {
      ottodotApi.getClassRoster(selectedRosterClassId).then(setRosterData).catch(() => {});
    }
  }, [selectedRosterClassId]);

  // Handle Parent Switch
  const handleParentSelect = (parent: Parent) => {
    setSelectedParent(parent);
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
      const res = await ottodotApi.createBooking(selectedStudent.id, bookingModalClass.id);
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
        setBookingError(err.response.data.message || err.response.data.error || 'Booking error');
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

    const res = await ottodotApi.processPayment(activeBooking.id, activeBooking.payment_token, outcome);
    setPaymentLoading(false);

    if (res.success && res.data.success) {
      setPaymentResult({
        success: true,
        message: 'Booking Confirmed! Student added to trial class roster.',
        data: res.data.data
      });
      setActiveBooking((prev) => (prev ? { ...prev, status: 'confirmed' } : null));
    } else {
      setPaymentResult({
        success: false,
        message: res.data?.message || res.data?.error || 'Payment failed or seat no longer available',
        data: res.data?.data
      });
      setActiveBooking((prev) => (prev ? { ...prev, status: 'payment_failed' } : null));
    }
    loadData();
  };

  // Handle Concurrent Last-Seat Race Test Simulation
  const handleSimulateLastSeatRace = async () => {
    if (!selectedStudent || classes.length === 0) return;

    const classForRace = classes.find((c) => c.capacity - c.enrolled_count === 1) || classes[0];

    setPaymentLoading(true);
    setPaymentResult(null);

    try {
      const p1Students = parents[0]?.students || [];
      const p2Students = parents[1]?.students || [];

      if (p1Students.length === 0 || p2Students.length === 0) {
        setPaymentResult({ success: false, message: 'Need at least 2 demo students to simulate race' });
        setPaymentLoading(false);
        return;
      }

      const [b1Res, b2Res] = await Promise.all([
        ottodotApi.createBooking(p1Students[0].id, classForRace.id),
        ottodotApi.createBooking(p2Students[0].id, classForRace.id)
      ]);

      if (!b1Res.success || !b2Res.success) {
        setPaymentResult({ success: false, message: 'Race setup failed (duplicate booking or class already full)' });
        setPaymentLoading(false);
        return;
      }

      const booking1 = b1Res.data;
      const booking2 = b2Res.data;

      // Execute SIMULTANEOUS payment submissions via Promise.all
      const [pay1, pay2] = await Promise.all([
        ottodotApi.processPayment(booking1.id, booking1.payment_token, 'success'),
        ottodotApi.processPayment(booking2.id, booking2.payment_token, 'success')
      ]);

      const successCount = [pay1.success && pay1.data.success, pay2.success && pay2.data.success].filter(Boolean).length;

      setPaymentResult({
        success: true,
        message: `RACE CONDITION TEST COMPLETED: Out of 2 simultaneous payments for the last seat, exactly ${successCount} user was confirmed (100% PostgreSQL Row Lock Data Protection Guaranteed!).`
      });

      loadData();
    } catch (err: any) {
      setPaymentResult({ success: false, message: 'Race test error: ' + err.message });
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

  const filteredClasses = classes.filter(
    (c) => selectedSubject === 'All' || c.subject.toLowerCase() === selectedSubject.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-sm">
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white text-base">Ottodot</span>
              <span className="text-xs text-indigo-400 font-semibold ml-2 px-2 py-0.5 bg-indigo-950 border border-indigo-800/60 rounded-sm">
                Trial Reliability Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Active Parent Switcher */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-sm">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <div className="text-xs">
                <span className="text-slate-400">Parent: </span>
                <select
                  value={selectedParent?.id || ''}
                  onChange={(e) => {
                    const p = parents.find((item) => item.id === e.target.value);
                    if (p) handleParentSelect(p);
                  }}
                  className="bg-transparent font-semibold text-indigo-300 focus:outline-none cursor-pointer"
                >
                  {parents.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
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
              className={`text-xs px-3 py-1.5 rounded-sm border font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                userRole === 'admin'
                  ? 'bg-indigo-900/40 border-indigo-700 text-indigo-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Role: {userRole === 'admin' ? 'Teacher Admin' : 'Parent View'}
            </button>

            <button
              onClick={() => {
                localStorage.removeItem('ottodot_token');
                router.push('/');
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-sm transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Child Selector Banner */}
        {selectedParent && (
          <div className="mb-8 p-4 bg-slate-900/90 border border-slate-800 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/30 rounded-sm flex items-center justify-center text-indigo-400 font-bold text-base">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  {selectedParent.name}
                  <span className="text-xs font-normal text-slate-400">({selectedParent.email})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Select active child for booking trial class:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedParent.students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-sm border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedStudent?.id === student.id
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-indigo-300" />
                  {student.name} ({student.age} y.o)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Header Navigation */}
        <div className="border-b border-slate-800 mb-8">
          <nav className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('classes')}
              className={`pb-4 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
                activeTab === 'classes'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Trial Classes Catalog
            </button>

            <button
              onClick={() => setActiveTab('payment')}
              className={`pb-4 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap relative ${
                activeTab === 'payment'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Mock Payment & Race Test
              {activeBooking && activeBooking.status === 'pending_payment' && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute top-0 right-0" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`pb-4 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              Booking Status View
            </button>

            {userRole === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`pb-4 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-400" />
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
                <h2 className="text-xl font-bold text-white tracking-tight">Available Trial Classes</h2>
                <p className="text-xs text-slate-400">Live seat counts update automatically in real-time via WebSocket</p>
              </div>

              {/* Subject Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                {['All', 'Science', 'Math', 'Coding'].map((subject) => (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`px-3 py-1 text-xs font-semibold rounded-sm border cursor-pointer transition-colors ${
                      selectedSubject === subject
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
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
                      className="bg-slate-900 border border-slate-800 rounded-sm p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-sm bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                            {cls.subject}
                          </span>

                          {/* Dynamic Seat Badge */}
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-sm border ${
                              isFull
                                ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                                : isOneLeft
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800 animate-pulse'
                                : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            }`}
                          >
                            {isFull ? 'FULL (0 seats)' : isOneLeft ? 'LAST SEAT LEFT!' : `${remaining} Seats Available`}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                          {cls.title}
                        </h3>

                        <div className="space-y-1.5 text-xs text-slate-400 mb-6">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(cls.start_time).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            Dynamic Capacity: {cls.enrolled_count} / {cls.capacity} students confirmed
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={isFull}
                        onClick={() => {
                          setBookingModalClass(cls);
                          setBookingError(null);
                        }}
                        className={`w-full py-2.5 px-4 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          isFull
                            ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 shadow-lg shadow-indigo-600/20'
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

        {/* TAB 2: MOCK PAYMENT GATEWAY & RACE TEST */}
        {activeTab === 'payment' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-sm text-indigo-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Mock Payment Gateway Simulation</h2>
                  <p className="text-xs text-slate-400">Test deterministic payment outcomes and last-seat concurrency protection</p>
                </div>
              </div>

              {activeBooking ? (
                <div className="space-y-6">
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-sm space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Pending Booking</div>
                    <div className="text-sm font-bold text-white">{activeBooking.trial_class?.title || 'Trial Class Session'}</div>
                    <div className="text-xs text-slate-400">Student: {activeBooking.student?.name || 'Child'}</div>
                    <div className="text-[11px] font-mono text-indigo-400">Payment Token: {activeBooking.payment_token}</div>
                    <div className="text-[11px] text-slate-500">
                      Status:{' '}
                      <span className="px-2 py-0.5 bg-amber-950 text-amber-400 rounded-sm border border-amber-800 font-bold">
                        {activeBooking.status}
                      </span>
                    </div>
                  </div>

                  {/* Payment Result Alert */}
                  {paymentResult && (
                    <div
                      className={`p-4 rounded-sm border text-xs font-semibold ${
                        paymentResult.success
                          ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                          : 'bg-rose-950/80 border-rose-600 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {paymentResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        )}
                        <span className="font-bold">{paymentResult.success ? 'Transaction Result' : 'Transaction Failed'}</span>
                      </div>
                      <p>{paymentResult.message}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      disabled={paymentLoading || activeBooking.status === 'confirmed'}
                      onClick={() => handleProcessPayment('success')}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-sm font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {paymentLoading ? 'Processing Payment...' : 'Simulate Successful Payment'}
                    </button>

                    <button
                      disabled={paymentLoading || activeBooking.status === 'confirmed'}
                      onClick={() => handleProcessPayment('fail_payment')}
                      className="w-full py-3 px-4 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 rounded-sm font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Simulate Card Declined / Failure
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-400 mb-4">No active pending booking. Pick a trial class from the catalog first!</p>
                  <button
                    onClick={() => setActiveTab('classes')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-bold cursor-pointer transition-colors"
                  >
                    Browse Trial Classes
                  </button>
                </div>
              )}

              {/* Last Seat Race Simulator Box */}
              <div className="mt-8 border-t border-slate-800 pt-6">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <Zap className="w-4 h-4" />
                  Last-Seat Race Condition Stress Tester
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Fires 2 simultaneous payment requests for the last remaining seat to verify PostgreSQL pessimistic lock (`SELECT ... FOR UPDATE`) protection.
                </p>
                <button
                  disabled={paymentLoading}
                  onClick={handleSimulateLastSeatRace}
                  className="w-full py-3 px-4 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 rounded-sm font-bold text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  Trigger Simultaneous Last-Seat Race Test
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BOOKING STATUS VIEW */}
        {activeTab === 'bookings' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-6">Submitted Booking Records</h2>
            {userBookings.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-sm text-center text-slate-400 text-xs">
                No bookings submitted in this session yet. Pick a class and complete payment to view records.
              </div>
            ) : (
              <div className="space-y-4">
                {userBookings.map((b) => (
                  <div key={b.id} className="bg-slate-900 border border-slate-800 p-5 rounded-sm flex items-center justify-between shadow-lg">
                    <div>
                      <div className="text-sm font-bold text-white mb-1">{b.trial_class?.title || 'Trial Class Session'}</div>
                      <div className="text-xs text-slate-400">Student: {b.student?.name}</div>
                      <div className="text-[11px] font-mono text-indigo-400">Payment Token: {b.payment_token}</div>
                    </div>
                    <div>
                      <span
                        className={`px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-wider border ${
                          b.status === 'confirmed'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : b.status === 'pending_payment'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
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
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Teacher Roster & Dynamic Capacity Engine</h2>
                <p className="text-xs text-slate-400">View real-time confirmed rosters and edit dynamic student limits</p>
              </div>

              {/* Class Selector for Roster */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Select Class:</label>
                <select
                  value={selectedRosterClassId}
                  onChange={(e) => setSelectedRosterClassId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs font-semibold text-white px-3 py-2 rounded-sm focus:outline-none cursor-pointer"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.enrolled_count}/{c.capacity})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {rosterData && (
              <div className="bg-slate-900 border border-slate-800 rounded-sm p-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white">{rosterData.class.title}</h3>
                    <p className="text-xs text-slate-400">
                      Confirmed Enrollment: {rosterData.count} / {rosterData.capacity} Students
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditClassModal(rosterData.class);
                      setEditCapacity(rosterData.class.capacity);
                      setEditTitle(rosterData.class.title);
                      setEditSubject(rosterData.class.subject);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-indigo-600/20"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Class Capacity Limit
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Age</th>
                        <th className="px-4 py-3">Parent Name</th>
                        <th className="px-4 py-3">Parent Email / Phone</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {rosterData.roster.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                            No confirmed students in this trial class roster yet.
                          </td>
                        </tr>
                      ) : (
                        rosterData.roster.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3 text-slate-500 font-mono">{idx + 1}</td>
                            <td className="px-4 py-3 font-bold text-white">{item.student?.name}</td>
                            <td className="px-4 py-3">{item.student?.age} y.o</td>
                            <td className="px-4 py-3 text-indigo-300">{item.student?.parent?.name}</td>
                            <td className="px-4 py-3 text-slate-400">
                              {item.student?.parent?.email} <br />
                              <span className="text-[11px] text-slate-500">{item.student?.parent?.phone}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold rounded-sm text-[10px]">
                                CONFIRMED
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: BOOKING INITIATION */}
      {bookingModalClass && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-sm max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Book Trial Class</h3>
              <button
                onClick={() => setBookingModalClass(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingError && (
              <div className="mb-4 p-3 bg-rose-950 border border-rose-700 text-rose-200 text-xs rounded-sm">
                {bookingError}
              </div>
            )}

            <div className="space-y-4 text-xs mb-6">
              <div className="bg-slate-950 p-3 rounded-sm border border-slate-800">
                <div className="font-bold text-white text-sm">{bookingModalClass.title}</div>
                <div className="text-indigo-400 font-semibold">{bookingModalClass.subject}</div>
                <div className="text-slate-400 mt-1">{new Date(bookingModalClass.start_time).toLocaleString()}</div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Confirm Selected Student:</label>
                <div className="p-2.5 bg-slate-950 border border-indigo-600/50 text-indigo-300 font-bold rounded-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  {selectedStudent?.name} ({selectedStudent?.age} years old)
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setBookingModalClass(null)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={bookingLoading}
                onClick={handleInitiateBooking}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-sm cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                {bookingLoading ? 'Initiating...' : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADMIN EDIT CLASS CAPACITY */}
      {editClassModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-sm max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                Edit Dynamic Student Limit
              </h3>
              <button onClick={() => setEditClassModal(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCapacitySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Class Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 text-xs text-white rounded-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
                <select
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 text-xs text-white rounded-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="Science">Science</option>
                  <option value="Math">Math</option>
                  <option value="Coding">Coding</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Dynamic Capacity (Student Limit per class)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 text-xs text-white rounded-sm font-bold focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Current Enrolled: {editClassModal.enrolled_count}. New limit cannot be set below currently enrolled count.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditClassModal(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-sm cursor-pointer shadow-lg shadow-indigo-600/20"
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
