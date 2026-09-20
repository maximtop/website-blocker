# Firefox listing

## Listing fields

- Name: Website Blocker: MT
- AMO slug: website-blocker-mt
- Default listing locale: English (US); use the complete 40-locale pack below.
- UI languages: 40 browser-selected catalogs with English fallback and RTL
  support, including duration controls, validation errors and loading messages.
- Summary: Stay focused by blocking distracting websites.
- Category: Other (AMO's "My add-on doesn't fit into any of the categories";
  Productivity is not offered in this submission form)
- Platforms: Firefox for desktop (Windows, macOS, Linux), version 140 or newer
- License: MIT
- Homepage: https://github.com/maximtop/website-blocker
- Support: https://github.com/maximtop/website-blocker/issues
- Support email: me@maximtop.dev
- Icon: `src/assets/icons/icon-128.png`
- Reviewer notes: [AMO_REVIEW.md](AMO_REVIEW.md)

## Complete localized listing pack

[STORE_DESCRIPTIONS.md](store/STORE_DESCRIPTIONS.md) is the canonical shared
pack of full descriptions for all 40 locales. Export every locale with
`pnpm store:descriptions`; the resulting files are in `build/store-descriptions/`.
Localized names and summaries come from
`src/_locales/<locale>/messages.json`. The full locale list is in
[README.md](../README.md#translations). Keep the entire pack when preparing
store metadata; preparing files does not publish the listing.

Use the shared copy for the common behavior. This document adds Firefox-specific
platform, Sync, privacy and first-submission details. The shared descriptions
cover the core blocking features; the English copy below also describes timed
blocking. Refresh corresponding localized copy before advertising those newer
features in another listing locale.

## English description

Stay focused with a simple list of websites you want to avoid.

Website Blocker: MT redirects distracting websites to a reminder page so you can
get back to what you were doing.

- Open settings from the toolbar popup and add a website to block.
- Choose indefinite blocking, 15, 30 or 60 minutes, or custom whole minutes.
- Edit a saved website while keeping its blocking state and deadline.
- Switch blocking off or on for each website without deleting its entry.
- Remove a website whenever you want to allow it again.
- Keep your block list and unexpired deadlines across browser restarts.

Timed entries disappear from the visible list when their deadlines pass.
Turning blocking off does not pause or reset the timer. After expiry, navigate
or reload to open the website again; an existing reminder page stays open.

Website matching ignores a leading www. Other subdomains can be added separately.
This is a lightweight focus tool with one-time durations; it does not provide
recurring schedules, passwords, or parental controls.

The interface supports 40 languages, including duration controls, validation
errors and loading messages. Deadlines use the selected language’s date and time format.

Your block list, blocking states and deadlines are stored in the browser's
built-in sync storage and may sync between your devices if Firefox Sync is enabled.
Blocking decisions happen in your browser. The developer does not receive your list or browsing history.
There are no ads, analytics, or paid features.

Free and open source under the MIT license.

## Privacy policy

Website Blocker: MT does not send your browsing history or block list to the
developer and has no analytics, advertising, or developer-operated backend.

The extension checks website hostnames inside your browser to apply your blocking
rules. It stores the websites you add, their enabled/disabled settings,
optional expiration timestamps and list-order metadata in browser.storage.sync.
Firefox may synchronize these preferences between your devices when Firefox
Sync is enabled; that browser service is controlled by your
Firefox settings and Mozilla's policies.

You can remove entries from the extension's settings page. Expired entries stop
blocking and disappear from the visible list; expiration does not immediately
erase their underlying saved records. The developer has no access to your
stored settings.

If you contact support, the information you choose to send is used to respond to
your request. Contact: me@maximtop.dev.

## Updates to the existing listing

The public listing is [Website Blocker: MT](https://addons.mozilla.org/en-US/firefox/addon/website-blocker-mt/).
AMO published version 1.2.9 on September 15, 2026. Read its current version and
review state before submitting an update; do not resume an old first-submission draft.

Use the manual Deploy Firefox workflow with the Firefox ZIP and matching source
ZIP from one newer GitHub Release. Release 1.2.7 and earlier contain only a
Chrome package; do not upload a Chrome ZIP to AMO. Keep the reviewer notes and
listing fields aligned with the version being submitted, including the locale
pack, timed-blocking behavior and browser sync storage.

Select desktop Firefox only. A draft, a passed validator or a successful upload
is not approval or publication. Use status mode to confirm the review outcome
and record the actual public version. Update feature claims in the public
listing when that version becomes available.
