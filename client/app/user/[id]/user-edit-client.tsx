'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { toast } from 'sonner';
import { useGetUser } from '@/lib/hooks/queries/user';
import { useEditUser } from '@/lib/hooks/mutation/user';
import { useGetOutlets } from '@/lib/hooks/queries/outlet';
import { useGetPositions } from '@/lib/hooks/queries/position';
import { setDateStr } from '@/lib/date';
import { OnlineStatus } from '@/components/ui/online-status';
import { AccessTable } from './access-table';
import { Button } from '@/components/ui/button';
import { OutletAccessSection } from './outlet-access';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Activity,
  Globe,
  MapPin,
  History,
  Monitor,
  Crosshair
} from 'lucide-react';
import { getLocationString } from '@/lib/utils';

dayjs.extend(relativeTime);

export default function UserEditClient() {
  const params = useParams();
  const rawParamId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = useMemo(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart !== 'user') {
        return lastPart;
      }
    }
    return (rawParamId as string) || '';
  }, [rawParamId]);
  const router = useRouter();

  const {
    data,
    isLoading: isLoadingUser,
    error,
    refetch: refetchUser
  } = useGetUser(id);
  const user = data?.data;

  const [form, setForm] = useState<{
    name: string;
    email: string;
    username: string;
    role: string;
    phone: string;
    outlet: string;
    position: string;
    outletAccessMode: string;
    outletAccess: string[];
  }>({
    name: '',
    email: '',
    username: '',
    role: '',
    phone: '',
    outlet: '',
    position: '',
    outletAccessMode: 'single',
    outletAccess: []
  });

  const { data: outletsData } = useGetOutlets(0, 100);
  const outlets = outletsData?.data || [];

  const { data: positionData } = useGetPositions(0, 100);
  const positions = positionData?.data || [];

  const {
    mutate: editUser,
    isPending: isPendingEditUser,
    isSuccess: isSuccessEditUser
  } = useEditUser();

  useEffect(() => {
    if (!user) return;

    setForm((prev) => ({
      ...prev,

      name: user.name ?? '',
      email: user.email ?? '',
      username: user.username ?? '',
      role: user.role ?? '',
      phone: user.phone ?? '',
      outlet: user.outlet ?? user.outletDoc?._id ?? '',
      position: user.position ?? user.positionDoc?._id ?? '',
      outletAccessMode: user.outletAccessMode ?? 'single',
      outletAccess: (
        user.outletAccess ??
        (user.outletDoc?._id || user.outlet
          ? [user.outletDoc?._id || user.outlet]
          : [])
      )?.filter(Boolean) as string[]
    }));
    if (isSuccessEditUser && !isLoadingUser) refetchUser();
  }, [user, isSuccessEditUser, isLoadingUser, refetchUser]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...form,
      email: form.email.trim().toLowerCase(),
      username: form.username.trim().toLowerCase()
    };

    editUser(
      { id, data: payload },
      {
        onSuccess: (updatedUser) => {
          const user = updatedUser?.data;
          toast.success(
            `User ${user?.name || updatedUser?.name} updated successfully!`
          );
        },
        onError: (error: any) => {
          toast.error(
            error?.response?.data?.message || 'Failed to update user'
          );
        }
      }
    );
  };

  const [activeTab, setActiveTab] = useState<
    'general' | 'security' | 'access' | 'outlet-access'
  >('general');

  if (error) return <div className="p-4 text-red-500">User not found</div>;

  const isOnline = Boolean(
    user?.activity?.isOnline ||
    user?.liveLogin?.isOnline ||
    (user?.lastSeenAt && dayjs().diff(dayjs(user.lastSeenAt), 'second') <= 60)
  );

  return (
    <DashboardLayout isLoading={isLoadingUser}>
      <div className="flex w-full max-w-5xl mx-auto mt-4 gap-6">
        {/* Sidebar */}
        <div className="w-1/4 bg-white shadow-md rounded-sm p-4">
          <h2 className="font-bold mb-4">Settings</h2>
          <ul className="space-y-2">
            <li>
              <button
                className={`w-full text-left px-2 py-1 rounded-sm ${
                  activeTab === 'general'
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('general')}
              >
                General
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left px-2 py-1 rounded-sm ${
                  activeTab === 'security'
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('security')}
              >
                Security
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left px-2 py-1 rounded-sm ${
                  activeTab === 'access'
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('access')}
              >
                Access Permissions
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left px-2 py-1 rounded-sm ${
                  activeTab === 'outlet-access'
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('outlet-access')}
              >
                Outlet Access Permissions
              </button>
            </li>
          </ul>
        </div>

        {/* Content */}
        <div className="w-3/4 bg-white shadow-md rounded-sm p-6">
          {activeTab === 'general' && (
            <>
              <h1 className="text-xl font-bold mb-4">Edit User</h1>
              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  ['name', 'text'],
                  ['email', 'text'],
                  ['username', 'text'],
                  ['phone', 'text']
                ].map(([key, type]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1 capitalize">
                      {key}
                    </label>
                    <input
                      type={type}
                      name={key}
                      value={(form as any)[key]}
                      onChange={handleChange}
                      className="w-full border px-3 py-2 rounded-sm"
                      required={key === 'name' || key === 'email'}
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded-sm"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Outlet
                  </label>
                  <select
                    name="outlet"
                    value={form.outlet}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded-sm"
                    disabled={outlets.length === 0}
                  >
                    {form.outlet === '' && (
                      <option key="default outlet" value="">
                        Select Outlet
                      </option>
                    )}
                    {outlets
                      ?.slice()
                      .sort((a: any, b: any) => {
                        const regionCompare = b.region?.localeCompare(
                          a.region || ''
                        );
                        if (regionCompare !== 0) return regionCompare;
                        const typeCompare = a.type?.localeCompare(b.type || '');
                        if (typeCompare !== 0) return typeCompare;
                        return a.label?.localeCompare(b.label || '');
                      })
                      .map((outlet: any) => (
                        <option key={outlet._id} value={outlet._id}>
                          {outlet.label} - {outlet.type} - {outlet.region}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Position
                  </label>
                  <select
                    name="position"
                    value={form.position}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded-sm"
                    disabled={positions.length === 0}
                  >
                    {form.position === '' && (
                      <option key="default position" value="">
                        Select Position
                      </option>
                    )}
                    {positions
                      ?.slice()
                      .sort((a: any, b: any) =>
                        String(a.name || a.label || '').localeCompare(
                          String(b.name || b.label || '')
                        )
                      )
                      .map((pos: any) => (
                        <option
                          key={pos.id || pos._id}
                          value={pos.id || pos._id}
                        >
                          {pos.label || pos.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push('/users')}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isPendingEditUser}>
                    {isPendingEditUser ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>

              <div className="mt-6 text-sm text-gray-500">
                <p>
                  <strong>Created At:</strong>{' '}
                  {setDateStr(user?.createdAt, 'dddd, DD MMM YYYY HH:mm')}
                </p>
                <p>
                  <strong>Last Updated:</strong>{' '}
                  {setDateStr(user?.updatedAt, 'dddd, DD MMM YYYY HH:mm')}
                </p>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  <Activity className="w-5 h-5 text-primary" />
                  Security & Login Activity
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Monitor active sessions and recent login history for this
                  account.
                </p>
              </div>

              {/* Live Login Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-50 rounded-sm text-green-600">
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">
                      Live Login Session
                    </span>
                  </div>
                  <OnlineStatus isOnline={isOnline} />
                </div>

                <div className="p-4">
                  {user?.liveLogin ? (
                    (() => {
                      let mapLink = '';
                      const lat = user.liveLogin?.location?.latitude;
                      const lng = user.liveLogin?.location?.longitude;
                      if (lat && lng) {
                        mapLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                      } else {
                        const locStr =
                          user.liveLogin?.location?.display_name ||
                          getLocationString(user.liveLogin?.location);
                        if (
                          locStr &&
                          locStr !== 'Unknown Location' &&
                          locStr !== 'Local'
                        ) {
                          mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locStr)}`;
                        }
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                Current Location
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {mapLink ? (
                                  <a
                                    href={mapLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:bg-slate-100 p-0.5 rounded-sm transition-colors flex-shrink-0 flex items-center justify-center h-5 w-5"
                                    title="Buka di Google Maps"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src="/icons/google-maps-classic.svg"
                                      alt="Google Maps"
                                      className="h-3.5 w-3.5"
                                    />
                                  </a>
                                ) : (
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                <span className="text-sm font-semibold text-slate-700">
                                  {user.liveLogin.location?.display_name ||
                                    getLocationString(user.liveLogin.location)}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                Network IP
                              </span>
                              <span className="text-sm font-mono text-slate-600 mt-0.5">
                                {user.liveLogin.ip ?? '0.0.0.0'}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                Coordinates
                              </span>
                              <span className="text-sm font-medium text-slate-600 mt-0.5">
                                {user.liveLogin.location?.latitude &&
                                user.liveLogin.location?.longitude
                                  ? `${user.liveLogin.location.latitude}, ${user.liveLogin.location.longitude}`
                                  : 'GPS coordinates empty'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                Last Activity
                              </span>
                              <span className="text-sm font-medium text-slate-600 mt-0.5 italic">
                                {user.liveLogin.lastSeenAt
                                  ? dayjs(user.liveLogin.lastSeenAt).fromNow()
                                  : 'No timestamp recorded'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400 opacity-60">
                      <Globe className="w-8 h-8 mb-2 stroke-1" />
                      <p className="text-xs">
                        No active live session data available.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Login History Card */}
              <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-sm text-blue-600">
                      <History className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">
                      Login History Sessions
                    </span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-sm border border-slate-200 uppercase">
                    {user?.lastLogins?.length ?? 0} Recorded
                  </span>
                </div>

                <div className="p-0">
                  {user?.lastLogins && user.lastLogins.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 w-12">
                              #
                            </th>
                            <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                              Date & Time
                            </th>
                            <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                              Device Details
                            </th>
                            <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                              IP Address
                            </th>
                            <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                              Location
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {user.lastLogins.map((login: any, idx: number) => (
                            <tr
                              key={idx}
                              className="hover:bg-slate-50/80 transition-colors group"
                            >
                              <td className="px-4 py-3 text-xs text-slate-400 font-medium">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700">
                                    {dayjs(login.loginAt).fromNow()}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {setDateStr(
                                      login.loginAt,
                                      'DD MMM YYYY, HH:mm:ss'
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {login.device ? (
                                  <div className="flex items-center gap-3">
                                    <Monitor className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                                    <div className="flex flex-col">
                                      <span className="text-xs font-semibold text-slate-600">
                                        {login.device.browser?.name ||
                                          'Unknown'}{' '}
                                        {login.device.browser?.version}
                                      </span>
                                      <span className="text-[10px] text-slate-400 uppercase font-medium">
                                        {login.device.os?.name || 'Unknown'}{' '}
                                        {login.device.os?.version}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-300">
                                    N/A
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                                  {login.ip || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {(() => {
                                  let mapLink = '';
                                  const lat = login.location?.latitude;
                                  const lng = login.location?.longitude;
                                  if (lat && lng) {
                                    mapLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                                  } else {
                                    const locStr =
                                      login.location?.display_name ||
                                      getLocationString(login.location);
                                    if (
                                      locStr &&
                                      locStr !== 'Unknown Location' &&
                                      locStr !== 'Local'
                                    ) {
                                      mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locStr)}`;
                                    }
                                  }

                                  const displayLocation =
                                    login.location?.display_name ||
                                    getLocationString(login.location);

                                  const isGpsLoc = Boolean(
                                    login.location?.isGps ||
                                    login.location?.source === 'gps' ||
                                    login.location?.accuracy
                                  );

                                  return (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1.5">
                                        {mapLink ? (
                                          <a
                                            href={mapLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:bg-slate-100 p-0.5 rounded-sm transition-colors flex-shrink-0 flex items-center justify-center h-5 w-5"
                                            title="Buka lokasi persis di Google Maps"
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src="/icons/google-maps-classic.svg"
                                              alt="Google Maps"
                                              className="h-3.5 w-3.5"
                                            />
                                          </a>
                                        ) : (
                                          <MapPin className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                                        )}
                                        <span
                                          className="text-xs text-slate-700 font-medium truncate max-w-[220px]"
                                          title={displayLocation}
                                        >
                                          {displayLocation}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 pl-6">
                                        {isGpsLoc ? (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <Crosshair className="w-2.5 h-2.5 text-emerald-600" />
                                            GPS High-Acc{' '}
                                            {login.location?.accuracy
                                              ? `(±${Math.round(login.location.accuracy)}m)`
                                              : ''}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                            <Globe className="w-2.5 h-2.5 text-slate-400" />
                                            IP GeoIP
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <History className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">
                        No login history available yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'access' && (
            <>
              <h2 className="text-lg font-semibold mb-2">Access Permissions</h2>
              <p className="text-sm text-gray-500">
                Manage user &quot;{user?.name || 'unkown'}&quot; permissions
                related to pages and features
              </p>

              {/* State untuk akses */}
              <AccessTable user={user} />
            </>
          )}
          {activeTab === 'outlet-access' && (
            <OutletAccessSection
              outlets={outlets}
              value={{
                outletAccessMode: form.outletAccessMode,
                outletAccess: form.outletAccess
              }}
              onSave={(v: any) => {
                if (!user?._id) return;
                editUser(
                  {
                    id: user._id,
                    data: v
                  },
                  {
                    onSuccess: (updatedUser) => {
                      const user = updatedUser?.data;
                      toast.success(
                        `User ${user?.name || updatedUser?.name} outlet access updated successfully!`
                      );
                    },
                    onError: (error: any) => {
                      toast.error(
                        error?.response?.data?.message ||
                          'Failed to update user outlet access'
                      );
                    }
                  }
                );
              }}
              isSaving={isPendingEditUser}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
