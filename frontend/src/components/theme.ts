import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/**
 * Class-based theming: `index.html` applies the saved class before first
 * paint; this hook keeps the class and localStorage in sync afterwards.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('ep-theme', theme);
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) };
}
