<script lang="ts">
  import type { AniAvatarState } from '../../lib/ani/types';
  let { state = 'idle', size = 'md', label = 'Ani' }: { state?: AniAvatarState; size?: 'sm' | 'md' | 'lg'; label?: string } = $props();

  const sizeClass = () => size === 'sm' ? 'ani-avatar--sm' : size === 'lg' ? 'ani-avatar--lg' : 'ani-avatar--md';
</script>

<span class={`ani-avatar ${sizeClass()} ani-avatar--${state}`} data-state={state} role="img" aria-label={`${label}: ${state}`}>
  <span class="ani-avatar__halo" aria-hidden="true"></span>
  <img src="/ani/ani-avatar.webp" width="640" height="640" alt="" draggable="false" decoding="async" />
  {#if state === 'listening'}<span class="ani-avatar__listening" aria-hidden="true"></span>{/if}
  {#if state === 'working' || state === 'thinking'}<span class="ani-avatar__route" aria-hidden="true"></span>{/if}
</span>

<style>
  .ani-avatar { --avatar-size: 4rem; position: relative; display: inline-grid; place-items: center; width: var(--avatar-size); height: var(--avatar-size); isolation: isolate; flex: 0 0 auto; }
  .ani-avatar--sm { --avatar-size: 2.5rem; } .ani-avatar--md { --avatar-size: 4rem; } .ani-avatar--lg { --avatar-size: 6.5rem; }
  img { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: contain; border-radius: 38%; filter: drop-shadow(0 10px 18px rgba(32,37,30,.10)); transform-origin: 50% 72%; user-select: none; }
  .ani-avatar__halo { position: absolute; z-index: 0; inset: 9%; border-radius: 50%; background: color-mix(in srgb, #91AC67 24%, transparent); opacity: 0; transform: scale(.86); }
  .ani-avatar__listening { position:absolute; inset:-4%; border:1px solid color-mix(in srgb,#597928 48%,transparent); border-radius:50%; z-index:1; animation: listen 1.8s var(--ease-out, ease-out) infinite; }
  .ani-avatar__route { position:absolute; z-index:3; width:18%; height:18%; right:5%; bottom:12%; border-radius:50%; background:#597928; box-shadow:-10px 3px 0 -3px #91AC67; animation: route 1.4s var(--ease-settle, ease-out) infinite alternate; }
  .ani-avatar--attentive img, .ani-avatar--speaking img, .ani-avatar--success img { animation: settle 360ms var(--ease-settle, ease-out) both; }
  .ani-avatar--listening .ani-avatar__halo, .ani-avatar--thinking .ani-avatar__halo, .ani-avatar--working .ani-avatar__halo { opacity: 1; animation: halo 2.2s ease-in-out infinite; }
  .ani-avatar--offline img { filter: grayscale(.35) saturate(.7) drop-shadow(0 8px 14px rgba(32,37,30,.08)); opacity:.82; }
  .ani-avatar--error .ani-avatar__halo { opacity:1; background:color-mix(in srgb,#6E3511 15%,transparent); }
  @keyframes settle { from { transform: translateY(3px) scale(.985); opacity:.88 } to { transform:none; opacity:1 } }
  @keyframes halo { 0%,100% { transform:scale(.88); opacity:.4 } 50% { transform:scale(1.03); opacity:.78 } }
  @keyframes listen { 0% { transform:scale(.86); opacity:.7 } 75%,100% { transform:scale(1.12); opacity:0 } }
  @keyframes route { from { transform:translateX(-4px); opacity:.45 } to { transform:translateX(2px); opacity:1 } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation:none !important; transition:none !important; } .ani-avatar__listening { opacity:.65; transform:none; } .ani-avatar__halo { transform:none; } }
  @media (forced-colors: active) { .ani-avatar__halo,.ani-avatar__route,.ani-avatar__listening { display:none; } img { filter:none; } }
</style>
