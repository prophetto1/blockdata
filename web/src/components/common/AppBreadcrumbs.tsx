import { Breadcrumbs, Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function AppBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <Breadcrumbs mb="sm" styles={{ separator: { color: 'var(--mantine-color-dimmed)' } }}>
      {items.map((item, i) =>
        item.href ? (
          <Anchor key={i} component={Link} to={item.href} size="sm" c="dimmed">
            {item.label}
          </Anchor>
        ) : (
          <Anchor key={i} size="sm" c="dimmed" underline="never" style={{ cursor: 'default' }}>
            {item.label}
          </Anchor>
        ),
      )}
    </Breadcrumbs>
  );
}