'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  endTime: string | Date;
}

export default function CountdownTimer({ endTime }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const calculateTimeLeft = () => {
      const difference = new Date(endTime).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }
      
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false,
      };
    };

    // Initial run
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (!isMounted) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium animate-pulse">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
        Đang tải thời gian...
      </div>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
        Đấu giá đã kết thúc
      </div>
    );
  }

  const timeBlocks = [
    { label: 'Ngày', value: timeLeft.days },
    { label: 'Giờ', value: timeLeft.hours },
    { label: 'Phút', value: timeLeft.minutes },
    { label: 'Giây', value: timeLeft.seconds },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Thời gian còn lại
        </span>
      </div>
      <div className="flex gap-2.5">
        {timeBlocks.map((block, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center min-w-[64px] h-[68px] bg-zinc-900 text-white rounded-xl shadow-md border border-zinc-800 dark:bg-zinc-800 dark:border-zinc-700"
          >
            <span className="text-xl font-extrabold tracking-tight text-white">
              {String(block.value).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-zinc-400 font-semibold uppercase mt-0.5 tracking-wider">
              {block.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
