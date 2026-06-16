import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { IconLoader2 } from '@tabler/icons-react';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuthStore();
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

  return children;
}
