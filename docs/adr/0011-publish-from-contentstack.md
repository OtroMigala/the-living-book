# ADR 0011 — How a publish in Contentstack reaches the site (F05) and the preview (F06)

- **Status:** accepted for F05, 2026-10-23: option 3, by the owner's answer (no Automate in the stack; no GitHub token; "si lo haces tú, sí, te autorizo"). F06 still open
- **Stage:** 5, step 5.5
- **Evidence:** Contentstack's documentation (below); the Stage 2 gate (D2: hosting on GitHub Pages, publishing through a webhook "as in the previous portfolio")

## Context

F05 asks that a change published in Contentstack is on the public site within 10 minutes, with no commit. The Deploy workflow already pulls the content, checks it and publishes it, and it can be started from outside (`workflow_dispatch`, and `repository_dispatch` with the type `contentstack-publish`). What is missing is the call that starts it when something is published.

What the documentation says:

- **A Contentstack webhook** sends a POST to a URL when an event happens (an entry published, in a chosen environment). It can carry custom headers and an authentication method, and a "concise payload" toggle shortens its JSON. Its body is Contentstack's own JSON; the page that describes creating a webhook lists no way to change it. ([Create a webhook](https://www.contentstack.com/docs/headless-cms/create-a-webhook.md), [webhook data format](https://www.contentstack.com/docs/headless-cms/webhook-data-format.md))
- **GitHub** starts a workflow on `POST /repos/{owner}/{repo}/actions/workflows/{workflow}/dispatches` with the body `{"ref": "main"}`; a fine-grained token needs the repository permission "Actions" with write access, and nothing else. `repository_dispatch` needs a body with `event_type`. Neither accepts Contentstack's JSON as it comes. ([Workflows API](https://docs.github.com/en/rest/actions/workflows), [fine-grained token permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens))
- **Contentstack Automate** has an "Entry Publish" trigger and an HTTP action that sends a request of our choosing. Whether the Free plan includes Automate was not found in the documentation; the stack's interface shows it. ([Automate: HTTP action](https://www.contentstack.com/academy/md/courses/contentstack-for-developers/automate--using-an-http-connector-to-send-data-to-a-3rd-party-system.md))

## Options for F05

| Option | For | Against |
| --- | --- | --- |
| **1. Automate**: Entry Publish → HTTP action → GitHub's workflow dispatch | No new service; the token lives in Contentstack, not in the repository | Only if the Free plan includes Automate |
| **2. A relay**: the webhook, with a secret header, → a small function (for example on Cloudflare Workers' free tier) → GitHub | Works with the plan as it is; its code is versioned here and tested | A new account and service to keep; one more place for the token |
| 3. A scheduled check in GitHub Actions, every 10 minutes, that deploys when the content changed | No webhook, no new service, no token outside GitHub | About 4,320 Delivery API calls a month (BC4 allows 10,000); GitHub's scheduled runs can start late, and with the deploy's 3–4 minutes the 10-minute target would often be missed |
| 4. Move hosting to Contentstack Launch, which redeploys on publish | Native | Reverses the Stage 2 decision; the build needs Firefox for the pagination pass (ADR 0009), not known to be available there |

## Options for F06 (preview)

F06 asks that a change published only to the `preview` environment shows in a preview build and not on the public site.

- **a. A preview copy inside the same site**, at `/the-living-book/preview/`: the deploy builds the site twice, from `production` and from `preview`, and publishes both. Not linked, `noindex`, with a banner saying it is a preview. A publish to either environment starts the same deploy. Against: anyone who knows the address can see unpublished changes (GitHub Pages has no access control).
- **b. The preview as a downloadable build** of the Deploy run (an artifact). Private to the repository's collaborators, but an editor has to download and open it.
- **c. A second site** (another repository with its own Pages). Clean separation; creating it needs the owner's permission, and it doubles the setup.

## Recommendation

- F05: **option 1** if the stack shows Automate; otherwise **option 2**.
- F06: **option a**, the simplest that an editor can use; the content is a public-domain book, so a visible preview leaks nothing sensitive.

## What the owner provides, whichever is chosen

1. A look in the stack: does Automate appear?
2. A fine-grained personal access token for this repository only, with "Actions: read and write" and nothing else, and an expiry date. It goes into Automate or the relay as a secret, never into the repository.
3. Permission for the agent to create the automation or webhook in the stack (an external change), or the owner creates it from written steps.

## Decision

**F05: option 3, a scheduled check**, the only one the agent can build without a new account or a token from the owner, and it writes nothing to Contentstack:

1. The deploy takes the signature of what is published (an initial sync: one call, every entry and asset of the environment in every locale, with the time each was published) **before** pulling the content, and publishes it with the site as `content-version.json`.
2. The *Content watch* workflow runs every 10 minutes, takes the signature again and compares it with the site's. If they differ, it starts the Deploy workflow with the run's own token (`workflow_dispatch` is allowed for it). It waits while a deploy is queued or running, and does not retry within an hour a deploy it started that failed, since broken content fails by design.
3. It reads the Contentstack secrets of the `github-pages` environment with `deployment: false`, so the environment's history keeps only real deploys ([GitHub's changelog](https://github.blog/changelog/2026-03-19-github-actions-late-march-2026-updates/)).

Cost: about 4,320 Delivery API calls a month (BC4: ≤ 10,000; spec 02 now says so). Time from publish to live: up to 10 minutes of waiting for the check, GitHub's scheduled runs may start late, then about 4 minutes of deploy; BC5 (≤ 10 minutes) is measured with three timed publishes. If it is missed, the way out is option 2 with a token, or a shorter interval within BC4.
