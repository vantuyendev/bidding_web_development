import React, { useState, useEffect } from 'react';

/**
 * CountdownBadge — Live countdown with urgency color logic
 * Green → Yellow (< 1hr) → Red+pulse (< 10min)
 */
export default function CountdownBadge({ endTime, className = '', compact = false }) {
  const [timeLeft, setTimeLeft] = useState(computeTimeLeft(endTime));

  useEffect(() => {
    const tick = () => setTimeLeft(computeTimeLeft(endTime));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  if (!timeLeft) return null;

  if (timeLeft.ended) {
    return (
      <span className={`countdown-urgent text-xs font-bold ${className}`}>
        Auction Ended
      </span>
    );
  }

  const { days, hours, minutes, seconds, totalSeconds } = timeLeft;
  const urgency =
    totalSeconds < 10 * 60          ? 'countdown-urgent'
    : totalSeconds < 60 * 60        ? 'countdown-warning'
    : 'countdown-normal';

  if (compact) {
    // Định dạng rút gọn: "2d 4h" hoặc "45m 30s"
    let label = '';
    if (days > 0)         label = `${days}d ${hours}h`;
    else if (hours > 0)   label = `${hours}h ${minutes}m`;
    else if (minutes > 0) label = `${minutes}m ${seconds}s`;
    else                  label = `${seconds}s`;

    return (
      <span className={`${urgency} text-xs font-semibold tabular-nums ${className}`}>
        {label}
      </span>
    );
  }

  // Định dạng đầy đủ
  let label = '';
  if (days > 0)         label = `${days}d ${hours}h ${minutes}m`;
  else if (hours > 0)   label = `${hours}h ${minutes}m ${seconds}s`;
  else                  label = `${minutes}m ${seconds}s`;

  return (
    <span className={`${urgency} text-xs font-semibold tabular-nums ${className}`}>
      ⏱ {label}
    </span>
  );
}

function computeTimeLeft(endTime) {
  if (!endTime) return null;
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return { ended: true, totalSeconds: 0 };

  const totalSeconds = Math.floor(diff / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds, ended: false };
}
