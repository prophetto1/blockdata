import type { APIRoute } from 'astro';

import { resolve } from 'node:path';

import { createProposalReviewResponse } from '../../../lib/proposals/api.mjs';

export const prerender = false;

const proposalsRoot = resolve(process.cwd(), 'src/content/docs/proposals');

export const POST: APIRoute = async ({ request, redirect }) => {
  return createProposalReviewResponse({
    rootDir: proposalsRoot,
    request,
    allowWrites: import.meta.env.DEV || import.meta.env.PROPOSALS_FS_WRITES === 'enabled',
    redirect,
  });
};
