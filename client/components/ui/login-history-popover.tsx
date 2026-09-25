'use client';
import React, { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { History } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';

dayjs.extend(relativeTime);

interface UserLogin {
  loginAt: string;
  ip?: string;
  device?: any;
}

interface LoginHistoryPopoverProps {
  lastLogins: Array<UserLogin>;
}

// Helper function to format login time like Instagram/Facebook
const formatLoginTime = (loginAt: string): string => {
  const now = dayjs();
  const loginTime = dayjs(loginAt);
  const secondsAgo = now.diff(loginTime, 'second');
  const minutesAgo = now.diff(loginTime, 'minute');
  const hoursAgo = now.diff(loginTime, 'hour');
  const daysAgo = now.diff(loginTime, 'day');

  if (secondsAgo < 60) {
    return 'Just now';
  } else if (minutesAgo === 1) {
    return 'a minute ago';
  } else if (minutesAgo < 60) {
    return `${minutesAgo} minutes ago`;
  } else if (hoursAgo === 1) {
    return 'an hour ago';
  } else if (hoursAgo < 24) {
    return `${hoursAgo} hours ago`;
  } else if (daysAgo === 1) {
    return 'a day ago';
  } else if (daysAgo < 7) {
    return `${daysAgo} days ago`;
  } else if (daysAgo < 365) {
    return loginTime.format('D MMM [at] HH:mm');
  } else {
    return loginTime.format('D MMM YYYY [at] HH:mm');
  }
};

export const LoginHistoryPopover: React.FC<LoginHistoryPopoverProps> = ({
  lastLogins = []
}) => {
  const [open, setOpen] = useState(false);

  if (!lastLogins || lastLogins.length === 0) return null;

  const lastLoginAt = lastLogins[0]?.loginAt || '';
  const fullDateTime = dayjs(lastLoginAt).format(
    'dddd, MMMM D, YYYY [at] HH:mm:ss'
  );
  const relTime = dayjs(lastLoginAt).fromNow();

  return (
    <div className="flex items-start justify-between w-full gap-2 group">
      {/* Last Login Time + Tooltip */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span className="text-xs text-gray-700 cursor-help">
            {formatLoginTime(lastLoginAt)}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="p-3 shadow-xl border-primary/10"
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-sm font-bold text-primary">Last Session</p>
            </div>
            <div className="pl-3.5 space-y-0.5 border-l-2 border-primary/20 ml-0.5">
              <p className="text-xs font-semibold">{fullDateTime}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {relTime}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* History Icon + Popover — Tooltip and Popover kept as separate roots */}
      <div className="flex items-center gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <Tooltip delayDuration={0}>
            {/* TooltipTrigger does NOT use asChild here — the PopoverTrigger is inside it as a real child */}
            <TooltipTrigger asChild className="block">
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center w-7 h-7 rounded-sm transition-all duration-200 bg-primary/10 text-primary hover:bg-primary hover:text-white active:scale-95 shadow-sm"
                >
                  <History className="w-4 h-4" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            {!open && (
              <TooltipContent
                side="bottom"
                className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-white border-none shadow-lg"
              >
                View History
              </TooltipContent>
            )}
          </Tooltip>

          <PopoverContent
            side="bottom"
            align="end"
            className="w-[320px] p-0 overflow-hidden rounded-sm border-none shadow-2xl"
          >
            <div className="bg-primary/5 p-4 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Session History
                </h4>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-tighter">
                  {lastLogins.length} Sessions
                </span>
              </div>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-2 bg-white custom-scrollbar">
              <div className="space-y-1">
                {lastLogins.map((login, idx) => {
                  const itemFullDate = dayjs(login.loginAt).format(
                    'MMMM D, YYYY [at] HH:mm:ss'
                  );
                  return (
                    <Tooltip key={idx} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className="p-2.5 rounded-sm hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 flex flex-col gap-1.5 cursor-default">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 w-5 h-5 flex items-center justify-center rounded-sm">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-semibold text-slate-800">
                                {formatLoginTime(login.loginAt)}
                              </span>
                            </div>
                            {login.ip && (
                              <span className="text-[9px] font-mono bg-slate-800 text-slate-100 px-1.5 py-0.5 rounded-sm opacity-70">
                                {login.ip}
                              </span>
                            )}
                          </div>

                          {login.device && (
                            <div className="flex items-center gap-3 pl-7">
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase text-slate-400 font-bold tracking-tighter">
                                  Browser
                                </span>
                                <span className="text-[10px] font-semibold text-slate-600 truncate max-w-[100px]">
                                  {login.device.browser?.name || 'Unknown'}{' '}
                                  {login.device.browser?.version}
                                </span>
                              </div>
                              <div className="w-px h-4 bg-slate-200" />
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase text-slate-400 font-bold tracking-tighter">
                                  OS
                                </span>
                                <span className="text-[10px] font-semibold text-slate-600">
                                  {login.device.os?.name || 'Unknown'}{' '}
                                  {login.device.os?.version}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="bg-slate-800 text-white border-none"
                      >
                        <p className="text-[10px] font-bold">{itemFullDate}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <span className="text-[10px] font-black w-5 h-5 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full border border-slate-200 shadow-inner">
          {lastLogins.length}
        </span>
      </div>
    </div>
  );
};
