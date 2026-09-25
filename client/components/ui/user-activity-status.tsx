'use client';
import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';

dayjs.extend(relativeTime);
dayjs.extend(calendar);

interface UserActivityStatusProps {
  lastSeenAt: string | Date;
  showFullDate?: boolean;
}

export const UserActivityStatus: React.FC<UserActivityStatusProps> = ({
  lastSeenAt,
  showFullDate = false
}) => {
  // Force re-render every 2 seconds to update real-time seconds/minutes
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  if (!lastSeenAt) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gray-400" />
        <span className="text-xs text-gray-500">Never</span>
      </div>
    );
  }

  const now = dayjs();
  const lastSeen = dayjs(lastSeenAt);
  const secondsAgo = now.diff(lastSeen, 'second');
  const minutesAgo = now.diff(lastSeen, 'minute');
  const hoursAgo = now.diff(lastSeen, 'hour');
  const daysAgo = now.diff(lastSeen, 'day');

  // Determine status - real-time synchronized
  let statusColor = 'bg-gray-400';
  let statusText = '';
  let isActive = false;

  if (secondsAgo < 10) {
    statusColor = 'bg-green-500';
    statusText = 'Active now';
    isActive = true;
  } else if (secondsAgo < 60) {
    statusColor = 'bg-green-500';
    statusText = `${secondsAgo}s ago`;
  } else if (minutesAgo < 2) {
    statusColor = 'bg-orange-400';
    statusText = 'a minute ago';
  } else if (minutesAgo < 60) {
    statusColor = 'bg-orange-400';
    statusText = `${minutesAgo}m ago`;
  } else if (hoursAgo < 24) {
    statusColor = 'bg-gray-400';
    statusText = hoursAgo === 1 ? 'an hour ago' : `${hoursAgo}h ago`;
  } else if (daysAgo < 2) {
    statusColor = 'bg-gray-400';
    statusText = 'Yesterday';
  } else if (daysAgo < 7) {
    statusColor = 'bg-gray-400';
    statusText = `${daysAgo} days ago`;
  } else if (daysAgo < 365) {
    statusColor = 'bg-gray-400';
    statusText = lastSeen.format('D MMM');
  } else {
    statusColor = 'bg-gray-400';
    statusText = lastSeen.format('D MMM YYYY');
  }

  // Full datetime for tooltip
  const fullDateTime = lastSeen.format('dddd, MMMM D, YYYY [at] HH:mm:ss');
  const relativeTime = lastSeen.fromNow();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 cursor-help">
          <div
            className={`w-2 h-2 rounded-full ${statusColor} ${isActive ? 'animate-pulse' : ''}`}
          />
          <div className="flex flex-col">
            <span className="text-xs text-gray-900">{statusText}</span>
            {showFullDate && !isActive && (
              <span className="text-xs text-gray-500">{relativeTime}</span>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Last Seen</p>
          <p className="text-xs">{fullDateTime}</p>
          <p className="text-xs text-gray-400">{relativeTime}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
