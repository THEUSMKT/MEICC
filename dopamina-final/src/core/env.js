/* Ambiente: preferencias do usuario, suporte a 3D e parametros de depuracao.
   Parametros de URL (so para testes e ensaios):
     ?pausa=0.5   encurta a pausa do Loop para 0,5 s
     ?no3d        usa os visuais sem WebGL
     ?forcar3d    aceita WebGL por software (normalmente cai no plano B)
     ?q=alto      trava a qualidade (minimo, baixo, medio ou alto) */
const params = new URLSearchParams(location.search);
const num = k => { const v = parseFloat(params.get(k)); return Number.isFinite(v) && v > 0 ? v : null; };

export const debug = {
  pausa: num('pausa'),
  no3d: params.has('no3d'),
  forcar3d: params.has('forcar3d'),
  quality: params.get('q')
};

export const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const hover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* Cenas presas ao scroll so existem em telas grandes e sem movimento reduzido. */
export const MQ_PIN = '(min-width: 901px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)';
export const MQ_FLAT = '(max-width: 900px), (max-height: 559px), (prefers-reduced-motion: reduce)';

function probeGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: !debug.forcar3d });
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
    return true;
  } catch (e) { return false; }
}

export const has3D = !reduce && !debug.no3d && probeGL();
document.documentElement.classList.add(has3D ? 'is-3d' : 'no3d');
if (!reduce) document.documentElement.classList.add('motion');
