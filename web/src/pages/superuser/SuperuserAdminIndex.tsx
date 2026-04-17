import { Navigate } from 'react-router-dom';
import { useAdminSurfaceAccessState } from '@/hooks/useAdminSurfaceAccess';
import { Component as SuperuserControlTowerComponent } from './SuperuserControlTower';

export function SuperuserAdminIndex() {
  const { access } = useAdminSurfaceAccessState();

  if (access?.superuser) {
    return <SuperuserControlTowerComponent />;
  }

  if (access?.blockdataAdmin) {
    return <Navigate to="/app/superuser/bd" replace />;
  }

  if (access?.agchainAdmin) {
    return <Navigate to="/app/superuser/ac" replace />;
  }

  return <Navigate to="/app" replace />;
}
