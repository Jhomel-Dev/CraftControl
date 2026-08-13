"use client";

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children, ...props }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          if (m.type === 'attributes' && (m.attributeName === 'bis_skin_checked' || m.attributeName === 'bis_register')) {
            m.target.removeAttribute(m.attributeName);
          }
        });
      });
      observer.observe(document.documentElement, { attributes: true, subtree: true });
      return () => observer.disconnect();
    }
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
