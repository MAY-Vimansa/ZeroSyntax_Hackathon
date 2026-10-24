# Product decisions

- Audience: Sri Lankan workers seeking temporary shifts and employers posting them.
- Initial goal: a functional hackathon demonstration, worker and employer roles only.
- Brand: FlexiRova; preserve the supplied red/navy/slate theme, with red/white light mode.
- First release: trilingual interface, ordinary database search, opt-in nearby discovery, email verification, applications, and quota-safe employer approval.
- Initial user steering: remove Ollama; defer AI until an API key is available. On 2026-10-24 the user requested integration: server-only OpenAI job-search interpretation and worker skill extraction are now implemented. Live inference is blocked by exhausted API credits; see AI.md. Ordinary database search remains available separately.
- Later worker ratings: attendance reliability and employer reviews, presented separately.
- Later face verification: account identity, not attendance. Attendance uses a later QR milestone.
- Email verification first; phone/WhatsApp messages are not integrated.
- Admin oversight was added at the user's request: protected platform metrics, record inspection, company verification, job closure, and an audit log. See `ADMIN.md` for access and scope.
- Staff roles, live payments, employer commission, biometrics, and real-world hiring remain outside the current release. Company ratings are excluded.
