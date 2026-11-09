/* Leitura e escrita segura no localStorage. As chaves sao dd-loop-v1 e dd-team-v1. */
export const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } }
};
