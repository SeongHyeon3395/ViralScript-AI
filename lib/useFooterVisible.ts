'use client';

import { useEffect, useState } from 'react';

export function useFooterVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const footer = document.getElementById('site-footer');
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return visible;
}
