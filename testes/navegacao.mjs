/* Navegacao da tela de resultados, no navegador de verdade.
 *
 *   node testes/navegacao.mjs
 *
 * Precisa de node e playwright (npm i playwright). O contratos.py nao
 * precisa de nada; este aqui existe porque as regras de historico so
 * aparecem num navegador: hash, botao voltar do aparelho e link direto.
 */
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const PAG = pathToFileURL(join(RAIZ, 'index.html')).href;
const CHROME = process.env.CHROME_BIN || undefined;

const b = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const erros = [];
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', e => erros.push('pageerror: ' + e.message));
p.on('console', m => {
  /* aline.jpg / antes.jpg nao existem de proposito: a pagina cai nos
     gradientes. Qualquer OUTRO erro de console conta como falha. */
  if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text())) erros.push('console: ' + m.text());
});

/* goto para uma URL que so muda o hash NAO recarrega a pagina: sem o
   about:blank no meio, o estado da navegacao anterior sobra e o teste
   mede outra coisa */
const carregar = async hash => {
  await p.goto('about:blank');
  await p.goto(PAG + hash);
  await p.waitForTimeout(2200);
};

const estado = () => p.evaluate(() => {
  const vis = el => !el.hasAttribute('hidden');
  const ind = document.getElementById('pastas'), li = document.getElementById('lista');
  return {
    hash: location.hash,
    tela: vis(document.getElementById('resultados')) ? (vis(ind) ? 'índice' : 'pasta') : 'home',
    pastas: vis(ind) ? [...ind.querySelectorAll('.nome')].map(e => e.textContent) : [],
    contas: vis(ind) ? [...ind.querySelectorAll('.conta')].map(e => e.textContent) : [],
    fotos: vis(li) ? li.querySelectorAll('img').length : 0,
    titulo: document.querySelector('.res-titulo b').textContent,
  };
});
const checa = async (rotulo, esperado) => {
  const real = await estado();
  const sub = Object.fromEntries(Object.keys(esperado).map(k => [k, real[k]]));
  const ok = JSON.stringify(sub) === JSON.stringify(esperado);
  if (!ok) erros.push(`${rotulo}:\n     obtido   ${JSON.stringify(sub)}\n     esperado ${JSON.stringify(esperado)}`);
  console.log(` ${ok ? 'ok' : 'XX'}  ${rotulo}`);
};

/* O esperado sai do proprio index.html, para o teste nao envelhecer a
   cada foto nova. Leio do arquivo, nao da pagina: o script dela roda
   dentro de uma IIFE, entao PASTAS e TRABALHOS nao sao globais — e
   bom que nao sejam. */
const fonte = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const bloco = re => (fonte.match(re) || ['', ''])[1];
const PASTAS = [...bloco(/var PASTAS = \[([\s\S]*?)\n  \];/)
    .matchAll(/\{\s*id:\s*'([^']*)'\s*,\s*nome:\s*"([^"]*)"/g)]
  .map(m => ({ id: m[1], nome: m[2] }))
  .map(x => {
    const n = [...bloco(/var TRABALHOS = \[([\s\S]*?)\n  \];/)
                 .matchAll(/pasta: '([^']*)'/g)].filter(m => m[1] === x.id).length;
    return { ...x, n, conta: n + (n > 1 ? ' fotos' : ' foto') };
  })
  .filter(x => x.n);                 /* pasta vazia nao aparece */
const P1 = PASTAS[0].id;
await carregar('');
const P = PASTAS.find(x => x.id === P1);
const INDICE = { tela:'índice', pastas:PASTAS.map(x=>x.nome), contas:PASTAS.map(x=>x.conta), titulo:'Nossos resultados' };
const DENTRO = { tela:'pasta', fotos:P.n, titulo:P.nome };
console.log(`pastas com foto: ${PASTAS.map(x=>x.nome+' ('+x.conta+')').join(', ')}\n`);

console.log('── pela home ──');
await checa('home fechada', { tela:'home' });
await p.click('.chamada'); await p.waitForTimeout(700);
await checa('índice', { hash:'#resultados', ...INDICE });
await p.click('.res-pasta a'); await p.waitForTimeout(700);
await checa('abre a pasta', { hash:'#resultados-'+P1, ...DENTRO });
await p.click('#btVoltar'); await p.waitForTimeout(700);
await checa('voltar do site -> índice', { hash:'#resultados', ...INDICE });
await p.click('#btVoltar'); await p.waitForTimeout(700);
await checa('voltar do site -> home', { tela:'home' });

console.log('\n── botão voltar do aparelho ──');
await p.click('.chamada'); await p.waitForTimeout(600);
await p.click('.res-pasta a'); await p.waitForTimeout(600);
await p.goBack(); await p.waitForTimeout(700);
await checa('voltar -> índice', { hash:'#resultados', ...INDICE });
await p.goBack(); await p.waitForTimeout(700);
await checa('voltar -> home', { tela:'home' });

console.log('\n── cada pasta abre a sua ──');
for (const x of PASTAS) {
  await carregar('#resultados-' + x.id);
  await checa(`${x.nome}: ${x.conta}`, { hash:'#resultados-'+x.id, tela:'pasta', fotos:x.n, titulo:x.nome });
}

console.log('\n── link direto (carga limpa, nenhum passo meu) ──');
await carregar('#resultados-' + P1);
await p.click('#btVoltar'); await p.waitForTimeout(700);
await checa('voltar -> índice, sem sair do site', { hash:'#resultados', ...INDICE });

await carregar('#resultados-naoexiste');
await checa('pasta inexistente cai no índice', { tela:'índice', ...INDICE });

await b.close();
console.log('\n' + (erros.length ? '✗ ' + erros.join('\n  ') : '✓ navegação correta'));
process.exit(erros.length ? 1 : 0);
