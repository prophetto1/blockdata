import { Box, NavLink, Text } from '@mantine/core';
import { IconBook } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_GROUPS } from '@/components/shell/nav-config';

type LeftRailProps = {
  onNavigate?: () => void;
};

export function LeftRail({ onNavigate }: LeftRailProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box mt="xs">
      {NAV_GROUPS.map((group, groupIndex) => (
        <Box key={group.label} mt={groupIndex === 0 ? 0 : 'md'}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="sm" mb={4}>
            {group.label}
          </Text>
          {group.items.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size={18} />}
              active={
                item.path === '/app'
                  ? location.pathname === '/app'
                  : item.path === '/app/projects'
                    ? location.pathname.startsWith('/app/projects')
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
        leftSection={<IconBook size={18} />}
        component="a"
        href="/docs"
        target="_blank"
        mt="xs"
        style={{ opacity: 0.7 }}
      />
    </Box>
  );
}
