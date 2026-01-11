"use client";

import { useEffect, useState } from "react";

export function useTimer(
  seconds: number,
  onExpire: () => void
) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire();
      return;
    }

    const t = setTimeout(() => {
      setTimeLeft((s) => s - 1);
    }, 1000);

    return () => clearTimeout(t);
  }, [timeLeft]);

  return timeLeft;
}
 