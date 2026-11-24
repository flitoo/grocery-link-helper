import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const titles = [
  [/^\/$/, 'Login'], [/^\/register$/, 'Register'], [/^\/forgot-password$/, 'Forgot Password'],
  [/^\/dashboard$/, 'Dashboard'], [/^\/grocery-list$/, 'Grocery List'], [/^\/store-selection$/, 'Select a Store'],
  [/^\/delivery-time$/, 'Choose Delivery Time'], [/^\/order-summary$/, 'Order Summary'], [/^\/payment$/, 'Payment'],
  [/^\/orders$/, 'My Orders'], [/^\/order-details\//, 'Order Details'], [/\/repeat$/, 'Repeat Order'],
  [/^\/collections$/, 'My Collections'], [/^\/notifications$/, 'Notifications'], [/\/rate$/, 'Rating and Feedback'],
  [/\/chat$/, 'Order Chat'], [/\/tracking$/, 'Track Your Order'], [/\/substitutions$/, 'Substitution Requests'],
  [/^\/helper-dashboard$/, 'Helper Dashboard'], [/\/status$/, 'Delivery Status Update'], [/^\/helper\/orders\//, 'Helper Order Details'],
];

export default function PageAccessibility() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    const title = titles.find(([pattern]) => pattern.test(pathname))?.[1];
    document.title = title ? `${title} | Grocery Link Helper` : 'Grocery Link Helper';
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      // A route chunk may still be loading. Move focus once its real content
      // replaces the Suspense fallback, not to a node about to be removed.
      const observer = new MutationObserver(focusContent);
      function focusContent() {
        // Suspense can temporarily keep the old page hidden beside a fallback.
        const main = [...document.querySelectorAll('#main-content')].find(candidate => {
          if (candidate.hasAttribute('data-loading')) return false;
          for (let parent = candidate; parent; parent = parent.parentElement) {
            if (getComputedStyle(parent).display === 'none') return false;
          }
          return true;
        });
        if (main) {
          main.focus({ preventScroll: true }); observer.disconnect();
        }
      }
      observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
      focusContent();
      return () => observer.disconnect();
    }
  }, [pathname]);
  return <a className="skip-link" href="#main-content"
    onClick={() => document.getElementById('main-content')?.focus({ preventScroll: true })}>
    Skip to main content
  </a>;
}
