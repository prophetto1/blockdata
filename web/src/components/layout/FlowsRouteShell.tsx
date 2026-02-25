import { Outlet, useLocation } from 'react-router-dom';
import './FlowsRouteShell.css';

export function FlowsRouteShell() {
  const location = useLocation();
  const isFlowDetailRoute = /^\/app\/flows\/[^/]+(?:\/[^/]+)?$/.test(location.pathname);

  return (
    <div className={`flows-route-shell ${isFlowDetailRoute ? 'flows-route-shell--detail' : 'flows-route-shell--list'}`}>
      <div className="flows-route-shell-inner">
        <Outlet />
      </div>
    </div>
  );
}
