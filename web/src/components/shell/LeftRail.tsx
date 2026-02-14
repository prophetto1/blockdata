import { Box, NavLink, Text } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_GROUPS } from '@/components/shell/nav-config';

type LeftRailProps = {
  onNavigate?: () => void;
};

export function LeftRail({ onNavigate }: LeftRailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isTemplatesPath = location.pathname.startsWith('/app/schemas/templates');
  const getGroupKey = (label: string) => label.toLowerCase().replace(/\s+/g, '-');

  return (
    <Box mt="xs" className="left-rail">
      {NAV_GROUPS.map((group, groupIndex) => (
        <Box
          key={group.label}
          mt={groupIndex === 0 ? 0 : 'md'}
          className={groupIndex === 0 ? undefined : 'left-rail-group'}
          data-group={getGroupKey(group.label)}
        >
          <Text px="sm" mb={6} className="left-rail-heading">
            {group.label}
          </Text>
          {group.items.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              className="left-rail-link"
              px="sm"
              py={5}
              active={
                item.path === '/app'
                  ? location.pathname === '/app'
                  : item.path === '/app/projects'
                    ? location.pathname.startsWith('/app/projects')
                  : item.path === '/app/schemas'
                    ? location.pathname.startsWith('/app/schemas') && !isTemplatesPath
                  : item.path === '/app/schemas/templates'
                    ? isTemplatesPath
                  : location.pathname.startsWith(item.path)
              }
              onClick={() => {
                navigate(item.path);
                onNavigate?.();
              }}
            />
          ))}
        </Box>
      ))}
      <NavLink
        label="Docs"
        className="left-rail-link"
        px="sm"
        py={5}
        component="a"
        href="/docs"
        target="_blank"
        mt="xs"
        style={{ opacity: 0.84 }}
      />
    </Box>
  );
}
