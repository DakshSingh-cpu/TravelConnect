export type LeadAssignmentStatus =
  | 'vetting'
  | 'approved'
  | 'blocked'
  | 'dismissed'
  | 'superseded'
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'

export type LeadRequestResult =
  | { ok: true; assignmentId: string; status: 'vetting' }
  | { ok: true; assignmentId: string; status: 'pending'; expiresAt: string }
  | { ok: true; assignmentId: string; status: 'accepted'; conversationId: string }
  | { ok: false; error: string; code?: string }
