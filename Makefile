# Browser can be passed as an extra goal: make build chrome / make release firefox.
BROWSERS := chrome edge firefox
BROWSER_TARGET := $(firstword $(filter $(BROWSERS),$(MAKECMDGOALS)))

.PHONY: init build release start lint check test chrome_status chrome_update chrome_publish .require-chrome-app-id $(BROWSERS)

init:
	pnpm install

build:
	pnpm build $(BROWSER_TARGET)

release:
	pnpm release $(BROWSER_TARGET)

start:
	pnpm start $(BROWSER_TARGET)

lint:
	pnpm lint

check:
	pnpm check

test:
	pnpm test

$(BROWSERS):
	@:

# Local Chrome Web Store fallback for .github/workflows/deploy-chrome-store.yml.
# Credentials come either from the environment (op run --env-file=.env.1password,
# see 1password.env.example) or from the gitignored .env that go-webext loads
# itself (see .env.example). CHROME_APP_ID is taken from the environment when
# set and read from .env otherwise.
export CHROME_API_VERSION := v2
CHROME_APP_ID ?= $(strip $(shell \
  sed -nE 's/^[[:space:]]*(export[[:space:]]+)?CHROME_APP_ID[[:space:]]*=[[:space:]]*//p' \
    .env 2>/dev/null \
  | tail -n 1 \
  | sed -E 's/[[:space:]]+\#.*$$//' \
  | tr -d "\"'\r"))

.require-chrome-app-id:
	@test -n "$(CHROME_APP_ID)" || { echo "CHROME_APP_ID is empty; fill in .env (see .env.example)" >&2; exit 1; }

chrome_status: .require-chrome-app-id
	@go-webext status chrome -a "$(CHROME_APP_ID)"

# A fresh build guarantees that the uploaded manifest carries the package.json
# version.
chrome_update: .require-chrome-app-id
	@pnpm release chrome
	@go-webext update chrome -a "$(CHROME_APP_ID)" -f "dist/release/chrome.zip"

chrome_publish: .require-chrome-app-id
	@go-webext publish chrome -a "$(CHROME_APP_ID)" --staged
