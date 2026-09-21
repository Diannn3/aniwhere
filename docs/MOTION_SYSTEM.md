# AniWhere Motion System

Motion communicates **where state went** and **what changed**.

| Token | Duration | Use |
|---|---:|---|
| instant | 80ms | pressed/active response |
| micro | 140ms | icon/chip/save |
| ui | 220ms | dropdown, filter, result selection |
| gentle | 360ms | sheet/panel/page-region entrance |
| ambient | 6–12s | optional illustrative route/idle detail |

Easing: `--ease-out: cubic-bezier(.2,.8,.2,1)`; `--ease-settle: cubic-bezier(.16,1,.3,1)`.

Rules:
- Never gate input behind animation.
- Prefer opacity and transform.
- List↔map preserves selected place and harvest context.
- New/changed result values may settle once; no pulsing evidence.
- Assistant opens from its trigger toward a bottom sheet on mobile and compact side panel on desktop.
- Listening is explicit and user-initiated; stopping listening is immediate.
- Reduced motion removes travel/stagger and preserves state with opacity/static swaps.
- Loading/working uses calm progress, not indefinite mascot bouncing.
