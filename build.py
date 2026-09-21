#!/usr/bin/env python3
"""
Regera o editor.html a partir do index.html.

O editor carrega a pagina inteira embutida em base64. Sempre que o
index.html mudar, rode isto para o editor voltar a abrir preenchido:

    python3 build.py

Sem isso o editor continua mostrando a versao antiga da pagina.
"""
import base64
import pathlib
import re
import sys

AQUI = pathlib.Path(__file__).resolve().parent
PAGINA = AQUI / "index.html"
EDITOR = AQUI / "editor.html"
MOLDE = AQUI / "editor.molde.html"

MARCA = "/*__PAGINA_EM_BASE64__*/"


def main() -> int:
    if not PAGINA.exists():
        print(f"nao achei {PAGINA.name}", file=sys.stderr)
        return 1
    if not MOLDE.exists():
        print(f"nao achei {MOLDE.name}", file=sys.stderr)
        return 1

    pagina = PAGINA.read_text(encoding="utf-8")
    molde = MOLDE.read_text(encoding="utf-8")

    if MARCA not in molde:
        print(f"o molde perdeu a marca {MARCA}", file=sys.stderr)
        return 1

    b64 = base64.b64encode(pagina.encode("utf-8")).decode("ascii")
    saida = molde.replace(MARCA, f'"{b64}"')
    EDITOR.write_text(saida, encoding="utf-8")

    kb = len(saida.encode("utf-8")) / 1024
    print(f"editor.html gerado — {kb:,.0f} KB "
          f"(pagina: {len(pagina.encode('utf-8')) / 1024:,.0f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
