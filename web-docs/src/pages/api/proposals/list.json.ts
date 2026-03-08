import type { APIRoute } from 'astro';
import { resolve } from 'node:path';

import { createProposalListResponse } from '../../../lib/proposals/api.mjs';

export const prerender = false;

const proposalsRoot = resolve(process.cwd(), 'src/content/docs/proposals');

export const GET: APIRoute = async () => createProposalListResponse({ rootDir: proposalsRoot });
