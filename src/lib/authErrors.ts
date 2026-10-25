import type { TranslationKey } from './i18n/translations'

const errorKeys: Record<string, TranslationKey> = {
  invalid_credentials: 'auth.errorInvalidCredentials',
  email_not_confirmed: 'auth.errorEmailNotConfirmed',
  email_exists: 'auth.errorEmailTaken',
  user_already_exists: 'auth.errorEmailTaken',
  weak_password: 'auth.errorWeakPassword',
  email_address_invalid: 'auth.errorInvalidEmail',
  validation_failed: 'auth.errorInvalidEmail',
  over_request_rate_limit: 'auth.errorRateLimited',
  over_email_send_rate_limit: 'auth.errorRateLimited',
  same_password: 'auth.errorSamePassword',
  session_not_found: 'auth.errorSessionExpired',
  refresh_token_not_found: 'auth.errorSessionExpired',
}

export function authErrorKey(error: unknown): TranslationKey {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : null

  if (typeof code === 'string' && code in errorKeys) {
    return errorKeys[code]
  }

  return 'auth.errorGeneric'
}
