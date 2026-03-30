import { PipelineCatalogPanel } from '@/components/pipelines/PipelineCatalogPanel';
import { usePipelineServicesOverview } from './usePipelineServicesOverview';

export default function PipelineServicesPage() {
  const { services, loading, error } = usePipelineServicesOverview();

  return <PipelineCatalogPanel services={services} loading={loading} error={error} />;
}
