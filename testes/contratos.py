#!/usr/bin/env python3
"""Confere que a pagina nova honra TODOS os contratos que o editor assume.

O editor le e reescreve a pagina por expressao regular. Se qualquer uma
destas falhar, o editor abre vazio ou a exportacao apaga conteudo — e
sem barulho nenhum, que e o pior jeito de descobrir.
"""
import re, sys, pathlib

AQUI = pathlib.Path(__file__).resolve().parent.parent
h = (AQUI / "index.html").read_text(encoding="utf-8")
erros, ok = [], 0

def le(nome, padrao, esperado=None):
    """lerModelo: precisa CASAR e, quando dito, devolver o valor certo."""
    global ok
    m = re.search(padrao, h)
    if not m:
        erros.append(f"LER  {nome}: nao casou")
        return
    v = m.group(1)
    if esperado is not None and v.strip() != esperado:
        erros.append(f"LER  {nome}: leu {v.strip()!r}, esperava {esperado!r}")
        return
    ok += 1
    print(f"  ok  ler  {nome:<12} -> {v.strip()[:52]!r}")

def escreve(nome, padrao, vezes=1):
    """gerarHome: precisa casar exatamente o numero esperado de vezes."""
    global ok
    n = len(re.findall(padrao, h))
    if n != vezes:
        erros.append(f"ESCR {nome}: casou {n}x, esperava {vezes}x")
        return
    ok += 1
    print(f"  ok  escr {nome}")

print("── lerModelo ──")
le("nome",    r"<h1>([^<]*)</h1>", "Aline Ceccotti")
le("funcao",  r'<p class="funcao">\s*<span class="fio"></span>([^<]*)<span', "Estética Facial Avançada")
le("lema",    r'<p class="lema">([^<]*)</p>', "Beleza com ciência")
le("numero",  r'<span class="num">([^<]*)</span>', "+___")
le("legenda", r'<span class="txt">([^<]*)</span>', "atendimentos realizados")
le("rodape",  r'<p class="rodape entra" style="--d:800">([^<]*)', "Cuidar da pele é cuidar de você.")
le("chamada", r'<a class="titulo chamada"[^>]*>\s*([^<]*)', "Clique e veja nossos resultados")
le("selo",    r"</svg>([^<]*)</p>", "Protocolos personalizados")
le("zap",     r'id="btZap"\s+href="https://wa\.me/(\d+)', "5543999999999")
le("msg",     r'id="btZap"\s+href="https://wa\.me/\d+\?text=([^"]*)"')
le("insta",   r'id="btInsta"\s+href="https://www\.instagram\.com/([^/"]*)', "alinececcotti")
le("maps",    r'id="btMaps"\s+href="([^"]*)"')
le("pixel",   r"var PIXEL_META = '([^']*)'", "")
le("trabalhos", r"var TRABALHOS = \[([\s\S]*?)\n  \];")

print("\n── gerarHome ──")
escreve("--retrato (literal)", re.escape("--retrato: url('aline.jpg');"))
escreve("fAntes",  r'(id="fAntes"\s+src=")[^"]*')
escreve("fDepois", r'(id="fDepois"\s+src=")[^"]*')
escreve("TRABALHOS", r"var TRABALHOS = \[[\s\S]*?\n  \];")
for bid in ("btZap", "btMaps", "btInsta"):
    escreve(f"porId({bid})", r'(id="' + bid + r'"\s+href=")[^"]*')
escreve("PIXEL_META", r"(\n  var PIXEL_META = ')[^']*")
escreve("h1",      r"<h1>[^<]*</h1>")
escreve("funcao",  r'(<p class="funcao">\s*<span class="fio"></span>)[^<]*(<span)')
escreve("lema",    r'<p class="lema">[^<]*</p>')
escreve("num",     r'<span class="num">[^<]*</span>')
escreve("txt",     r'<span class="txt">[^<]*</span>')
escreve("rodape",  r'(<p class="rodape entra" style="--d:800">)[^<]*')
escreve("chamada", r'(<a class="titulo chamada"[^>]*>\n\s*)[^<]*')
escreve("title",   r"<title>[^<]*</title>")

# o selo e ancorado no PRIMEIRO </svg>...</p> do arquivo: se um <svg>
# dentro de outro <p> aparecer antes, o editor escreve no lugar errado
m = re.search(r"</svg>([^<]*)</p>", h)
if m and m.group(1).strip() != "Protocolos personalizados":
    erros.append(f"ESCR selo: o 1o </svg>...</p> e {m.group(1).strip()!r}, nao o selo")
else:
    ok += 1
    print("  ok  escr selo (ancora e o primeiro </svg>...</p>)")

print("\n── alvos de clique (querySelector do editor) ──")
for sel in ("#retrato", ".ba", ".selo", "h1", ".funcao", ".lema",
            ".legenda .num", ".legenda .txt", ".rodape", ".chamada", "#grade"):
    alvo = {"#retrato": 'id="retrato"', "#grade": 'id="grade"',
            ".ba": 'id="ba"'}.get(sel, sel.split()[-1].lstrip("."))
    presente = (alvo in h) if alvo.startswith("id=") else (
        f'class="{alvo}' in h or f' {alvo}"' in h or f' {alvo} ' in h or f"<{alvo}>" in h)
    if presente:
        ok += 1; print(f"  ok  alvo {sel}")
    else:
        erros.append(f"ALVO {sel}: nao achei no HTML")

print("\n── higiene ──")
for proibido in ("Franciele", "franciele", "data:image/webp", "data:image/jpeg",
                 "--ouro", "#d9b86e", "217,184,110"):
    if proibido in h:
        erros.append(f"HIG  sobrou {proibido!r} na pagina")
    else:
        ok += 1; print(f"  ok  sem {proibido!r}")

print()
if erros:
    print(f"✗ {len(erros)} FALHA(S), {ok} ok:")
    for e in erros: print("   -", e)
    sys.exit(1)
print(f"✓ {ok}/{ok} contratos honrados")
