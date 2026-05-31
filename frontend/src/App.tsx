import { useState, useEffect, useCallback } from 'react';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import DocsPage from './pages/DocsPage';
import './App.css';

function parseShareSlug(path: string): string | undefined {
  const match = path.match(/^\/r\/([a-z0-9]+)/);
  return match?.[1];
}

function isAppRoute(path: string): boolean {
  return path === '/app' || path.startsWith('/app/') || !!parseShareSlug(path);
}

function isDocsRoute(path: string): boolean {
  return path === '/docs' || path.startsWith('/docs#');
}

function parseDocsHash(path: string): string | undefined {
  const hashIndex = path.indexOf('#');
  return hashIndex >= 0 ? path.slice(hashIndex) : undefined;
}

function App() {
  const [path, setPath] = useState(() => window.location.pathname + window.location.hash);

  const navigate = useCallback((to: string) => {
    const hashIndex = to.indexOf('#');
    const pathname = hashIndex >= 0 ? to.slice(0, hashIndex) : to;
    const hash = hashIndex >= 0 ? to.slice(hashIndex) : '';
    window.history.pushState({}, '', pathname + hash);
    setPath(pathname + hash);
  }, []);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname + window.location.hash);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (isAppRoute(path)) {
    return <Dashboard onNavigate={navigate} initialSlug={parseShareSlug(path)} />;
  }

  if (isDocsRoute(path)) {
    return <DocsPage onNavigate={navigate} initialHash={parseDocsHash(path)} />;
  }

  return <LandingPage onNavigate={navigate} />;
}

export default App;
