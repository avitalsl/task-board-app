import type { AccessContext } from './types.ts';

/**
 * Resolves the access context for the current browser session from the URL.
 *
 * Owner sessions: no special URL param — just open the app normally.
 * Shared sessions: URL contains `?shareToken=<token>`.
 *
 * @temporary Part of the temporary token-based MVP access model.
 */
export function resolveAccess(): AccessContext {
  const params = new URLSearchParams(window.location.search);
  const shareToken = params.get('shareToken');
  if (shareToken) {
    return { type: 'complete_only_link', shareToken };
  }
  return { type: 'owner' };
}
