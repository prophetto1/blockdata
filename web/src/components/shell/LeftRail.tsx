import { Box, Divider, NavLink, Text, UnstyledButton } from '@mantine/core';
import { IconExternalLink, IconLogout } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_GROUPS } from '@/components/shell/nav-config';

type LeftRailProps = {
  onNavigate?: () => void;
  userLabel?: string;
  onSignOut?: () => void | Promise<void>;
};

export function LeftRail({ onNavigate, userLabel, onSignOut }: LeftRailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isTemplatesPath = location.pathname.startsWith('/app/schemas/templates');
  const getGroupKey = (label: string) => label.toLowerCase().replace(/\s+/g, '-');

  const isItemActive = (path: string): boolean => {
    if (path === '/app') return location.pathname === '/app';
    if (path === '/app/projects') return location.pathname.startsWith('/app/projects');
    if (path === '/app/schemas') return location.pathname.startsWith('/app/schemas') && !isTemplatesPath;
    if (path === '/app/schemas/templates') return isTemplatesPath;
    return location.pathname.startsWith(path);
  };

  return (
    <Box mt={2} className="left-rail" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {NAV_GROUPS.map((group, groupIndex) => (
        <Box
          key={group.label}
          mt={groupIndex === 0 ? 0 : 8}
          className={groupIndex === 0 ? undefined : 'left-rail-group'}
          data-group={getGroupKey(group.label)}
        >
          <Text px="xs" mb={2} className="left-rail-heading">
            {group.label}
          </Text>
          {group.items.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size={15} stroke={1.8} />}
              className="left-rail-link"
              px="xs"
              py={3}
              active={isItemActive(item.path)}
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
        leftSection={<IconExternalLink size={15} stroke={1.8} />}
        className="left-rail-link"
        px="xs"
        py={3}
        component="a"
        href="/docs"
        target="_blank"
        mt={4}
        style={{ opacity: 0.7 }}
      />

      {(userLabel || onSignOut) && (
        <Box mt="auto" pt="md">
          <Divider mb="xs" />
          {userLabel && (
            <Text px="xs" size="xs" c="dimmed" truncate>
              {userLabel}
            </Text>
          )}
          {onSignOut && (
            <UnstyledButton
              px="xs"
              py={4}
              mt={4}
              onClick={onSignOut}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
            >
              <IconLogout size={14} stroke={1.8} style={{ opacity: 0.5 }} />
              <Text size="xs" c="dimmed">Sign out</Text>
            </UnstyledButton>
          )}
        </Box>
      )}
    </Box>
  );
}
