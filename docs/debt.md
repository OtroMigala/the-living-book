# Technical debt

Work left undone on purpose, with the owner's agreement: what it costs while it stays, and how to pay it. Each item is reviewed at every gate.

| ID | Since | Debt | Cost while it stays | How to pay it | Decided |
| --- | --- | --- | --- | --- | --- |
| D1 | 2026-10-23 (Stage 5) | The delivery token reads the `production` environment only, so the preview copy (F06, ADR 0011) cannot be built: the deploy publishes the site without it, with a warning | F06 AC1 cannot be verified; editors have no preview | Add the `preview` environment to the delivery token's scope (Contentstack: Settings → Tokens → Delivery Tokens), by the owner or by the agent through the Management API with the owner's permission. The next deploy builds the copy by itself | Owner: "Déjalo como deuda técnica y avancemos" |
