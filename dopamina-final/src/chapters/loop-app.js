/* App Loop. O fluxo e as chaves de armazenamento sao os mesmos da versao aprovada. */
import { $, $$, pad } from '../core/dom.js';
import { store } from '../core/store.js';
import { debug, reduce } from '../core/env.js';

export function initLoopApp() {
  const root = $('#app');
  if (!root) return;
  const KEY = 'dd-loop-v1';
  const T = { tedio: 'Tédio', notificacao: 'Notificação', tarefa: 'Fugindo de uma tarefa', ansiedade: 'Ansiedade', solidao: 'Solidão', habito: 'Hábito, sem motivo', espera: 'Esperando algo' };
  const F = { alivio: 'Alívio', tempo: 'Só passei o tempo', arrependi: 'Me arrependi', util: 'Foi útil' };
  const FCOLOR = { alivio: 'var(--accent)', tempo: 'var(--calm)', arrependi: 'var(--bad)', util: 'var(--good)' };
  const APPS = ['Instagram', 'TikTok', 'YouTube', 'WhatsApp', 'Outro'];
  const TIPS = {
    tedio: 'Prepare alternativas antes: música sem navegar, uma caminhada ou uma conversa.',
    notificacao: 'Desative as notificações que não são importantes.',
    tarefa: 'Faça uma pausa breve, identifique o que despertou a vontade e escolha de novo.',
    ansiedade: 'Faça uma pausa breve e identifique o que despertou a vontade. Se for frequente e atrapalhar, converse com um profissional.',
    solidao: 'Experimente conversar com uma pessoa, em vez de rolar o feed.',
    habito: 'Tire os apps mais tentadores da tela inicial para criar um pequeno obstáculo.',
    espera: 'Defina horários para conferir as redes, em vez de abrir a cada intervalo.'
  };
  const D = (t, dec, feel, min, app) => ({ trigger: t, dec: dec, feel: feel, dur: min * 60, app: app });
  const DEMO = [
    D('tedio', 'abrir', 'tempo', 14, 'Instagram'), D('tedio', 'abrir', 'tempo', 22, 'TikTok'), D('tedio', 'abrir', 'arrependi', 25, 'TikTok'),
    D('tedio', 'abrir', 'alivio', 9, 'Instagram'), D('tedio', 'outra', null, 0, 'Instagram'), D('tedio', 'abrir', 'tempo', 17, 'YouTube'),
    D('tedio', 'abrir', 'tempo', 12, 'Instagram'), D('tedio', 'abrir', 'arrependi', 20, 'TikTok'), D('tedio', 'abrir', 'alivio', 8, 'Instagram'),
    D('notificacao', 'abrir', 'util', 4, 'WhatsApp'), D('notificacao', 'abrir', 'tempo', 11, 'Instagram'), D('notificacao', 'abrir', 'util', 3, 'WhatsApp'),
    D('notificacao', 'outra', null, 0, 'Instagram'), D('notificacao', 'abrir', 'tempo', 15, 'Instagram'),
    D('tarefa', 'abrir', 'alivio', 10, 'TikTok'), D('tarefa', 'abrir', 'arrependi', 18, 'YouTube'), D('tarefa', 'abrir', 'alivio', 7, 'Instagram'),
    D('tarefa', 'outra', null, 0, 'TikTok'), D('tarefa', 'abrir', 'tempo', 13, 'TikTok'),
    D('habito', 'abrir', 'tempo', 6, 'Instagram'), D('habito', 'abrir', 'tempo', 9, 'Instagram'), D('habito', 'outra', null, 0, 'Instagram'),
    D('ansiedade', 'abrir', 'alivio', 12, 'TikTok'), D('ansiedade', 'abrir', 'arrependi', 16, 'TikTok')
  ];

  const saved = store.get(KEY) || {};
  const okEntry = e => e && typeof e === 'object' && T[e.trigger] && (e.dec === 'abrir' || e.dec === 'outra');
  const state = {
    entries: Array.isArray(saved.entries) ? saved.entries.filter(okEntry) : [],
    pending: saved.pending && T[saved.pending.trigger] && saved.pending.startedAt ? saved.pending : null
  };
  let sandbox = null; /* demonstracao automatica: roda em memoria e nunca toca nos dados salvos */
  const persist = () => { if (!sandbox) store.set(KEY, { entries: state.entries, pending: state.pending }); };
  const pauseSeconds = () => sandbox ? sandbox.pausa : (debug.pausa || 10);

  const views = {};
  $$('[data-view]', root).forEach(v => { views[v.dataset.view] = v; });
  let showDemo = false;
  let curView = 'home';
  let flow = { trigger: null, app: null, dur: 0 };
  const timers = { pause: 0, use: 0 };
  let wipeArm = 0;

  const fmtClock = s => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s % 60); };
  const fmtDur = s => s < 60 ? s + ' s' : Math.round(s / 60) + ' min';

  function chipEl(group, val, label) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip';
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    b.dataset.chip = group; b.dataset.val = val; b.textContent = label;
    return b;
  }
  function buildChips() {
    const tr = $('#trigChips'), ap = $('#appChips');
    tr.innerHTML = ''; ap.innerHTML = '';
    Object.keys(T).forEach(id => tr.appendChild(chipEl('trigger', id, T[id])));
    APPS.forEach(a => ap.appendChild(chipEl('app', a, a)));
    $('#btnTrigNext').disabled = true;
  }

  function show(name, opts) {
    clearInterval(timers.pause); clearInterval(timers.use);
    if (name !== 'pattern') showDemo = false;
    curView = name;
    Object.keys(views).forEach(k => { views[k].hidden = k !== name; });
    $$('.tabs [data-tab]', root).forEach(b => b.setAttribute('aria-current', b.dataset.tab === (name === 'pattern' ? 'pattern' : 'home') ? 'page' : 'false'));
    $('#demoTag').hidden = !((showDemo || sandbox) && name === 'pattern');
    $('#views').scrollTop = 0;
    if (name === 'home') renderHome();
    if (name === 'pause') startPause();
    if (name === 'using') startUse();
    if (!opts || opts.focus !== false) {
      const h = views[name].querySelector('h3');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
  }

  function renderHome() {
    const p = state.pending;
    $('#pendingBox').hidden = !p;
    $('#btnWant').hidden = !!p;
    if (p) $('#pendSince').textContent = new Date(p.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const n = state.entries.length;
    $('#homeCount').textContent = n ? (n === 1 ? '1 registro salvo neste aparelho.' : n + ' registros salvos neste aparelho.') : 'Nenhum registro ainda.';
  }

  const C = 326.7;
  function setNum(el, v) {
    const t = String(v);
    if (el.textContent === t) return;
    el.textContent = t;
    if (!reduce && el.animate) el.animate([{ transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 280, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
  /* a demonstracao pode congelar o anel (tecla Espaco) sem perder os 10 s reais */
  let pauseT0 = 0, frozen = 0;
  function startPause() {
    const total = pauseSeconds();
    pauseT0 = performance.now();
    if (frozen) frozen = pauseT0;
    const fg = $('#ringFg'), num = $('#ringNum');
    $('#btnOpen').disabled = true; $('#btnOther').disabled = true; $('#btnSkip').hidden = false;
    num.classList.remove('ok');
    fg.style.strokeDasharray = C;
    $('#pauseInfo').textContent = 'Você sente: ' + T[flow.trigger].toLowerCase() + (flow.app ? ' (' + flow.app + ')' : '') + '.';
    const step = () => {
      if (frozen) return;
      const el = (performance.now() - pauseT0) / 1000;
      const rem = Math.max(0, total - el);
      fg.style.strokeDashoffset = C * (1 - Math.min(1, el / total));
      setNum(num, Math.ceil(rem * 10 / total));
      if (rem <= 0) endPause();
    };
    timers.pause = setInterval(step, 50);
    step();
  }
  function endPause() {
    clearInterval(timers.pause);
    $('#ringFg').style.strokeDashoffset = 0;
    const num = $('#ringNum'); num.textContent = 'Escolha'; num.classList.add('ok');
    $('#btnOpen').disabled = false; $('#btnOther').disabled = false; $('#btnSkip').hidden = true;
  }

  function startUse() {
    const el = $('#useTime');
    $('#useInfo').textContent = state.pending ? T[state.pending.trigger] + (state.pending.app ? ' em ' + state.pending.app : '') : '';
    const upd = () => { if (state.pending) el.textContent = fmtClock(Math.floor((Date.now() - state.pending.startedAt) / 1000)); };
    upd();
    timers.use = setInterval(upd, 500);
  }

  function addEntry(e) {
    state.entries.push(Object.assign({ t: Date.now() }, e));
    persist();
  }
  function showDone(kind) {
    const n = state.entries.length;
    $('#doneTitle').textContent = kind === 'other' ? 'Boa escolha' : 'Registro salvo';
    $('#doneText').textContent = kind === 'other' ? 'Você escolheu em vez de repetir no automático.' : 'Cada registro deixa o seu padrão mais claro.';
    $('#doneCount').textContent = n + (n === 1 ? ' registro no total.' : ' registros no total.');
    show('done');
  }

  const fillFeel = () => { $('#feelInfo').textContent = 'Você ficou ' + fmtDur(flow.dur) + '. Como se sente agora?'; };

  function renderPattern() {
    const data = showDemo ? DEMO : state.entries;
    const n = data.length;
    const body = $('#patBody');
    $('#btnDemo').textContent = showDemo ? 'Voltar aos meus dados' : 'Ver com dados de exemplo';
    $('#btnDemo').hidden = !!sandbox;
    $('#btnWipe').hidden = showDemo || !!sandbox || !state.entries.length;
    $('#demoTag').hidden = !(showDemo || sandbox);
    if (!n) { body.innerHTML = '<p class="v-sub">Ainda não há registros. Faça o primeiro na aba Registrar ou veja um exemplo.</p>'; return; }
    const opened = data.filter(e => e.dec === 'abrir');
    const other = n - opened.length;
    const secs = opened.reduce((s, e) => s + (e.dur || 0), 0);
    const cnt = (arr, key) => arr.reduce((m, e) => { if (e[key]) m[e[key]] = (m[e[key]] || 0) + 1; return m; }, {});
    const byT = Object.entries(cnt(data, 'trigger')).sort((a, b) => b[1] - a[1]);
    const byF = Object.entries(cnt(opened, 'feel')).sort((a, b) => b[1] - a[1]);
    const row = (label, v, max, color) => '<div class="brow"><span class="bl">' + label + '</span><span class="bv"><i style="width:' + Math.round(100 * v / max) + '%;background:' + color + '"></i></span><span class="bn">' + v + '</span></div>';
    let h = '<div class="stats"><div class="stat"><b>' + n + '</b><span>registros</span></div><div class="stat"><b>' + other + '</b><span>outra coisa</span></div><div class="stat"><b>' + (secs ? fmtDur(secs) : '0') + '</b><span>em uso</span></div></div>';
    h += '<h4>O que puxou a vontade</h4>';
    byT.slice(0, 5).forEach((r, i) => { h += row(T[r[0]], r[1], byT[0][1], i === 0 ? 'var(--accent)' : 'var(--calm)'); });
    if (byF.length) {
      h += '<h4>Como terminou</h4>';
      byF.forEach(r => { h += row(F[r[0]], r[1], byF[0][1], FCOLOR[r[0]]); });
    }
    let read = 'O gatilho que mais aparece: <strong>' + T[byT[0][0]] + '</strong> (' + Math.round(100 * byT[0][1] / n) + '% dos registros).';
    if (opened.length) {
      const neg = opened.filter(e => e.feel === 'tempo' || e.feel === 'arrependi').length;
      read += ' Depois de abrir, ' + Math.round(100 * neg / opened.length) + '% das vezes você terminou com “só passei o tempo” ou “me arrependi”.';
    }
    if (n < 5) read += ' Com poucos registros, o padrão ainda é só uma pista.';
    h += '<p class="reading">' + read + '</p>';
    h += '<p class="tip">' + TIPS[byT[0][0]] + '</p>';
    body.innerHTML = h;
  }

  root.addEventListener('click', ev => {
    const chip = ev.target.closest('[data-chip]');
    if (chip) {
      const g = chip.dataset.chip;
      const same = flow[g] === chip.dataset.val;
      flow[g] = same && g === 'app' ? null : chip.dataset.val;
      $$('[data-chip="' + g + '"]', root).forEach(c => c.setAttribute('aria-checked', c.dataset.val === flow[g] ? 'true' : 'false'));
      $('#btnTrigNext').disabled = !flow.trigger;
      return;
    }
    const tab = ev.target.closest('[data-tab]');
    if (tab) {
      if (tab.dataset.tab === 'pattern') { renderPattern(); show('pattern'); } else { show('home'); }
      return;
    }
    const b = ev.target.closest('[data-act]');
    if (!b || b.disabled) return;
    switch (b.dataset.act) {
      case 'want': flow = { trigger: null, app: null, dur: 0 }; buildChips(); show('trigger'); break;
      case 'cancel': show('home'); break;
      case 'trigNext': if (flow.trigger) show('pause'); break;
      case 'skipWait': endPause(); break;
      case 'open': state.pending = { trigger: flow.trigger, app: flow.app, startedAt: Date.now() }; persist(); show('using'); break;
      case 'other': addEntry({ trigger: flow.trigger, app: flow.app, dec: 'outra', dur: 0, feel: null }); showDone('other'); break;
      case 'goUsing': show('using'); break;
      case 'dropPending': state.pending = null; persist(); renderHome(); break;
      case 'finish': {
        if (!state.pending) { show('home'); break; }
        flow.dur = Math.round((Date.now() - state.pending.startedAt) / 1000);
        fillFeel();
        show('feel');
        break;
      }
      case 'feel': {
        if (!state.pending) { show('home'); break; }
        addEntry({ trigger: state.pending.trigger, app: state.pending.app, dec: 'abrir', dur: flow.dur, feel: b.dataset.val });
        state.pending = null; persist();
        showDone('open');
        break;
      }
      case 'toPattern': renderPattern(); show('pattern'); break;
      case 'again': show('home'); break;
      case 'loadDemo': showDemo = true; renderPattern(); show('pattern'); break;
      case 'toggleDemo': showDemo = !showDemo; renderPattern(); break;
      case 'wipe':
        if (wipeArm) {
          clearTimeout(wipeArm); wipeArm = 0;
          state.entries = []; state.pending = null; persist();
          b.textContent = 'Apagar meus dados';
          renderPattern();
        } else {
          b.textContent = 'Toque de novo para apagar';
          wipeArm = setTimeout(() => { wipeArm = 0; b.textContent = 'Apagar meus dados'; }, 4000);
        }
        break;
      default: break;
    }
  });

  buildChips();
  show('home', { focus: false });

  return {
    root,
    /* entra e sai da demonstracao: troca os dados por uma copia em memoria e devolve tudo no fim */
    sandboxOn(pausa) {
      sandbox = { pausa, entries: state.entries, pending: state.pending, view: curView, flow, showDemo };
      state.entries = DEMO.map(e => Object.assign({}, e));
      state.pending = null;
      frozen = 0;
      show('home', { focus: false });
    },
    sandboxOff() {
      if (!sandbox) return;
      const s = sandbox;
      state.entries = s.entries;
      state.pending = s.pending;
      sandbox = null;
      frozen = 0;
      flow = s.flow;
      buildChips();
      ['trigger', 'app'].forEach(g => $$('[data-chip="' + g + '"]', root).forEach(c => c.setAttribute('aria-checked', c.dataset.val === flow[g] ? 'true' : 'false')));
      $('#btnTrigNext').disabled = !flow.trigger;
      /* volta para a tela em que estava; "salvo" so faz sentido logo depois de um registro */
      const view = s.view === 'done' ? 'home' : s.view;
      if (view === 'feel') fillFeel();
      if (view === 'pattern') { showDemo = s.showDemo; renderPattern(); }
      show(view, { focus: false });
    },
    fakeUse(min) { if (state.pending) state.pending.startedAt = Date.now() - min * 60000; },
    freeze(on) {
      if (on) { if (!frozen) frozen = performance.now(); return; }
      if (frozen) { pauseT0 += performance.now() - frozen; frozen = 0; }
    },
    viewEl() { return views[curView]; },
    /* coloca o app direto em uma etapa: usado ao avancar ou voltar passos durante a demonstracao */
    demoState(name) {
      state.entries = DEMO.map(e => Object.assign({}, e));
      state.pending = null;
      flow = { trigger: 'tedio', app: 'Instagram', dur: 12 * 60 };
      const pend = () => { state.pending = { trigger: flow.trigger, app: flow.app, startedAt: Date.now() - flow.dur * 1000 }; };
      const save = () => state.entries.push({ t: Date.now(), trigger: flow.trigger, app: flow.app, dec: 'abrir', dur: flow.dur, feel: 'tempo' });
      const quiet = { focus: false };
      switch (name) {
        case 'trigger': flow = { trigger: null, app: null, dur: 0 }; buildChips(); show('trigger', quiet); break;
        case 'pause': show('pause', quiet); break;
        case 'using': pend(); show('using', quiet); break;
        case 'feel': pend(); fillFeel(); show('feel', quiet); break;
        case 'done': save(); showDone('open'); break;
        case 'pattern': save(); renderPattern(); show('pattern', quiet); break;
        default: flow = { trigger: null, app: null, dur: 0 }; show('home', quiet);
      }
    }
  };
}
