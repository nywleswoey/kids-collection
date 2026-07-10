# U6 Card UI & Effects — Tech Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Effects | **Custom CSS** (transforms + gradients) driven by CSS custom properties | Dependency-light, GPU-cheap, full reduced-motion control (decided in App Design). |
| Interaction | `pointermove` + `deviceorientation`, throttled via `requestAnimationFrame` | Smooth; write CSS vars, not React state (U6-PERF-2). |
| Component | One client `<Card>` + `useCardTilt` hook + `RevealCard` | Single source of card rendering (U6-BR11). |
| Styling | Tailwind + a small `card.css` for keyframes/vars | Keeps animation CSS colocated. |
| Library | **None** (no Framer Motion / tilt lib) | Per Application Design Q3-A. |

## No new infra / env / runtime deps.
