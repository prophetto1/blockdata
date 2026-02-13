export type McpServerDef = {
  id: string;
  title: string;
  description: string;
};

export const MCP_CATALOG: McpServerDef[] = [
  {
    id: 'context7',
    title: 'Context7',
    description: 'Library and API documentation context.',
  },
  {
    id: 'slack',
    title: 'Slack',
    description: 'Send messages and fetch threads in Slack.',
  },
  {
    id: 'linear',
    title: 'Linear',
    description: 'Issue and project tracking tools.',
  },
  {
    id: 'firecrawl',
    title: 'Firecrawl',
    description: 'Crawl and extract web content.',
  },
  {
    id: 'playwright',
    title: 'Playwright',
    description: 'Browser automation tools.',
  },
  {
    id: 'postgres',
    title: 'Postgres',
    description: 'Query a PostgreSQL database through MCP.',
  },
];

