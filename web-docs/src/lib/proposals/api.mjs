import { listProposals, readProposal, writeProposalReview } from './repository.mjs';

function jsonResponse(payload, status = 200) {
  return Response.json(payload, { status });
}

function requestPrefersJson(request) {
  const accept = request.headers.get('accept') ?? '';
  const contentType = request.headers.get('content-type') ?? '';
  return accept.includes('application/json') || contentType.includes('application/json');
}

function getErrorStatus(error) {
  if (error?.code === 'PROPOSAL_CONFLICT') {
    return 409;
  }

  if (error?.code === 'ENOENT') {
    return 404;
  }

  return 400;
}

async function readReviewInput(request) {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return await request.json();
  }

  const formData = await request.formData();
  return {
    filename: String(formData.get('filename') ?? ''),
    reviewer: String(formData.get('reviewer') ?? ''),
    status: String(formData.get('status') ?? ''),
    note: String(formData.get('note') ?? ''),
    expectedUpdatedAt: String(formData.get('expectedUpdatedAt') ?? ''),
  };
}

export async function createProposalListResponse({ rootDir }) {
  const proposals = await listProposals({ rootDir });
  return jsonResponse({ ok: true, proposals });
}

export async function createProposalResponse({ rootDir, filename }) {
  try {
    const proposal = await readProposal({ rootDir, filename });
    return jsonResponse({ ok: true, proposal });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        proposal: null,
        error: error instanceof Error ? error.message : 'Unable to load proposal.',
      },
      getErrorStatus(error),
    );
  }
}

export async function createProposalReviewResponse({
  rootDir,
  request,
  allowWrites,
  redirect,
}) {
  const prefersJson = requestPrefersJson(request);

  if (!allowWrites) {
    const message = 'Proposal file writes are disabled in this environment.';
    if (prefersJson) {
      return jsonResponse({ ok: false, proposal: null, error: message }, 403);
    }

    return new Response(message, { status: 403 });
  }

  const reviewInput = await readReviewInput(request);

  try {
    const proposal = await writeProposalReview({
      rootDir,
      filename: reviewInput.filename,
      reviewer: reviewInput.reviewer,
      status: reviewInput.status,
      note: reviewInput.note,
      expectedUpdatedAt: reviewInput.expectedUpdatedAt || undefined,
    });

    if (prefersJson) {
      return jsonResponse({ ok: true, proposal, error: null });
    }

    return redirect(`/proposals?status=${encodeURIComponent(reviewInput.status)}`, 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to review proposal.';
    const status = getErrorStatus(error);

    if (prefersJson) {
      return jsonResponse({ ok: false, proposal: null, error: message }, status);
    }

    return new Response(message, { status });
  }
}
