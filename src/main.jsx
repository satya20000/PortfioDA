import React, { Suspense, lazy, Component } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import Portfolio from './pages/Portfolio.jsx';
import './styles.css';
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));

class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="error-page"><span className="eyebrow">Something needs another look</span><h1>The page could not load.</h1><p>Please reload to try again.</p><button className="button button-primary" onClick={() => location.reload()}>Reload page</button></main>;
    return this.props.children;
  }
}
function NotFound() {
  return <main className="error-page"><span className="eyebrow">404</span><h1>This page wandered off.</h1><Link className="button button-primary" to="/">Back to portfolio</Link></main>;
}
createRoot(document.getElementById('root')).render(
  <React.StrictMode><ErrorBoundary><MotionConfig reducedMotion="user"><BrowserRouter><Suspense fallback={<div className="page-loading" role="status"><span className="loading-ring" />Opening your workspace…</div>}><Routes>
    <Route path="/" element={<Portfolio />} />
    <Route path="/dashboard/:projectId" element={<Dashboard />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Suspense></BrowserRouter></MotionConfig></ErrorBoundary></React.StrictMode>
);
