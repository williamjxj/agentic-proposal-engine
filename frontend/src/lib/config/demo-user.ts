/**
 * Demo user configuration for "Try as demo user" on login/signup.
 * Reads from NEXT_PUBLIC_* env vars so values are available client-side.
 * Hide demo link if password is not configured.
 */

const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? 'jxjwilliam@2925.com'
const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? ''

export const demoUserConfig = {
  /** Demo user email */
  email: demoEmail,
  /** Demo user password - set NEXT_PUBLIC_DEMO_PASSWORD in .env.local */
  password: demoPassword,
  /** Whether demo login is available (password must be set) */
  isAvailable: Boolean(demoPassword),
} as const
