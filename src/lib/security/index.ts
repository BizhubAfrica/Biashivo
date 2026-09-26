// Maps raw Supabase/Postgres errors into friendly user-facing messages.
// Never surfaces SQL, stack traces, or auth internals to the user.

export function friendlyError(error: unknown, fallback = 'We couldn’t complete that action. Please try again.'): string {
  if (!error || typeof error !== 'object') return fallback;
  const e = error as { message?: string; code?: string };
  const msg = (e.message || '').toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'The email or password you entered is incorrect.';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'You’ve tried that too many times. Please wait a moment and try again.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }
  if (msg.includes('password should be') || msg.includes('weak password')) {
    return 'Please choose a stronger password (at least 8 characters).';
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'We couldn’t reach the server. Check your connection and try again.';
  }
  if (msg.includes('not authenticated')) {
    return 'You need to be signed in to do that.';
  }
  if (msg.includes('only a business owner')) {
    return 'Only the business owner can perform that action.';
  }
  if (msg.includes('cannot remove the sole business owner') || msg.includes('cannot demote the sole business owner')) {
    return 'You can’t remove the only owner of this business. Add another owner first.';
  }
  if (msg.includes('super_admin')) {
    return 'That action isn’t available.';
  }
  if (e.code === '23505' || msg.includes('duplicate key') || msg.includes('already exists')) {
    return 'That record already exists.';
  }
  return fallback;
}
