/**
 * Board access model for the current session.
 *
 * @temporary This is a temporary MVP access model based on token-based link sharing.
 * Future evolution should replace or extend this with a membership-based model
 * supporting user accounts, invitations, and role management per board.
 *
 * Current access types:
 *   'owner'              — Full board management. Authenticated via ownerKey stored in
 *                          localStorage and sent as a bearer token to the backend.
 *   'complete_only_link' — Restricted access via a share token in the URL (?shareToken=...).
 *                          Can only mark tasks as complete. All management actions blocked
 *                          in both the UI and the backend API.
 */
export type AccessType = 'owner' | 'complete_only_link';

export interface AccessContext {
  type: AccessType;
  /** Only present when type === 'complete_only_link' */
  shareToken?: string;
}
