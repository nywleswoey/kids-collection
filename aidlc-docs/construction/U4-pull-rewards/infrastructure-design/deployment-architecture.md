# U4 Pull & Rewards — Deployment Architecture

Same shared topology; U4 adds gameplay paths only.

```mermaid
flowchart TD
    Child["Child: tap Pull"] --> Act["pullAction (Server Action)"]
    Act --> PS["PullService"]
    PS -->|"UPDATE ... WHERE tokens>=1"| Neon[("Neon: children")]
    PS -->|drawCard| Pool["pool (cards)"]
    PS -->|"upsert count+1"| Neon2[("Neon: collections")]
    PS --> Card["card -> U6 render"]
    Parent["Parent: grant"] --> GAct["grantTokensAction (requireParent)"]
    GAct --> Neon
```

## Deploy
- No new setup; ships with the existing Vercel app + Neon.
- No new env vars or external integrations.

## Notes
- Pull/grant are ordinary Server Actions on the deployed app.
- All U4 correctness is in DB statements — nothing infra-specific to provision.
