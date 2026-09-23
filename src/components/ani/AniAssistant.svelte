<script lang="ts">
  import { onMount, tick } from 'svelte';
  import AniAvatar from './AniAvatar.svelte';
  import { MockAniProvider } from '../../lib/ani/mock-provider';
  import type { AniAvatarState, AniMessage, AniProvider, AniProviderStatus, AniToolRequest } from '../../lib/ani/types';
  import { AniToolDispatcher } from '../../lib/ani/tool-dispatcher';
  import { AniActionExecutor } from '../../lib/ani/action-executor';
  import { parseDiscoverQuery, serializeDiscoverQuery } from '../../lib/state/url-state';
  import {
    subscribeHarvestContext,
    subscribeHarvestDraftValidity,
  } from '../../lib/ani/harvest-sync';
  import type { HarvestQuery } from '../../lib/domain/types';
  import { getCropLabel } from '../../lib/domain/crops';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { CURRENT_DATA_MODE } from '../../lib/data/current-market';
  import { faqsForRoute, matchAniFaq, type AniFaq } from '../../lib/ani/faq';

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
  let unsubscribeHarvestValidity: (() => void) | undefined;
  let sharedHarvest = $state<HarvestQuery | null>(null);
  let harvestDraftValid = $state(true);
  let onHome = $state(false);
  let provider = $state<AniProvider | undefined>(undefined);
  let localMode = $state(true);
  let pathname = $state('/');
  let choices = $state<AniFaq[]>([]);
  let activeFaq = $state<AniFaq | null>(null);
  let selectedTopic = $state<'all' | AniFaq['topic']>('all');
  const dispatcher = new AniToolDispatcher();
  const actionExecutor = new AniActionExecutor();

  const isFil = () => lang === 'fil';
  const homeNeedsValidDraft = () => onHome && !harvestDraftValid;
  const avatarState = (): AniAvatarState => status === 'connecting' ? 'attentive' : status === 'ready' ? 'attentive' : status === 'listening' ? 'listening' : status === 'working' ? 'working' : status === 'speaking' ? 'speaking' : status === 'offline' ? 'offline' : status === 'error' ? 'error' : 'idle';
  const harvestSummary = () => {
    if (!sharedHarvest) return '';
    const origin = LAGUNA_MUNICIPALITIES.find((item) => item.id === sharedHarvest?.originMunicipality);
    const crop = getCropLabel(sharedHarvest.crop, lang);
    return `${sharedHarvest.quantityKg.toLocaleString('en-PH')} kg ${crop} · ${origin?.name ?? sharedHarvest.originMunicipality}`;
  };
  const topicLabels: Record<'all' | AniFaq['topic'], { en: string; fil: string }> = {
    all: { en: 'All help', fil: 'Lahat ng tulong' },
    using: { en: 'Using AniWhere', fil: 'Paggamit ng AniWhere' },
    match: { en: 'Fit labels', fil: 'Mga label ng fit' },
    money: { en: 'Price & transport', fil: 'Presyo at biyahe' },
    outlets: { en: 'Outlets & maps', fil: 'Outlet at mapa' },
    saved: { en: 'Saved & Compare', fil: 'Nai-save at Compare' },
    offline: { en: 'Offline & data', fil: 'Offline at data' },
  };
  const topicOrder: AniFaq['topic'][] = ['using', 'match', 'money', 'outlets', 'saved', 'offline'];
  const visibleFaqs = () => {
    const routeFaqs = faqsForRoute(pathname);
    return selectedTopic === 'all' ? routeFaqs : routeFaqs.filter((faq) => faq.topic === selectedTopic);
  };

  onMount(() => {
    const parsed = parseDiscoverQuery(window.location.search);
    lang = parsed.lang;
    pathname = window.location.pathname;
    onHome = pathname === '/';
    sharedHarvest = parsed.harvest;
    unsubscribeHarvest = subscribeHarvestContext((next) => {
      sharedHarvest = next;
    });
    unsubscribeHarvestValidity = subscribeHarvestDraftValidity((isValid) => {
      harvestDraftValid = isValid;
      if (!isValid && onHome && open && !localMode) {
        notice = isFil()
          ? 'Kumpletuhin muna ang kinakailangang detalye ng ani bago mag-check si Ani.'
          : 'Complete the required harvest fields before Ani checks market fit.';
      }
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
      unsubscribeHarvestValidity?.();
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
    if (homeNeedsValidDraft()) {
      status = 'ready';
      notice = isFil()
        ? 'Kumpletuhin muna ang kinakailangang detalye ng ani bago mag-check si Ani.'
        : 'Complete the required harvest fields before Ani checks market fit.';
      await provider.submitToolResult?.({
        requestId: request.id,
        tool: request.name,
        ok: false,
        dataMode: CURRENT_DATA_MODE,
        error: {
          code: 'invalid_arguments',
          message: isFil()
            ? 'Hindi pa valid ang kasalukuyang harvest form.'
            : 'The current harvest form is not valid yet.',
        },
      });
      return;
    }
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

  function actionHref(route: string) {
    const target = new URL(route, window.location.origin);

    if (!(onHome && !harvestDraftValid)) {
      const query = new URLSearchParams(
        serializeDiscoverQuery(currentHarvest(), 'list', undefined, lang),
      );
      for (const [key, value] of query.entries()) {
        target.searchParams.set(key, value);
      }
    } else if (lang === 'fil') {
      target.searchParams.set('lang', 'fil');
    }

    if (route === '/compare') {
      const places = new URLSearchParams(window.location.search).get('places');
      if (places) target.searchParams.set('places', places);
    }

    return `${target.pathname}${target.search}`;
  }

  async function disposeProvider() {
    unsubscribe?.();
    unsubscribe = undefined;
    const current = provider;
    provider = undefined;
    await current?.close();
  }

  async function openAni() {
    if (open) return;
    open = true;
    localMode = true;
    status = 'idle';
    choices = [];
    activeFaq = null;
    selectedTopic = 'all';
    document.getElementById('ani-mobile-trigger')?.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    setBackgroundInert(true);
    notice = isFil()
      ? 'Handa ang local na tulong. Naka-bundle ang mga sagot na ito sa AniWhere.'
      : 'Local help is ready. These answers are bundled with AniWhere.';
    await tick();
    inputEl?.focus();
  }

  async function connectOnline() {
    if (!open || !localMode) return;

    localMode = false;
    choices = [];
    activeFaq = null;
    status = 'connecting';
    notice = isFil() ? 'Kumokonekta sa online Ani…' : 'Connecting to online Ani…';

    await disposeProvider();

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
      if (event.error) {
        status = 'error';
        notice = event.error;
      }
    });

    try {
      await provider.connect({
        language: lang,
        dataMode: CURRENT_DATA_MODE,
        harvest: currentHarvest(),
      });
      notice = provider.kind === 'mock'
        ? (isFil()
            ? 'Preview mode. Online behavior lang ito; demo market data pa rin.'
            : 'Preview mode. This simulates online Ani; market data is still demo data.')
        : (isFil() ? 'Handa ang online Ani.' : 'Online Ani is ready.');
    } catch {
      await disposeProvider();
      localMode = true;
      status = 'idle';
      notice = isFil()
        ? 'Hindi makakonekta ang online Ani. Magagamit mo pa rin ang local na tulong.'
        : 'Online Ani could not connect. Local help is still available.';
    }
  }

  async function returnToLocal() {
    await disposeProvider();
    localMode = true;
    status = 'idle';
    choices = [];
    activeFaq = null;
    notice = isFil()
      ? 'Bumalik sa local na tulong. Walang online na sagot ang ginagamit.'
      : 'Back to local help. No online answer is being used.';
    await tick();
    inputEl?.focus();
  }

  function closeAni() {
    open = false;
    localMode = true;
    status = 'idle';
    choices = [];
    activeFaq = null;
    document.getElementById('ani-mobile-trigger')?.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    setBackgroundInert(false);
    notice = '';
    void disposeProvider();
    requestAnimationFrame(() => {
      const mobileTrigger = document.getElementById('ani-mobile-trigger') as HTMLButtonElement | null;
      if (mobileTrigger && mobileTrigger.offsetParent !== null) mobileTrigger.focus();
      else trigger?.focus();
    });
  }

  function chooseFaq(faq: AniFaq) {
    choices = [];
    activeFaq = faq;
    messages = [
      ...messages,
      {
        id: `faq-${faq.id}-${Date.now()}`,
        role: 'ani',
        text: faq.answer[lang],
        createdAt: Date.now(),
      },
    ];
    notice = isFil()
      ? 'Local na preloaded na sagot mula sa AniWhere.'
      : 'Preloaded local answer from AniWhere.';
  }

  async function submit() {
    const text = input.trim();
    if (!text) return;

    messages = [
      ...messages,
      { id: `farmer-${Date.now()}`, role: 'farmer', text, createdAt: Date.now() },
    ];
    input = '';

    if (localMode) {
      const result = matchAniFaq(text);
      if (result.kind === 'answer') {
        chooseFaq(result.faq);
      } else if (result.kind === 'choices') {
        choices = result.faqs;
        activeFaq = null;
        notice = isFil()
          ? 'May ilang malapit na preloaded na tanong. Piliin ang pinakaangkop.'
          : 'A few preloaded questions are close. Choose the best match.';
      } else {
        choices = [];
        activeFaq = null;
        messages = [
          ...messages,
          {
            id: `faq-none-${Date.now()}`,
            role: 'ani',
            text: isFil()
              ? 'Wala pa akong local na sagot para diyan. Pumili ng topic sa ibaba o gamitin ang online Ani kapag may koneksyon.'
              : 'I do not have a local answer for that yet. Browse a topic below or use online Ani when you have a connection.',
            createdAt: Date.now(),
          },
        ];
        notice = isFil()
          ? 'Walang eksaktong local na sagot.'
          : 'No exact local answer is available.';
      }
      return;
    }

    if (!provider || status === 'offline' || status === 'error' || status === 'connecting') {
      notice = isFil()
        ? 'Hindi pa handa ang online Ani. Maaari kang bumalik sa local na tulong.'
        : 'Online Ani is not ready yet. You can return to local help.';
      return;
    }

    try {
      await provider.sendText(text);
    } catch {
      await disposeProvider();
      localMode = true;
      status = 'idle';
      notice = isFil()
        ? 'Naputol ang koneksyon. Bumalik si Ani sa local na tulong.'
        : 'The connection was interrupted. Ani returned to local help.';
    }
  }

  async function requestMic() {
    if (localMode) {
      notice = isFil()
        ? 'Text-only ang local na tulong. Piliin ang online Ani para gumamit ng voice.'
        : 'Local help is text-only. Switch to online Ani to use voice.';
      inputEl?.focus();
      return;
    }

    if (!provider || status === 'connecting' || status === 'offline' || status === 'error') {
      notice = isFil()
        ? 'Hindi pa handa ang online voice. Maaari kang mag-type o bumalik sa local na tulong.'
        : 'Online voice is not ready. You can type or return to local help.';
      inputEl?.focus();
      return;
    }

    notice = isFil() ? 'Humihingi ng pahintulot sa mikropono.' : 'Requesting microphone permission.';
    if (!provider.startListening) {
      notice = isFil()
        ? 'Hindi available ang voice dito. Maaari kang mag-type kay Ani.'
        : 'Voice is unavailable here. You can type to Ani instead.';
      inputEl?.focus();
      return;
    }

    try {
      // The provider owns microphone acquisition so permission is requested only once per session.
      await provider.startListening();
      status = 'listening';
      notice = isFil()
        ? 'Nakikinig ang online Ani. Pindutin muli para huminto.'
        : 'Online Ani is listening. Press again to stop.';
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

      <div class="ani-transcript" role="log" aria-live="polite" aria-relevant="additions text" aria-label={isFil() ? 'Usapan kay Ani' : 'Conversation with Ani'}>
        {#if messages.length === 0}
          <div class="ani-welcome">
            {#if homeNeedsValidDraft()}
              <div class="harvest-context is-invalid" role="status">
                <span>{isFil() ? 'Kailangan pa ng detalye para sa market check' : 'Harvest details needed for market checks'}</span>
                <strong>
                  {isFil()
                    ? 'Gumagana pa rin ang local na tulong. Kumpletuhin ang crop, dami, munisipalidad, at petsa bago gumamit ng market tools.'
                    : 'Local help still works. Complete crop, quantity, municipality, and ready date before using market tools.'}
                </strong>
              </div>
            {:else if sharedHarvest}
              <div class="harvest-context" aria-label={isFil() ? 'Kasalukuyang harvest context' : 'Current harvest context'}>
                <span>{isFil() ? 'Kasalukuyang ani' : 'Current harvest'}</span>
                <strong>{harvestSummary()}</strong>
              </div>
            {/if}
            <p>
              {localMode
                ? (isFil()
                    ? 'Magtanong tungkol sa paggamit ng AniWhere, fit labels, presyo, biyahe, mapa, Saved, Compare, at offline mode.'
                    : 'Ask about using AniWhere, fit labels, prices, transport, maps, Saved, Compare, and offline mode.')
                : (isFil()
                    ? 'Online Ani ito. Maaari itong gumamit ng AniWhere tools para sa market-context questions.'
                    : 'This is online Ani. It can use AniWhere tools for market-context questions.')}
            </p>
            <p class="trust-note">
              {localMode
                ? (isFil()
                    ? 'Preloaded at text-only ang local na sagot. Hindi nito kinukuwenta ang market fit.'
                    : 'Local answers are preloaded and text-only. They do not calculate market fit.')
                : (isFil()
                    ? 'Ang deterministic AniWhere tools ang authority sa market fit — hindi sariling hula ni Ani.'
                    : 'Deterministic AniWhere tools remain authoritative for market fit — not Ani’s own guess.')}
            </p>
          </div>
        {:else}
          {#each messages as message (message.id)}
            <article class:farmer={message.role === 'farmer'} class="message">
              <span class="message-role">{message.role === 'farmer' ? (isFil() ? 'Ikaw' : 'You') : 'Ani'}</span>
              <p>{message.text}</p>
            </article>
          {/each}
        {/if}

        {#if choices.length > 0 && localMode}
          <div class="faq-choices" role="group" aria-label={isFil() ? 'Mga posibleng tanong' : 'Possible questions'}>
            {#each choices as faq (faq.id)}
              <button type="button" class="faq-choice" onclick={() => chooseFaq(faq)}>
                <span>{faq.question[lang]}</span>
                <span aria-hidden="true">›</span>
              </button>
            {/each}
          </div>
        {/if}

        {#if activeFaq?.action && localMode}
          <a class="faq-action" href={actionHref(activeFaq.action.route)} onclick={closeAni}>
            <span>{activeFaq.action.label[lang]}</span>
            <span aria-hidden="true">→</span>
          </a>
        {/if}

        {#if localMode}
          <section class="faq-topics" aria-labelledby="ani-local-help-title">
            <div class="faq-topics__head">
              <div>
                <strong id="ani-local-help-title">{isFil() ? 'Preloaded na tulong' : 'Preloaded help'}</strong>
                <span>{isFil() ? ' Gumagana sa loaded app kahit walang signal.' : ' Works on the loaded app without signal.'}</span>
              </div>
              <button type="button" class="online-link" onclick={() => void connectOnline()}>
                {isFil() ? 'Gamitin ang online Ani' : 'Use online Ani'}
              </button>
            </div>

            <div class="topic-list" role="group" aria-label={isFil() ? 'Mga topic ng local na tulong' : 'Local help topics'}>
              <button
                type="button"
                class:active={selectedTopic === 'all'}
                aria-pressed={selectedTopic === 'all'}
                onclick={() => selectedTopic = 'all'}
              >
                {topicLabels.all[lang]}
              </button>
              {#each topicOrder as topic}
                <button
                  type="button"
                  class:active={selectedTopic === topic}
                  aria-pressed={selectedTopic === topic}
                  onclick={() => selectedTopic = topic}
                >
                  {topicLabels[topic][lang]}
                </button>
              {/each}
            </div>

            <div class="faq-list">
              {#each visibleFaqs().slice(0, 6) as faq (faq.id)}
                <button type="button" class="faq-suggestion" onclick={() => chooseFaq(faq)}>
                  <span>{faq.question[lang]}</span>
                  <span aria-hidden="true">›</span>
                </button>
              {/each}
            </div>
          </section>
        {:else}
          <div class="online-mode" role="status">
            <div>
              <strong>{isFil() ? 'Online Ani' : 'Online Ani'}</strong>
              <span>{isFil() ? ' Text at voice kapag available ang koneksyon.' : ' Text and voice when the connection is available.'}</span>
            </div>
            <button type="button" class="online-link" onclick={() => void returnToLocal()}>
              {isFil() ? 'Local na tulong' : 'Local help'}
            </button>
          </div>
        {/if}
      </div>

      <form class="ani-composer" onsubmit={(e) => { e.preventDefault(); void submit(); }}>
        <label class="sr-only" for="ani-input">{isFil() ? 'Mensahe kay Ani' : 'Message Ani'}</label>
        <input
          bind:this={inputEl}
          id="ani-input"
          bind:value={input}
          type="text"
          autocomplete="off"
          placeholder={localMode
            ? (isFil() ? 'hal. Ano ang ibig sabihin ng Tugma sa ani?' : 'e.g. What does Matches your harvest mean?')
            : (isFil() ? 'hal. Aling outlet ang puwedeng i-check?' : 'e.g. Which outlets can I check?')}
          disabled={!localMode && status === 'offline'}
          aria-describedby={homeNeedsValidDraft() ? 'ani-draft-warning' : undefined}
        />
        <button
          type="button"
          class:listening={status === 'listening'}
          class="mic-button"
          disabled={!localMode && (status === 'offline' || status === 'connecting' || status === 'error')}
          aria-pressed={status === 'listening'}
          aria-label={status === 'listening'
            ? (isFil() ? 'Huminto sa pakikinig' : 'Stop listening')
            : (isFil() ? 'Gamitin ang mikropono' : 'Use microphone')}
          onclick={() => status === 'listening' ? void stopListening() : void requestMic()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
        </button>
        <button
          type="submit"
          class="send-button"
          disabled={!input.trim() || (!localMode && (status === 'offline' || status === 'error' || status === 'connecting'))}
          aria-label={isFil() ? 'Ipadala' : 'Send'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m4 12 15-7-4 14-3-6-8-1Z"/><path d="m12 13 7-8"/></svg>
        </button>
      </form>
      {#if homeNeedsValidDraft()}
        <p id="ani-draft-warning" class="ani-draft-warning" role="status">
          {localMode
            ? (isFil()
                ? 'Local FAQ ay magagamit pa rin. Kailangan lang ayusin ang harvest form bago sa market checks.'
                : 'Local FAQ still works. Fix the harvest form before market checks.')
            : (isFil()
                ? 'Hindi gagamit ng stale harvest si AniWhere. Ayusin ang harvest form bago tumakbo ang market tools.'
                : 'AniWhere will not use stale harvest data. Fix the harvest form before market tools run.')}
        </p>
      {/if}
      <p class="ani-footnote">{CURRENT_DATA_MODE === 'demo' ? (isFil() ? 'Demo data ngayon. Kumpirmahin ang presyo, kapasidad, at kondisyon bago bumiyahe.' : 'Demo data for now. Confirm price, capacity, and receiving terms before travelling.') : (isFil() ? 'Kumpirmahin pa rin ang presyo, kapasidad, at kondisyon bago bumiyahe.' : 'Confirm price, capacity, and receiving terms before travelling.')}</p>
    </section>
    <button type="button" class="ani-scrim" aria-label={isFil() ? 'Isara si Ani' : 'Close Ani'} onclick={closeAni}></button>
  {/if}
</div>

<style>
  .ani-assistant { position: fixed; z-index: 55; right: max(1rem, env(safe-area-inset-right)); bottom: calc(5.5rem + env(safe-area-inset-bottom)); font-family: "Atkinson Hyperlegible Next Variable", system-ui, sans-serif; }
  .ani-trigger { min-height: 3.25rem; display:flex; align-items:center; gap:.55rem; padding:.35rem .9rem .35rem .4rem; border:1px solid rgba(32,37,30,.14); border-radius:999px; background:#FFFDF8; color:#20251E; font-weight:700; box-shadow:0 12px 32px -20px rgba(32,37,30,.5); transition:transform 220ms var(--ease-settle), box-shadow 220ms var(--ease-out), border-color 140ms ease; }
  .ani-trigger:hover { transform:translateY(-2px); border-color:rgba(89,121,40,.4); box-shadow:0 24px 56px -28px rgba(32,37,30,.75); }
  .ani-trigger:focus-visible,.icon-button:focus-visible,.mic-button:focus-visible,.send-button:focus-visible,.online-link:focus-visible,.faq-suggestion:focus-visible,.faq-choice:focus-visible,.faq-action:focus-visible,.topic-list button:focus-visible,input:focus-visible { outline:3px solid #597928; outline-offset:3px; }
  .ani-panel { position:fixed; z-index:2; right:max(1rem,env(safe-area-inset-right)); bottom:calc(1rem + env(safe-area-inset-bottom)); width:min(27rem,calc(100vw - 2rem)); max-height:min(44rem,calc(100dvh - 2rem)); display:flex; flex-direction:column; overflow:hidden; border:1px solid rgba(32,37,30,.14); border-radius:1rem; background:#FFFDF8; color:#20251E; box-shadow:0 24px 64px -30px rgba(32,37,30,.5); animation:panel-in 360ms var(--ease-settle) both; }
  .ani-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1.1rem 1.25rem; border-bottom:1px solid rgba(32,37,30,.12); background:#FCECD8; }
  .ani-identity { display:flex; align-items:center; gap:.75rem; min-width:0; } h2 { margin:0; font:700 1.3rem/1.1 "Outfit Variable", system-ui, sans-serif; } .ani-identity p { margin:.2rem 0 0; font-size:.82rem; color:#4A5245; }
  .icon-button,.mic-button,.send-button { width:2.75rem; height:2.75rem; display:grid; place-items:center; border-radius:.5rem; border:1px solid rgba(32,37,30,.2); background:#FFFDF8; color:#20251E; font:inherit; flex:0 0 auto; }
  .icon-button { font-size:1.5rem; line-height:1; }
  .ani-status { min-height:2.6rem; display:flex; align-items:center; justify-content:space-between; gap:.6rem; padding:.55rem 1.25rem; background:#FFF8ED; border-bottom:1px solid rgba(110,53,17,.15); color:#6E3511; font-size:.78rem; font-weight:700; }
  .stop-audio { min-height:2.75rem; padding:0 .35rem; flex:0 0 auto; border:0; border-radius:.6rem; background:transparent; color:#5f3215; font-size:.72rem; font-weight:800; text-decoration:underline; text-underline-offset:3px; }
  .ani-transcript { flex:1; min-height:12rem; overflow:auto; padding:1.25rem; display:flex; flex-direction:column; gap:1.25rem; scrollbar-color:#91AC67 transparent; scrollbar-width:thin; }
  .ani-welcome { margin:0; color:#343b31; line-height:1.5; } .ani-welcome p{margin:0;font-size:1rem}.ani-welcome .trust-note{margin-top:.75rem;font-size:.84rem;color:#4A5245}
  .harvest-context { display:grid; gap:.25rem; margin:0 0 1rem; padding:0 0 .9rem; border-bottom:1px solid rgba(32,37,30,.16); }
  .harvest-context span { color:#6E3511; font-size:.75rem; font-weight:700; }
  .harvest-context strong { color:#20251E; font-size:1rem; font-weight:700; font-variant-numeric:tabular-nums; }
  .harvest-context.is-invalid { border-color:rgba(110,53,17,.28); background:transparent; }
  .harvest-context.is-invalid span,.harvest-context.is-invalid strong { color:#6E3511; }
  .ani-draft-warning { margin:0; padding:.55rem .9rem 0; color:#6E3511; background:#fff; font-size:.72rem; line-height:1.4; font-weight:650; }
  .message { max-width:88%; align-self:flex-start; padding:.72rem .82rem; border:1px solid rgba(32,37,30,.1); border-radius:1rem 1rem 1rem .3rem; background:#fff; } .message.farmer { align-self:flex-end; border-radius:1rem 1rem .3rem 1rem; background:#eef3e7; border-color:rgba(89,121,40,.16); } .message-role{display:block;margin-bottom:.2rem;font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#687064}.message p{margin:0;font-size:.9rem;line-height:1.45}
  .faq-topics,.online-mode { border-top:1px solid rgba(32,37,30,.16); padding-top:1rem; }
  .faq-topics__head { display:flex; align-items:flex-start; justify-content:space-between; gap:.75rem; font-size:.85rem; line-height:1.4; }
  .faq-topics__head > div { min-width:0; color:#4A5245; }
  .faq-topics__head strong { display:block; color:#20251E; font:700 1rem/1.3 "Outfit Variable",system-ui,sans-serif; }
  .online-link { min-height:2.75rem; flex:0 0 auto; border:0; border-radius:.5rem; background:transparent; color:#486320; font:inherit; font-size:.82rem; font-weight:700; text-decoration:underline; text-underline-offset:3px; padding:.35rem .45rem; }
  .online-link:hover { background:#EEF3E7; }
  .topic-list { display:flex; gap:.4rem; overflow-x:auto; padding:1rem .05rem .75rem; scrollbar-width:thin; scrollbar-color:#91AC67 transparent; }
  .topic-list::-webkit-scrollbar { height:3px; }
  .topic-list button { flex:0 0 auto; min-height:2.75rem; border:1px solid rgba(32,37,30,.2); border-radius:.5rem; padding:.3rem .8rem; background:transparent; color:#20251E; font:inherit; font-size:.85rem; font-weight:700; }
  .topic-list button.active { background:#486320; color:#FFFDF8; border-color:#486320; }
  .faq-list,.faq-choices { display:grid; gap:0; border-top:1px solid rgba(32,37,30,.12); }
  .faq-suggestion,.faq-choice { min-height:3.25rem; display:flex; align-items:center; justify-content:space-between; gap:.75rem; width:100%; text-align:left; border:0; border-bottom:1px solid rgba(32,37,30,.12); border-radius:0; padding:.7rem .2rem; background:transparent; color:#20251E; font:inherit; font-size:.94rem; line-height:1.3; }
  .faq-suggestion > span:first-child,.faq-choice > span:first-child { min-width:0; }
  .faq-suggestion > span:last-child,.faq-choice > span:last-child { flex:0 0 auto; color:#597928; font-size:1.25rem; }
  .faq-choice { background:#fff; }
  .faq-action { min-height:2.75rem; display:flex; align-items:center; justify-content:space-between; gap:.5rem; border-radius:.5rem; padding:.6rem .8rem; background:#597928; color:#FFFDF8; font-size:.88rem; font-weight:700; text-decoration:none; }
  .faq-suggestion:hover,.faq-choice:hover { border-color:#597928; background:#EEF3E7; }
  .online-mode { display:flex; align-items:flex-start; justify-content:space-between; gap:.75rem; color:#596052; font-size:.8rem; line-height:1.4; }
  .online-mode > div { min-width:0; }
  .online-mode strong { display:block; color:#20251E; }
  .ani-composer { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:.5rem; padding:1rem 1.25rem .5rem; border-top:1px solid rgba(32,37,30,.16); background:#FFFDF8; } input { min-width:0; min-height:2.75rem; border:1px solid rgba(32,37,30,.35); border-radius:.5rem; background:#fff; padding:0 .8rem; color:#20251E; font:inherit; font-size:1rem; } input::placeholder{color:#596052}.mic-button svg,.send-button svg{width:1.15rem;height:1.15rem}.mic-button.listening{background:#FCECD8;border-color:#6E3511;color:#6E3511}.send-button{background:#597928;color:#FFFDF8;border-color:#597928}.mic-button:disabled,.send-button:disabled{opacity:.42;cursor:not-allowed}
  .ani-footnote { margin:0; padding:.25rem 1.25rem 1rem; font-size:.75rem; line-height:1.4; color:#4A5245; background:#FFFDF8; }
  .ani-scrim { position:fixed; z-index:1; inset:0; border:0; background:rgba(32,37,30,.12); backdrop-filter:blur(2px); animation:fade-in 220ms ease both; }
  @keyframes panel-in { from{transform:translateY(16px) scale(.985)} to{transform:none} } @keyframes fade-in{from{opacity:0}to{opacity:1}}
  @media(min-width:768px){ .ani-assistant{bottom:1.25rem;right:1.25rem}.ani-panel{right:1.25rem;bottom:1.25rem}.ani-scrim{background:rgba(32,37,30,.06)} }
  @media(max-width:767px){
    :global(body:has([aria-label="Comparison dock"])) .ani-assistant { bottom: calc(9.5rem + env(safe-area-inset-bottom)); }
    .ani-trigger { display:none; }
    .ani-trigger__label { display:none; }
    .ani-panel{inset:auto 0 0 0;width:100%;max-height:min(44rem,calc(100dvh - 1rem));border-radius:1rem 1rem 0 0;padding-bottom:env(safe-area-inset-bottom)} .ani-trigger span{font-size:.82rem}.ani-assistant[data-open="true"] .ani-trigger{visibility:hidden} }
  @media(prefers-reduced-motion:reduce){.ani-panel,.ani-scrim,.ani-trigger{animation:none!important;transition:none!important}}
  @media(forced-colors:active){.ani-trigger,.ani-panel,.icon-button,.mic-button,.send-button,.faq-suggestion,.faq-choice,.faq-action,.topic-list button,input{border:1px solid CanvasText}.ani-scrim{background:transparent}.send-button{background:ButtonFace;color:ButtonText}}
</style>
