import { PageHeader } from '@/components/common/PageHeader';
import { ServicesPanel } from '@/pages/settings/ServicesPanel';

export default function ServicesPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Services" />
      <div className="min-h-0 flex-1 px-4 pb-4">
        <ServicesPanel mode="browse" />
      </div>
    </div>
  );
}