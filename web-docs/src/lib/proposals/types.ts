export type ProposalStatus =
  | 'draft'
  | 'submitted'
  | 'conditional-accept'
  | 'accepted'
  | 'rejected';

export type ProposalSummary = {
  filename: string;
  slug: string;
  title: string;
  description: string;
  status: ProposalStatus;
  updatedAt: string;
  author: string;
  source: string;
  reviewedBy: string;
};

