# Firefox listing

## Listing fields

- Name: Website Blocker: MT
- Suggested slug: website-blocker-mt
- Locale: English (US), matching the extension's only UI language
- Summary: Stay focused by blocking distracting websites.
- Category: Productivity
- Platforms: Firefox for desktop (Windows, macOS, Linux), version 140 or newer
- License: MIT
- Homepage: https://github.com/maximtop/website-blocker
- Support: https://github.com/maximtop/website-blocker/issues
- Support email: me@maximtop.dev
- Icon: `src/assets/icons/icon-128.png`
- Reviewer notes: [AMO_REVIEW.md](AMO_REVIEW.md)

## Description

Stay focused with a simple list of websites you want to avoid.

Website Blocker: MT redirects distracting websites to a reminder page so you can
get back to what you were doing.

- Open settings from the toolbar popup and add a website to block.
- Manage your blocked websites from the options page.
- Remove a website whenever you want to allow it again.
- Keep your block list across browser restarts.

Website matching ignores a leading www. Other subdomains can be added separately.
This is a lightweight focus tool; it does not provide schedules, passwords, or
parental controls.

Your block list is stored in the browser's built-in sync storage and may sync
between your devices if Firefox Sync is enabled. Blocking decisions happen in
your browser. The developer does not receive your list or browsing history.
There are no ads, analytics, or paid features.

Free and open source under the MIT license.

## First submission

Release 1.2.7 and earlier contain only a Chrome package. Use 1.2.8 or later
with its matching Firefox and source ZIPs. Do not upload the Chrome ZIP to AMO.
The first version is prepared in Developer Hub; later versions use the manual
Deploy Firefox workflow. A draft or a passed validator is not a submission or
an approval. Record the AMO slug and status after saving/submitting the form.
