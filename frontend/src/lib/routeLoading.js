import { createElement, lazy, useState } from 'react';
import { matchPath } from 'react-router-dom';

const routes = [];

// Share a route import between startup and React. A resolved page renders
// directly, avoiding an initial Suspense fallback and its delayed reveal.
export function lazyRoute(paths, importPage) {
  let component;
  let pending;
  function load() {
    if (!pending) {
      pending = importPage().then(module => {
        component = module.default;
        return module;
      });
    }
    return pending;
  }
  routes.push({ paths: Array.isArray(paths) ? paths : [paths], load });
  const LazyPage = lazy(load);
  return function RoutePage(props) {
    // Keep the chosen element type stable for this mount so later parent
    // renders cannot replace a lazy page and reset its form state.
    const [Page] = useState(() => component || LazyPage);
    return createElement(Page, props);
  };
}

export async function preloadInitialRoute(pathname) {
  const route = routes.find(({ paths }) => paths.some(path => matchPath(path, pathname)));
  if (route) await route.load();
}
