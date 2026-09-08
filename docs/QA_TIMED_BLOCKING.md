# QA plan: timed website blocking

Date: 2026-09-07. Target: the current uncommitted Website Blocker implementation, based on version 1.2.7.

Source task: https://app.notion.com/p/14a03d591052801585c8e38fa27b3bc1

## Expected behavior

Each website can be blocked indefinitely, for 15/30/60 minutes, or for a custom positive whole number of minutes. Permanent blocking is the default and existing saved entries remain permanent. A timed block starts when it is added, persists an absolute expiration timestamp, and stops blocking navigation at that timestamp. An open options page removes expired rows automatically. Closing options, suspending the extension worker, and restarting the browser must not reset or extend the deadline.

Scope follows the existing extension: navigation to the normalized exact hostname over HTTP/HTTPS is blocked; `www.` is normalized. This feature does not promise immediate eviction of already-open tabs, wildcard subdomain matching, automatic return from the blocked page, a non-cancellable focus session, or daily schedules. Record surprising behavior in these areas as observations rather than inventing acceptance requirements.

## Environment and method

- Use the current working-tree source, Node 24 and the pinned pnpm version. Record the base commit and a fingerprint of the source under test. Preserve all existing edits.
- Run `pnpm check`, explicit ESLint of the changed TSX file, `pnpm build`, and `pnpm release`. Verify the built manifest/version, archive, and unchanged permissions. Record existing skipped tests and warnings.
- Prefer Chrome/Chromium with the unpacked release build in an isolated test profile. Do not modify the user's extension data, personal browsing session, system clock, account settings, or install additional permissions.
- Use reserved example hostnames or a controlled local fixture for test data. Begin with an empty test store, then repeat with legacy permanent entries and a mixed list. Reset only data created by this QA run.
- Use fake clocks for the exact millisecond boundary and long durations; include one real one-minute expiry if a real extension environment is available. Alter only an isolated process/page clock, never the system clock.
- A browser UI harness with mocked extension APIs is useful for form/layout checks but does not prove real extension navigation, browser sync, worker suspension, or browser restart. Clearly label the environment for every result.
- Temporary test scripts and failure-injection fixtures are allowed. Do not change implementation, tracked configuration, or dependencies, and remove temporary tests from the repository afterward. Keep reproducible evidence under `/tmp` or in the final QA report.

## Test cases

P1 = core behavior/data integrity; P2 = validation, consistency or usability. Every case needs an explicit result and evidence.

