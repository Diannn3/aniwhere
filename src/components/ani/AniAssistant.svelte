<script lang="ts">
  import { onMount, tick } from 'svelte';
  import AniAvatar from './AniAvatar.svelte';
  import { MockAniProvider } from '../../lib/ani/mock-provider';
  import type { AniAvatarState, AniMessage, AniProvider, AniProviderStatus, AniToolRequest } from '../../lib/ani/types';
  import { AniToolDispatcher } from '../../lib/ani/tool-dispatcher';
  import { AniActionExecutor } from '../../lib/ani/action-executor';
  import { parseDiscoverQuery } from '../../lib/state/url-state';
  import { subscribeHarvestContext } from '../../lib/ani/harvest-sync';
  import type { HarvestQuery } from '../../lib/domain/types';
  import { CURRENT_DATA_MODE } from '../../lib/data/current-market';

  let { initialLang = 'en' }: { initialLang?: 'en' | 'fil' } = $props();
  let lang = $state<'en' | 'fil'>(initialLang);
  let open = $state(false);
  let status = $state<AniProviderStatus>('idle');
  let messages = $state<AniMessage[]>([]);
  let input = $state('');
  let notice = $state('');
  let panel: HTMLElement | null = $state(null);
  let trigger: HTMLButtonElement | null = $state(null);
  let inputEl: HTMLInputElement | null = $state(null);
  let unsubscribe: (() => void) | undefined;
  let unsubscribeHarvest: (() => void) | undefined;
  let sharedHarvest = $state<HarvestQuery | null>(null);
  let provider: AniProvider | undefined;
  const dispatcher = new AniToolDispatcher();
  const actionExecutor = new AniActionExecutor();

  const isFil = () => lang === 'fil';
  const avatarState = (): AniAvatarState => status === 'connecting' ? 'attentive' : status === 'ready' ? 'attentive' : status === 'listening' ? 'listening' : status === 'working' ? 'working' : status === 'speaking' ? 'speaking' : status === 'offline' ? 'offline' : status === 'error' ? 'error' : 'idle';

  onMount(() => {
    const parsed = parseDiscoverQuery(window.location.search);
    lang = parsed.lang;
    sharedHarvest = parsed.harvest;
    unsubscribeHarvest = subscribeHarvestContext((next) => {
      sharedHarvest = next;
    });

    const handleWindowKeydown = (event: KeyboardEvent) => {
      if (open && event.key === 'Escape') {
        event.preventDefault();
        closeAni();
      }
    };
    const handleOpenRequest = () => void openAni();
    window.addEventListener('keydown', handleWindowKeydown);
    window.addEventListener('aniwhere:open-ani', handleOpenRequest);
    return () => {
      window.removeEventListener('keydown', handleWindowKeydown);
      window.removeEventListener('aniwhere:open-ani', handleOpenRequest);
      document.documentElement.style.overflow = '';
      setBackgroundInert(false);
      unsubscribe?.();
      unsubscribeHarvest?.();
      void provider?.close();
    };
  });

  function currentHarvest() {
    const params = new URLSearchParams(window.location.search);
    const hasExplicitHarvest = ['crop', 'kg', 'origin'].every((key) => params.has(key));

    if (hasExplicitHarvest) {
      return parseDiscoverQuery(params).harvest;
    }

    return sharedHarvest ?? parseDiscoverQuery(params).harvest;
  }

  function setBackgroundInert(value: boolean) {
    document.querySelectorAll<HTMLElement>('[data-ani-background]').forEach((element) => {
      element.inert = value;
      if (value) element.setAttribute('aria-hidden', 'true');
      else element.removeAttribute('aria-hidden');
    });
  }

  async function handleToolRequest(request: AniToolRequest) {
    if (!provider) return;
    status = 'working';
    notice = isFil() ? 'Sinusuri ng AniWhere ang datos…' : 'AniWhere is checking the data…';
    const harvest = currentHarvest();
    const result = await dispatcher.dispatch(request, harvest);
    actionExecutor.apply(request, result, harvest, lang);
    await provider.submitToolResult?.(result);
    if (!result.ok) {
      status = 'error';
      notice = result.error?.message || (isFil() ? 'Hindi natapos ang aksyon.' : 'The action could not be completed.');
      return;
    }
    status = 'ready';
    notice = isFil() ? 'Tapos na ang pagsusuri ng AniWhere.' : 'AniWhere finished checking.';
  }

  async function openAni() {
    if (open) return;
    open = true;
    document.getElementById('ani-mobile-trigger')?.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    setBackgroundInert(true);
    status = 'connecting';
    notice = isFil() ? 'Binubuksan si Ani.' : 'Opening Ani.';
    await tick();
    inputEl?.focus();
    const useMock = import.meta.env.DEV || import.meta.env.PUBLIC_ANI_PROVIDER === 'mock';
    if (useMock) {
      provider = new MockAniProvider();
    } else {
      const { GeminiLiveAniProvider } = await import('../../lib/ani/gemini-live-provider');
      provider = new GeminiLiveAniProvider();
    }
    unsubscribe = provider.subscribe((event) => {
      if (event.status) status = event.status;
      if (event.message) messages = [...messages, event.message];
      if (event.toolRequest) void handleToolRequest(event.toolRequest);
      if (event.error) { status = 'error'; notice = event.error; }
    });
    try {
      await provider.connect({ language: lang, dataMode: CURRENT_DATA_MODE, harvest: currentHarvest() });
      notice = provider.kind === 'mock'
        ? (isFil() ? 'Preview mode. Hindi ito live market AI.' : 'Preview mode. This is not live market AI.')
        : (isFil() ? 'Handa si Ani.' : 'Ani is ready.');
    } catch {
      status = 'offline';
      notice = isFil()
        ? 'Hindi makakonekta si Ani ngayon. Magagamit mo pa rin ang AniWhere nang normal.'
        : 'Ani cannot connect right now. You can keep using AniWhere normally.';
    }
  }

  function closeAni() {
    open = false;
    document.getElementById('ani-mobile-trigger')?.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    setBackgroundInert(false);
    notice = '';
    void provider?.close();
    unsubscribe?.();
    provider = undefined;
    unsubscribe = undefined;
    requestAnimationFrame(() => {
      const mobileTrigger = document.getElementById('ani-mobile-trigger') as HTMLButtonElement | null;
      if (mobileTrigger && mobileTrigger.offsetParent !== null) mobileTrigger.focus();
      else trigger?.focus();
    });
  }

  async function submit() {
    const text = input.trim();
    if (!text || !provider || status === 'offline' || status === 'error') return;
    messages = [...messages, { id: `farmer-${Date.now()}`, role: 'farmer', text, createdAt: Date.now() }];
    input = '';
    try { await provider.sendText(text); }
    catch {
      status = 'offline';
      notice = isFil() ? 'Naputol ang koneksyon. Gamitin muna ang manual na AniWhere.' : 'Connection interrupted. Use the manual AniWhere controls for now.';
    }
  }

  async function requestMic() {
    notice = isFil() ? 'Humihingi ng pahintulot sa mikropono.' : 'Requesting microphone permission.';
    if (!provider?.startListening) {
      notice = isFil()
        ? 'Hindi available ang voice dito. Maaari kang mag-type kay Ani.'
        : 'Voice is unavailable here. You can type to Ani instead.';
      inputEl?.focus();
      return;
    }

    try {
      // The provider owns microphone acquisition so the browser is asked only once per listening session.
      await provider.startListening();
      status = 'listening';
      notice = isFil() ? 'Nakikinig si Ani. Pindutin muli para huminto.' : 'Ani is listening. Press again to stop.';
    } catch {
      notice = isFil()
        ? 'Hindi mabuksan ang mikropono. Maaari kang mag-type kay Ani.'
        : 'The microphone could not be opened. You can type to Ani instead.';
      inputEl?.focus();
    }
  }

  async function stopListening() {
    await provider?.stopListening?.();
    status = 'ready';
    notice = isFil() ? 'Huminto sa pakikinig.' : 'Stopped listening.';
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); closeAni(); return; }
    if (event.key !== 'Tab' || !panel) return;
    const focusable = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
