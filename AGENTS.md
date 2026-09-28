# Testing rules

- Freeze time in every test whose expectations depend on a stored `blockedUntil`
  deadline: use `vi.useFakeTimers()` + `vi.setSystemTime(NOW)` (see
  `tests/common/websites.test.ts`), not a bare `Date.now()`/`new Date()` call.
  `tests/common/website-editing.test.ts` computed `deadline = Date.now() + 60_000`
  against the real wall clock while every sibling file under `tests/common/` and
  `tests/background/` freezes time — an unmocked deadline can expire mid-test if
  the run stalls, unlike the rest of the suite where it never can.
