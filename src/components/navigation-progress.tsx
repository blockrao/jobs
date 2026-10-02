'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

interface NavigationProgressContextValue {
  /** Call before starting a programmatic navigation (e.g. router.push) to
   * show the top progress bar immediately, before the URL actually changes. */
  start: () => void;
}

const NavigationProgressContext = createContext<NavigationProgressContextValue | null>(null);

/**
 * A thin, dependency-free top-of-page progress bar for route transitions.
 *
 * Why this exists: with no visible feedback, a slow navigation (a dynamic
 * page waiting on a DB query, a locale switch that round-trips through
 * middleware) looks identical to a dead click, and the natural response is
 * to click again — multiplying the work rather than waiting it out. This
 * gives every navigation, site-wide, the same "something is happening"
 * signal without touching any of the existing Link/button code that
 * triggers them:
 *
 * - A capture-phase click listener on the document catches clicks on any
 *   internal <Link>-rendered anchor and starts the bar automatically.
 * - Components that navigate programmatically (router.push, not a plain
 *   <a> click — e.g. the language switcher) call start() from
 *   useNavigationProgress() directly.
 * - The bar clears itself as soon as usePathname() reports the route
 *   actually changed, with a safety timeout so it can never get stuck if a
 *   navigation stalls, is cancelled, or redirects somewhere unexpected.
 */
export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const clearSafetyTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const start = () => {
    setActive(true);
    clearSafetyTimeout();
    timeoutRef.current = setTimeout(() => setActive(false), 8000);
  };

  // An actual route change means whatever navigation triggered it has
  // resolved (the new page's RSC payload has arrived) — hide the bar. Skip
  // the very first run so mounting the provider doesn't itself flash it.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setActive(false);
    clearSafetyTimeout();
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Only plain left-clicks with no modifier — anything else (middle
      // click, ctrl/cmd-click to open in a new tab, etc.) isn't a same-tab
      // navigation we need to show progress for.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return (
    <NavigationProgressContext.Provider value={{ start }}>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed left-0 top-0 z-[100] h-0.5 w-full origin-left bg-blue-600 transition-[transform,opacity] duration-300 ease-out ${
          active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
        }`}
      />
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress(): NavigationProgressContextValue {
  const ctx = useContext(NavigationProgressContext);
  if (!ctx) {
    throw new Error('useNavigationProgress must be used within NavigationProgressProvider');
  }
  return ctx;
}
