import './styles/index.css';
import './core/env.js';
import { quality } from './core/quality.js';
import { startStage } from './core/stage.js';
import { createFundo } from './core/fundo.js';
import { has3D } from './core/env.js';
import { initTeam } from './core/team.js';
import { initClock, clkRender, clkToggle } from './core/clock.js';
import { initNav, startScenes, registerKey } from './core/nav.js';
import { initFx } from './core/fx.js';
import { initAbertura } from './chapters/abertura.js';
import { initDados } from './chapters/dados.js';
import { initDopamina } from './chapters/dopamina.js';
import { initCiclo } from './chapters/ciclo.js';
import { initPonte } from './chapters/ponte.js';
import { initLoop } from './chapters/loop.js';
import { initConclusao } from './chapters/conclusao.js';
import { initReferencias } from './chapters/referencias.js';
import { initRoteiro } from './chapters/roteiro.js';
import { initOffline } from './core/offline.js';
import { initTrilho } from './core/trilho.js';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
quality.init();
initOffline();
initTeam();
initClock();
initNav();
initTrilho();
registerKey('t', clkToggle);

const stageOn = startStage();
if (has3D && stageOn) createFundo();

initAbertura();
initDados();
initDopamina();
initCiclo();
initPonte();
initLoop();
initConclusao();
initReferencias();
initRoteiro();
initFx();
clkRender();

/* As cenas medem a pagina depois que as fontes carregam, para os limites do scroll ficarem exatos. */
const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
Promise.race([ready, new Promise(r => setTimeout(r, 1500))]).then(startScenes);
