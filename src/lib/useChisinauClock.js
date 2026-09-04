import { useEffect, useState } from 'react';

export function useChisinauClock() {
  const [time, setTime] = useState('-:-');
  useEffect(() => {
    const tick = () => {
      const t = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Chisinau' }).format(new Date());
      setTime(t);
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);
  return time;
}
