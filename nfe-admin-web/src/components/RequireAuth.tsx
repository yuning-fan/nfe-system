import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { canAccessConsole, homePathForRole } from '../lib/roleHome';
import { Navigate } from 'react-router-dom';
import { IconLoader2 } from '@tabler/icons-react';

/** console=true 的路由仅 admin 可进；非 admin 一律遣返各自工作台。
 *  只在侧栏藏入口是不够的——路由这层不拦，手输地址照样打得开。 */
export default function RequireAuth({ children, console: consoleOnly }: { children: React.ReactNode; console?: boolean }) {
  const { session, isLoading, profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !session) {
      // Redirect to login page, but save the current location they were
      // trying to go to when they were redirected.
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [isLoading, session, navigate, location]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center' }}>
        <IconLoader2 className="spinner" size={40} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect in useEffect
  }

  if (consoleOnly && profile && !canAccessConsole(profile.role)) {
    return <Navigate to={homePathForRole(profile.role)} replace />;
  }

  return children;
}