| ID | Priority | Steps / data | Expected result |
| --- | --- | --- | --- |
| QA-01 | P1 | Run quality checks and both builds against current source; inspect manifest and archive. | Checks pass; archive exists; version matches package; no new permissions. Warnings/skips recorded. |
| QA-02 | P1 | Open options with empty storage; add `example.com` with the default duration; reopen options. | Default is Indefinitely; one permanent record and row; no expiration is introduced. |
| QA-03 | P1 | Separately add sites with 15, 30 and 60 minutes. Compare the saved deadline with creation time. | Correct duration in milliseconds for each preset; visible local expiry matches storage; no timer starts before Add. |
| QA-04 | P1 | Add custom durations 1, 7 and 1440 minutes. | All accepted as whole minutes; correct expiration; saved records survive a fresh read. |
| QA-05 | P1 | Navigate to a timed site before expiry, at the deadline, and after it, without storage changes. | Blocked before the deadline; allowed at and after it. No dependence on an options-page timer. |
| QA-06 | P1 | Keep options open with one short timed block and one permanent block; let the timed block expire. | Timed row disappears automatically on the next active-page tick (approximately one second); permanent row remains; no repeated storage reads/writes each second. |
| QA-07 | P1 | Add a one-minute block, close options, navigate before/after its actual deadline. | Blocking ends on time while options is closed. Real extension execution required for a full pass. |
| QA-08 | P1 | Persist a future block; restart/suspend and resume the extension worker before and after expiry. | Existing deadline is reused; no extension of time; an expired site is allowed immediately after initialization. Mark simulated worker tests as partial evidence for native suspension. |
| QA-09 | P1 | Restart the isolated browser with a saved timed block, once before and once after expiry. | Correct remaining deadline and access; permanent blocks still work. Mocked reloads are not a full pass. |
| QA-10 | P1 | Seed legacy `{hostname}` records alongside timed and expired records; read and add a new site. | Legacy entries remain permanent; active entries retain all expiration data; expired records do not block; cleanup does not remove active sites. |
| QA-11 | P1 | Add the same active permanent or timed hostname again, including a normalized `www.` URL. | Clear duplicate error; original deadline and other records remain unchanged. |
| QA-12 | P1 | Re-add a site exactly at/after expiry, first timed and then indefinitely in separate runs. | Allowed; new block has a fresh deadline or no deadline respectively. |
| QA-13 | P1 | Delete a timed block before expiry and a permanent block; navigate again; reload options. | Only the chosen site is removed and immediately allowed once storage update reaches the worker. |
| QA-14 | P1 | Mix several timed blocks with different deadlines and a permanent one; expire and delete individual entries. | Independent deadlines; no unexpected unblock, extension, disappearance or data loss for other sites. |
| QA-15 | P2 | Custom duration: empty, 0, negative, fractional, nonnumeric paste, exponent notation, very large finite input, Infinity/NaN through the API. | Invalid/non-whole/non-positive/out-of-range values cannot be saved; useful validation; no writes on failure. A numeric exponent that represents a supported whole number is not inherently invalid. |
| QA-16 | P2 | Hostname: empty, whitespace, malformed input, mixed case, full URL with path, and `www.` variant. | Invalid hosts rejected without writes; valid hosts normalize consistently with existing URL behavior. |
| QA-17 | P2 | Switch among presets, custom and indefinite; type a custom value, switch away and return; submit using Enter. | Selected duration is used; hidden custom input does not block other modes; sensible preserved input; keyboard submission works. |
| QA-18 | P2 | Double-click Add/Delete while delaying a storage operation. | Controls reflect the pending operation; no duplicate writes/submissions, lost entries or stuck loading state. |
| QA-19 | P1 | Open two options contexts; add/delete in one; observe the other and the worker. | Both show the current active list and matching navigation decisions without manual refresh. Use real storage events or explicitly label the simulation. |
| QA-20 | P1 | Trigger overlapping reads, resolving an older snapshot after a newer one, in options and background. | An old snapshot cannot restore a deleted block or erase a newly added block. Identify whether any failure also exists in the baseline. |
| QA-21 | P1 | Simultaneously add different sites, or add one/delete another, from separate contexts. | No unrelated active record is lost or resurrected. Distinguish new regression from pre-existing shared-storage limitations. |
| QA-22 | P2 | Inject initial storage-read, add-write and delete-write failures; then restore storage and retry. | Error is visible where applicable; no false success or silent data loss; controls recover; correct state after successful retry. Note background behavior separately. |
| QA-23 | P2 | Mount/unmount/reopen options repeatedly; finish a pending read/rejection after disposal. | Interval and storage listener are removed on disposal; no multiplying timers/listeners or callbacks into a closed UI. |
| QA-24 | P2 | Delay initial worker storage load while the first navigation arrives; navigate to an unrelated site, subframe, and prerendered document. | Navigation waits for initialization; only the existing top-level active-navigation scope is blocked. |
| QA-25 | P2 | Run isolated clock fixtures across midnight, different display time zones and a forward wall-clock jump/simulated sleep. | Deadline is absolute; display changes do not alter duration; after time advances past expiry the site is allowed. Do not change host clock. |
| QA-26 | P2 | Inspect options at desktop and narrow widths; long hostname, custom field, errors, loading and mixed rows; navigate with Tab and labels. | Readable layout without clipped controls/overlap; associated labels; usable keyboard focus and validation; visible expiry includes date when needed. |
| QA-27 | P2 | Inspect runtime console in normal flows, error flows and after disposal. | No unexpected uncaught errors or MobX warnings caused by the change; intentional injected failures identified. |
| QA-28 | P2 | Open popup/settings link and blocked page; compare navigation/normalization with baseline. | Existing access to settings, blocked-page actions and URL behavior remain usable. |
| QA-29 | P2 | If an isolated signed-in multi-device/browser sync environment already exists, synchronize timed and legacy records. | Timestamp survives synchronization; expired entries never become permanent. Otherwise mark blocked, do not use personal accounts to manufacture coverage. |

## Reporting

Write `docs/QA_TIMED_BLOCKING_REPORT.md` in Russian. Include:

1. Tested revision/fingerprint, date, runtime/browser versions and actual environment; commands and results.
2. A result for every QA ID: PASS, FAIL, PARTIAL, or BLOCKED, with a brief evidence reference. PASS requires the promised method; a source review alone does not establish runtime behavior.
3. Confirmed bugs, ordered by severity: concise title, affected file/line, environment, exact steps, expected versus actual, evidence/reproducer, user impact, and whether new or pre-existing. Mark suspected issues separately; do not invent reproduction.
4. Unexecuted checks and precise access/tool limitations. Do not turn a mocked browser harness into a claim that the real extension was tested.
5. Recommendation: ready for review, ready with known issues, or requires fixes. No fixes, commits, publishing, or account changes during this QA task.

Exit criteria: all cases accounted for, all confirmed failures reported, no unexplained failures in normal flows, and explicit coverage gaps. A completed report does not mean every case passed.
