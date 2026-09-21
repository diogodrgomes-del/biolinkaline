# Aline Ceccotti — Estética Facial Avançada

Landing page de uma tela só, com um editor visual para trocar fotos, textos
e links sem mexer em código.

Derivada da página da Franciele Bill: mesma arquitetura, paleta rosé/nude
sobre carvão. Nenhuma foto do projeto anterior veio junto.

## Os arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | **A página.** É isto que vai para o ar. Vai sozinha: fontes e fotos ficam embutidas, não precisa de mais nada na pasta. |
| `editor.html` | **O editor.** Abra no navegador, clique na própria página para editar, baixe o `index.html` pronto. |
| `editor.molde.html` | O editor *sem* a página embutida. É o que se edita quando o editor em si precisa mudar. |
| `build.py` | Gera `editor.html` = `editor.molde.html` + `index.html` em base64. |
| `testes/contratos.py` | Confere que `index.html` continua legível pelo editor. |

## Publicar

Abra `editor.html`, preencha tudo, clique em **Baixar index.html** e suba
esse arquivo. Só ele.

## Mexer no código

O editor lê e reescreve a página por **expressão regular**, não por DOM. Ele
depende da marcação exata de uns 17 pontos do `index.html` — `<h1>`, o
`<span class="fio">` antes da função, o `];` com dois espaços fechando
`TRABALHOS`, o `\n  var PIXEL_META = '`, e por aí vai.

Quebrar qualquer um deles **não dá erro**: o editor só abre aquele campo
vazio, e a exportação seguinte apaga o conteúdo que não conseguiu ler. Por
isso, depois de editar `index.html` à mão:

```sh
python3 testes/contratos.py   # 49 contratos: leitura, escrita e alvos de clique
python3 build.py              # reembute a página no editor
```

Mudou o `editor.molde.html`? Só `build.py`.

Mudou o `index.html`? **Os dois, nesta ordem.** Sem o `build.py` o editor
continua servindo a versão antiga da página, silenciosamente.

## Trocar a paleta

Tudo vive em `:root`, no topo do `<style>` do `index.html`:

```css
--rose-luz:  #f7ded2;   /* realce            */
--rose:      #e0a88f;   /* metal principal   */
--rose-fund: #a9705a;   /* sombra do metal   */
--folha:     linear-gradient(...);  /* as viradas de brilho */
--escuro:    #1c1a1b;   /* fundo             */
```

O `--folha` é o que faz o rosé parecer metal em vez de rosa chapado — são as
viradas de claro/escuro ao longo do gradiente. Mexer só no `--rose` sem
mexer nele deixa a página com duas identidades.

O texto sobre o metal é `#251b17`. Não clareie: no ponto mais escuro do
gradiente (`#b57a62`) ele já está em 4,75:1, e 4,5:1 é o piso do WCAG AA.

## Falta preencher

A página está no ar com valores de partida em quatro campos. O editor lista
os pendentes embaixo do medidor de tamanho, enquanto sobrar algum:

- **`+___` na legenda** — o número de atendimentos. Inventar métrica de
  cliente não dá, então ficou um marcador que você não consegue ignorar.
- **WhatsApp** — está em `5543999999999`, que é reserva, não o número dela.
- **Instagram** — `@alinececcotti` foi chute a partir do nome; confirme.
- **Google Maps** — está uma busca pelo nome. Se ela tiver ficha no Google
  Meu Negócio, o link curto de lá fica melhor.
- **Fotos** — retrato do topo, antes/depois e galeria, todos vazios.

Fora isso: o `<title>` e a `<meta name="description">` não citam cidade,
porque essa informação não veio. Vale acrescentar — é o que faz a página
aparecer em busca local.

## Contraste

Medido com o alfa composto sobre o fundo real, não sobre a cor pura:

| Elemento | Razão | Piso |
|---|---|---|
| `h1` | 17,3:1 | 3,0 (texto grande) |
| `.funcao`, `.legenda .txt` | 9,5:1 | 4,5 |
| `.chamada`, `.selo` | 13,5:1 | 4,5 |
| `.rodape` | 5,5:1 | 4,5 |
| texto recortado no gradiente | 4,9:1 no pior ponto | 3,0 (texto grande) |
| `.assinatura` | 3,4:1 | — |

A assinatura da agência fica de propósito abaixo do AA: é crédito, não
conteúdo. O original mirava 3,2:1 e esta versão ficou um pouco acima.

## Pixel da Meta

Campo vazio = **nenhuma** chamada externa, a página inteira roda offline.
Com o ID preenchido ela carrega `connect.facebook.net` e passa a mandar
`Contact` no clique do WhatsApp, e dois eventos personalizados em Maps e
Instagram.

Na prévia do editor o pixel fica desligado: editar não pode contar visita.
