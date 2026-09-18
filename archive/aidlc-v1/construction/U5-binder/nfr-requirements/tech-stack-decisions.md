# U5 Binder & Collection — Tech Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Rendering | Server Components (reads) | No mutations; fetch on server, stream HTML. |
| Data | Drizzle reads (pool + collection) | Reuse U1/U3; single indexed collection query. |
| Progress | U1 pure `themeProgress` | Tested; no duplication. |
| Images | `next/image`, lazy | Smooth large grids; Blob CDN. |
| Card visuals | U6 `CardRenderer` (placeholder now) | Effects centralized in U6. |

## No new infra / env / deps.
