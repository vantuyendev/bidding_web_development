import React, { useState, useEffect } from 'react';

export default function CountdownTimer({ endTime }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });
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
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-600 text-xs font-bold dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400">
        <span className="h-2 w-2 rounded-full bg-neutral-400"></span>
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
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-500"></span>
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Thời gian còn lại
        </span>
      </div>
      <div className="flex gap-2.5">
        {timeBlocks.map((block, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center min-w-[60px] h-[60px] bg-neutral-100 text-neutral-900 rounded-md border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
          >
            <span className="text-lg font-black tracking-tight text-neutral-900 dark:text-white">
              {String(block.value).padStart(2, '0')}
            </span>
            <span className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5 tracking-wider">
              {block.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
