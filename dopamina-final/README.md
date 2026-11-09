# Dopamina e Dependência: apresentação final

Landing page da feira científica. Substitui os slides: três apresentadores rolam a página em até 5 minutos. O projeto concreto é o **Loop**, que funciona dentro da própria página.

## Como apresentar

Abra `dist/index.html` com dois cliques. É um arquivo único, com tudo embutido, e funciona sem internet e sem servidor.

| Tecla | O que faz |
| --- | --- |
| `PageDown` / `PageUp` | Próximo passo e passo anterior, um por toque (controle remoto) |
| Setas | Também navegam (dentro do celular, as setas ficam com o app) |
| `T` | Inicia ou pausa o cronômetro de 5:00 |
| `H` | Esconde ou mostra a barra do topo e o cronômetro |
| `R` | Abre ou fecha o painel "Defesa das fontes" |
| `D` | Liga ou desliga a demonstração automática do Loop |
| `Esc` | Fecha o painel e encerra a demonstração |

Divisão de tempo: apresentador 1 (abertura e dados, 0 a 90 s), apresentador 2 (ciência e hábito, 90 a 190 s), apresentador 3 (Loop e conclusão, 190 a 300 s).

## Para editar

```bash
npm install
npm run dev
npm run build
```

Os nomes da equipe, a escola e os dados do teste são editados na própria página, em "Editar nomes e dados do teste". O código fica em `src/`, dividido por capítulo em `src/chapters/`. O backup intocado da versão aprovada é `index.original.html`.

## Testes

```bash
npm run build
npm run check
npm test
```

`npm run check` confere o conteúdo contra o backup: as 11 referências idênticas, as justificativas, os números, os travessões, a ausência de CDN e o contraste. `npm test` usa o Playwright com o Edge instalado no Windows, em 1366x768, 1920x1080 e 390x844, abrindo o arquivo final direto do disco.

Parâmetros de URL para ensaio e teste. Sem eles, nada muda:

| Parâmetro | Efeito |
| --- | --- |
| `?pausa=0.5` | Encurta a pausa do Loop para 0,5 s |
| `?no3d` | Usa os visuais sem WebGL |
| `?forcar3d` | Aceita WebGL por software, que normalmente cai no plano B |
| `?q=medio` | Trava a qualidade em `minimo`, `baixo`, `medio` ou `alto` |

## Como funciona o desempenho

Um único contexto WebGL fica fixo atrás da página e só desenha o capítulo que está na tela. A qualidade começa em "médio" e mede o FPS: se cair, reduz resolução, bloom e partículas. Se o computador não tiver aceleração gráfica, ou se nem o nível mínimo sustentar a animação, a página troca sozinha para os visuais aprovados sem WebGL. Com `prefers-reduced-motion`, não há cenas presas, 3D nem contagens: o conteúdo aparece completo e parado.

## O que mudou em cada capítulo

- **Global:** barra de progresso, fundo de partículas em profundidade que reage ao scroll, transições entre capítulos, textos que entram linha por linha, números que contam, brilho no cursor e resposta tátil nos botões.
- **Abertura:** rede neural em WebGL com brilho, pulsos de dopamina e órbita com inércia. Ao rolar, a câmera entra na rede.
- **Dados:** três cartões em profundidade, um por toque. Grade de 100 pessoas com 27 acesas, barras em sequência, comparativo do +2,8 e Fortaleza no mapa do Brasil.
- **Dopamina:** sinapse 3D com vesículas e receptores, esferas Querer e Gostar, e a ilustração do erro de previsão de recompensa.
- **Ciclo do hábito:** anel 3D que gira por etapa, partículas nas setas, contador ilustrativo e a pausa de 10 segundos que quebra o ciclo.
- **Loop:** celular sobe em 3D, anel de contagem maior e demonstração automática (tecla D), que não grava nada.
- **Conclusão:** aprendizados em profundidade, frase final animada e próximos passos em linha do tempo.
- **Referências:** selo de revisado por pares, copiar citação, link do DOI e painel de defesa das fontes (tecla R).

## Decisões e limites conhecidos

- **60 fps não foi medido em máquina real.** Os testes rodaram sem GPU, com WebGL por software. Neles a queda de qualidade e o plano B funcionaram, mas o desempenho real precisa de um ensaio no computador e no projetor da escola.
- **O nível "alto" (mais nítido) não foi visto:** o renderizador de software nunca sustenta FPS para chegar nele.
- **Só testado no Microsoft Edge** (mesmo motor do Chrome). Firefox e Safari não foram testados.
- **O controle remoto foi simulado** pelas teclas PageDown e PageUp. Vale um ensaio com o aparelho.
- **Barra do +2,8:** os artigos citados na página não trazem aqui os valores absolutos de 2018 e 2022. Como a regra proíbe inventar números, só o aumento está em escala, com a base cortada e explicada na legenda.
- **Contraste:** o texto sobre o fundo 3D foi avaliado pelas cores do tema, porque a ferramenta automática não mede texto sobre WebGL.
- **Contador de repetições do ciclo:** é ilustrativo e está identificado assim na tela.
- **Clique perdido corrigido:** a versão aprovada podia perder um toque enquanto o celular se endireitava. Agora o toque sempre vale para o botão pressionado, sem mudar o fluxo.
- **Nomes:** os apresentadores 2 e 3 continuam com os nomes provisórios até serem editados na página.

## Fontes

Só entram artigos científicos revisados por pares. A lista fica em `src/index.html`, cada artigo com a linha "Por que é artigo científico", e o painel da tecla R é montado a partir dela. O contorno do Brasil no capítulo Dados vem do Natural Earth (domínio público) e é só um desenho, não uma fonte de dados.