</script>

<div class="ani-assistant" data-open={open}>
  <button bind:this={trigger} type="button" class="ani-trigger" aria-label={isFil() ? 'Tanungin si Ani' : 'Ask Ani'} aria-haspopup="dialog" aria-expanded={open} aria-controls="ani-panel" onclick={openAni}>
    <span aria-hidden="true"><AniAvatar state={open ? 'attentive' : 'idle'} size="sm" /></span>
    <span class="ani-trigger__label">{isFil() ? 'Tanungin si Ani' : 'Ask Ani'}</span>
  </button>

  {#if open}
    <section bind:this={panel} id="ani-panel" class="ani-panel" role="dialog" aria-modal="true" aria-labelledby="ani-title" onkeydown={handleKeydown}>
      <header class="ani-header">
        <div class="ani-identity"><AniAvatar state={avatarState()} size="md" /><div><h2 id="ani-title">Ani</h2><p>{isFil() ? 'Gabay mo sa AniWhere' : 'Your AniWhere navigator'}</p></div></div>
        <button type="button" class="icon-button" aria-label={isFil() ? 'Isara si Ani' : 'Close Ani'} onclick={closeAni}>×</button>
      </header>

      <div class="ani-status" aria-live="polite" aria-atomic="true">
        <span class="status-copy">{notice || (isFil() ? 'I-type o sabihin ang tanong mo.' : 'Type or say what you need.')}</span>
        {#if status === 'speaking' && provider?.stopOutput}
          <button type="button" class="stop-audio" onclick={() => provider?.stopOutput?.()}>{isFil() ? 'Itigil ang audio' : 'Stop audio'}</button>
        {/if}
      </div>

      <div class="ani-transcript" aria-label={isFil() ? 'Usapan kay Ani' : 'Conversation with Ani'}>
        {#if messages.length === 0}
          <div class="ani-welcome">
            <p>{isFil() ? 'Matutulungan kitang ilagay ang ani, intindihin ang fit, at pumunta sa tamang bahagi ng AniWhere.' : 'I can help you enter a harvest, understand fit, and move through AniWhere.'}</p>
            <p class="trust-note">{isFil() ? 'Mag-type para tahimik na text reply. Gamitin ang mikropono kung gusto mong magsalita kay Ani.' : 'Type for a quiet text reply. Use the microphone when you want to speak with Ani.'}</p>
            <p class="trust-note">{isFil() ? 'Ang market fit ay kinukuwenta ng AniWhere, hindi ni Ani.' : 'Market fit is calculated by AniWhere, not by Ani.'}</p>
          </div>
        {:else}
          {#each messages as message (message.id)}
            <article class:farmer={message.role === 'farmer'} class="message">
              <span class="message-role">{message.role === 'farmer' ? (isFil() ? 'Ikaw' : 'You') : 'Ani'}</span>
              <p>{message.text}</p>
            </article>
          {/each}
        {/if}
      </div>

      <form class="ani-composer" onsubmit={(e) => { e.preventDefault(); void submit(); }}>
        <label class="sr-only" for="ani-input">{isFil() ? 'Mensahe kay Ani' : 'Message Ani'}</label>
        <input bind:this={inputEl} id="ani-input" bind:value={input} type="text" autocomplete="off" placeholder={isFil() ? 'hal. May 300 kg akong kamatis…' : 'e.g. I have 300 kg of tomatoes…'} disabled={status === 'offline'} />
        <button type="button" class:listening={status === 'listening'} class="mic-button" aria-pressed={status === 'listening'} aria-label={status === 'listening' ? (isFil() ? 'Huminto sa pakikinig' : 'Stop listening') : (isFil() ? 'Gamitin ang mikropono' : 'Use microphone')} onclick={() => status === 'listening' ? void stopListening() : void requestMic()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
        </button>
        <button type="submit" class="send-button" disabled={!input.trim() || status === 'offline'} aria-label={isFil() ? 'Ipadala' : 'Send'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m4 12 15-7-4 14-3-6-8-1Z"/><path d="m12 13 7-8"/></svg>
        </button>
      </form>
      <p class="ani-footnote">{CURRENT_DATA_MODE === 'demo' ? (isFil() ? 'Demo data ngayon. Kumpirmahin ang presyo, kapasidad, at kondisyon bago bumiyahe.' : 'Demo data for now. Confirm price, capacity, and receiving terms before travelling.') : (isFil() ? 'Kumpirmahin pa rin ang presyo, kapasidad, at kondisyon bago bumiyahe.' : 'Confirm price, capacity, and receiving terms before travelling.')}</p>
    </section>
    <button type="button" class="ani-scrim" aria-label={isFil() ? 'Isara si Ani' : 'Close Ani'} onclick={closeAni}></button>
  {/if}
</div>

<style>
  .ani-assistant { position: fixed; z-index: 55; right: max(1rem, env(safe-area-inset-right)); bottom: calc(5.5rem + env(safe-area-inset-bottom)); font-family: "Source Sans 3", system-ui, sans-serif; }
  .ani-trigger { min-height: 3.25rem; display:flex; align-items:center; gap:.55rem; padding:.35rem .9rem .35rem .4rem; border:1px solid rgba(32,37,30,.14); border-radius:999px; background:rgba(255,253,248,.96); color:#20251E; font-weight:750; box-shadow:0 20px 48px -28px rgba(32,37,30,.65); backdrop-filter:blur(16px); transition:transform 220ms var(--ease-settle), box-shadow 220ms var(--ease-out), border-color 140ms ease; }
  .ani-trigger:hover { transform:translateY(-2px); border-color:rgba(89,121,40,.4); box-shadow:0 24px 56px -28px rgba(32,37,30,.75); }
  .ani-trigger:focus-visible,.icon-button:focus-visible,.mic-button:focus-visible,.send-button:focus-visible,input:focus-visible { outline:3px solid #597928; outline-offset:3px; }
  .ani-panel { position:fixed; z-index:2; right:max(1rem,env(safe-area-inset-right)); bottom:calc(1rem + env(safe-area-inset-bottom)); width:min(25rem,calc(100vw - 2rem)); max-height:min(42rem,calc(100dvh - 2rem)); display:flex; flex-direction:column; overflow:hidden; border:1px solid rgba(32,37,30,.14); border-radius:1.5rem; background:#FFFDF8; color:#20251E; box-shadow:0 32px 80px -36px rgba(32,37,30,.62); animation:panel-in 360ms var(--ease-settle) both; }
  .ani-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem 1rem .8rem; border-bottom:1px solid rgba(32,37,30,.1); }
  .ani-identity { display:flex; align-items:center; gap:.75rem; min-width:0; } h2 { margin:0; font:700 1.25rem/1.1 "Source Serif 4", Georgia, serif; } .ani-identity p { margin:.2rem 0 0; font-size:.78rem; color:#596052; }
  .icon-button,.mic-button,.send-button { width:2.75rem; height:2.75rem; display:grid; place-items:center; border-radius:.85rem; border:1px solid rgba(32,37,30,.13); background:#fff; color:#20251E; font:inherit; flex:0 0 auto; }
  .icon-button { font-size:1.7rem; line-height:1; }
  .ani-status { min-height:2.3rem; display:flex; align-items:center; justify-content:space-between; gap:.6rem; padding:.55rem 1rem; background:rgba(252,236,216,.5); border-bottom:1px solid rgba(32,37,30,.08); color:#5f3215; font-size:.76rem; font-weight:650; }
  .stop-audio { min-height:2.75rem; padding:0 .35rem; flex:0 0 auto; border:0; border-radius:.6rem; background:transparent; color:#5f3215; font-size:.72rem; font-weight:800; text-decoration:underline; text-underline-offset:3px; }
  .ani-transcript { flex:1; min-height:12rem; overflow:auto; padding:1rem; display:flex; flex-direction:column; gap:.8rem; }
  .ani-welcome { margin:auto 0; padding:1rem; border-left:2px solid #91AC67; color:#343b31; line-height:1.55; } .ani-welcome p{margin:0}.ani-welcome .trust-note{margin-top:.7rem;font-size:.78rem;color:#687064}
  .message { max-width:88%; align-self:flex-start; padding:.72rem .82rem; border:1px solid rgba(32,37,30,.1); border-radius:1rem 1rem 1rem .3rem; background:#fff; } .message.farmer { align-self:flex-end; border-radius:1rem 1rem .3rem 1rem; background:#eef3e7; border-color:rgba(89,121,40,.16); } .message-role{display:block;margin-bottom:.2rem;font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#687064}.message p{margin:0;font-size:.9rem;line-height:1.45}
  .ani-composer { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:.45rem; padding:.8rem; border-top:1px solid rgba(32,37,30,.1); background:#fff; } input { min-width:0; min-height:2.75rem; border:1px solid rgba(32,37,30,.14); border-radius:.85rem; background:#FFFDF8; padding:0 .8rem; color:#20251E; font-size:.9rem; } input::placeholder{color:#72796e}.mic-button svg,.send-button svg{width:1.15rem;height:1.15rem}.mic-button.listening{background:#FCECD8;border-color:#6E3511;color:#6E3511}.send-button{background:#597928;color:#FFFDF8;border-color:#597928}.send-button:disabled{opacity:.42}
  .ani-footnote { margin:0; padding:0 .9rem .85rem; font-size:.68rem; line-height:1.4; color:#6a7165; background:#fff; }
  .ani-scrim { position:fixed; z-index:1; inset:0; border:0; background:rgba(32,37,30,.12); backdrop-filter:blur(2px); animation:fade-in 220ms ease both; }
  @keyframes panel-in { from{opacity:0;transform:translateY(16px) scale(.985)} to{opacity:1;transform:none} } @keyframes fade-in{from{opacity:0}to{opacity:1}}
  @media(min-width:768px){ .ani-assistant{bottom:1.25rem;right:1.25rem}.ani-panel{right:1.25rem;bottom:1.25rem}.ani-scrim{background:rgba(32,37,30,.06)} }
  @media(max-width:767px){
    :global(body:has([aria-label="Comparison dock"])) .ani-assistant { bottom: calc(9.5rem + env(safe-area-inset-bottom)); }
    .ani-trigger { display:none; }
    .ani-trigger__label { display:none; }
    .ani-panel{inset:auto 0 0 0;width:100%;max-height:min(44rem,calc(100dvh - 2rem));border-radius:1.5rem 1.5rem 0 0;padding-bottom:env(safe-area-inset-bottom)} .ani-trigger span{font-size:.82rem}.ani-assistant[data-open="true"] .ani-trigger{visibility:hidden} }
  @media(prefers-reduced-motion:reduce){.ani-panel,.ani-scrim,.ani-trigger{animation:none!important;transition:none!important}}
  @media(forced-colors:active){.ani-trigger,.ani-panel,.icon-button,.mic-button,.send-button,input{border:1px solid CanvasText}.ani-scrim{background:transparent}.send-button{background:ButtonFace;color:ButtonText}}
</style>
