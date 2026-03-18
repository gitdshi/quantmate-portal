/**
 * E2E environment configuration.
 * Values are read from process.env at import time —
 * override them on the CLI:
 *   TEST_ENV=staging TEST_USERNAME=admin npx playwright test
 */

export const env = {
  /** dev | staging */
  name: process.env.TEST_ENV || 'dev',

  /** Login credentials */
  username: process.env.TEST_USERNAME || 'admin',
  password: process.env.TEST_PASSWORD || 'admin123',

  /** Backend API base (used for direct API calls in setup) */
  apiURL: process.env.API_URL || 'http://localhost:8000',
}
