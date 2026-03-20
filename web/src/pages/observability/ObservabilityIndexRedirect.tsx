import { Navigate } from 'react-router-dom';

export default function ObservabilityIndexRedirect() {
  return <Navigate to="/app/observability/telemetry" replace />;
}
