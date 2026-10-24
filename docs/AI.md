# AI integration

The final isolated production test instance is at `http://127.0.0.1:3002/assistant`. Build and run it with `FLEXIROVA_DIST_DIR=artifacts/ai/production` to avoid concurrent builds replacing the ordinary `.next` output. The default output remains `.next` when this variable is unset.

FlexiRova now connects to OpenAI through server-only Next.js route handlers. A signed-in user can describe a shift in English, Sinhala or Tamil. The model converts that request into validated filters; the existing database search supplies available jobs and authoritative wage, date and capacity information. Job cards and match reasons use database fields. No application or hiring decision is made by AI.

Worker profiles offer **Extract skills with AI**. The introduction is submitted to the model, supported skill suggestions are merged into the editable form, and the normal Save action persists changes. Existing skills are retained. No profile is automatically changed by extraction.

## Configuration

The ignored `.env.local` stores `OPENAI_API_KEY`. The key must never use a `NEXT_PUBLIC_` prefix. `OPENAI_MODEL` optionally overrides the default `gpt-4.1-mini`. Local setup preserves these settings when refreshing Supabase configuration. The replacement key selected during this setup expires after 24 hours; provision a replacement securely after expiration. The key originally pasted into chat should be revoked.

The implementation follows the [OpenAI Responses API structured-output contract](https://developers.openai.com/api/docs/guides/structured-outputs). The current default model is documented [here](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## Current live result: blocked by API credits

On 2026-10-24, a real request with the securely configured replacement key reached OpenAI and returned HTTP 429 with `credit_balance_exhausted`. Both signed-in app routes map this to HTTP 503, `AI_QUOTA_EXCEEDED`, and show an actionable message. This is an exhausted API credit balance, not a successful generation or transient request-rate error. No live model answer, extraction accuracy, date parsing or multilingual model quality has been accepted yet.

Add credits in the selected Personal / Default project account's [API billing](https://platform.openai.com/settings/organization/billing), then rerun the live checks. [OpenAI error-code guidance](https://developers.openai.com/api/docs/guides/error-codes) distinguishes quota exhaustion from rate limiting. A ChatGPT subscription does not supply API credits.

## Boundaries

The first key-provisioning attempt created an unused 24-hour key before a temporary encryption file disappeared. A second secure attempt saved the active replacement successfully; temporary encryption files have been removed. The unused key may be removed in the Platform API keys page and also expires automatically.

- Authentication, same-origin checks, worker-only extraction, validated inputs, 8 AI requests per user per minute, 60 total requests per process per minute, and at most 3 concurrent provider requests per process.
- 2,000-character messages/introductions, at most 6 history turns, a 64 KB body cap, a 30-second provider timeout and 1,200 output tokens per request. There are no automatic provider retries.
- Only submitted messages/history or the submitted introduction go to OpenAI. Precise location from browser permission goes only to database search. Nearby requests without location ask for permission or a named location.
- Provider credentials and raw provider errors are never returned to the browser. Requests use `store: false`. API-provider data policies still apply.
- Schema-invalid, refused or incomplete model output fails closed. Empty database results remain empty; filters are not silently relaxed.
- Limits and recent provider status are process-local and reset when the server restarts. A multi-instance production deployment needs shared usage controls. A configured status is not proof of successful inference; `ready` records the last completed, validated response in that process.

## Verification

Run `npm.cmd test`, `npm.cmd run test:integration`, and `npm.cmd run test:ai` with the local app and Supabase running. Set `TEST_APP_URL` when using another local port. The AI browser check performs two actual API-backed requests, so it can consume API credits once billing is enabled.

The unit suite includes mocked provider-success/error cases and route tests for database-grounded results, empty results, authentication, origin protection, location handling and extraction. These are bounded fixtures, not live model-quality evidence.

The Chrome check records the actual provider outcome first. Separate, explicitly labeled browser fixtures verify job cards and unsaved profile suggestions. Its report retains `liveAI: "blocked"` when the real provider rejects the request, even if the UI checks pass. Screenshots and the JSON report are saved under ignored `artifacts/ai/`.
