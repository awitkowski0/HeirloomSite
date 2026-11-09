'use client';

import { useEffect, useRef, useState } from 'react';
import { onToast } from '@/lib/toast';

export default function Toaster() {
  const [message, setMessage] = useState('');
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () =>
      onToast(next => {
        setMessage(next);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setMessage(''), 1600);
      }),
    [],
  );

  return (
    <div className={message ? 'toast toast--show' : 'toast'} role="status" aria-live="polite">
      {message}
    </div>
  );
}
