/* O editor, no navegador de verdade.
 *
 *   node testes/editor.mjs
 *
 * O editor le a pagina por expressao regular e a reescreve inteira na
 * exportacao. Quando ele deixa de entender um campo, nada estoura: o
 * campo abre vazio e a exportacao seguinte apaga o que havia. Por isso
 * o teste aqui e sempre de IDA E VOLTA — exporta, reabre a partir do
 * exportado, confere que sobreviveu.
 */
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const MOLDE = readFileSync(join(RAIZ, 'editor.molde.html'), 'utf8');
const MARCA = '/*__PAGINA_EM_BASE64__*/';
const TMP = join(mkdtempSync(join(tmpdir(), 'ed-')), 'editor.html');
const CHROME = process.env.CHROME_BIN || undefined;

const b = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const erros = [];
const checa = (r, real, esp) => {
  const ok = JSON.stringify(real) === JSON.stringify(esp);
  if (!ok) erros.push(`${r}:\n     obtido   ${JSON.stringify(real)}\n     esperado ${JSON.stringify(esp)}`);
  console.log(` ${ok ? 'ok' : 'XX'}  ${r}`);
};

/* monta um editor em volta da pagina dada e abre */
const abrir = async pagina => {
  writeFileSync(TMP, MOLDE.replace(MARCA, JSON.stringify(Buffer.from(pagina, 'utf8').toString('base64'))));
  const p = await b.newPage({ viewport: { width: 1180, height: 1100 } });
  p.on('pageerror', e => erros.push('pageerror: ' + e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text())) erros.push('console: ' + m.text());
  });
  await p.goto(pathToFileURL(TMP).href);
  await p.waitForTimeout(2500);
  return p;
};
const ler = p => p.evaluate(() => ({
  nome: estado.textos.nome, lema: estado.textos.lema, maps: estado.links.maps,
  pastas: estado.pastas.map(x => x.id + '=' + x.nome),
  porFoto: estado.obras.map(o => o.pasta),
}));

let pagina = readFileSync(join(RAIZ, 'index.html'), 'utf8');

console.log('── o editor abre preenchido ──');
let p = await abrir(pagina);
let v = await ler(p);
checa('lê as pastas do arquivo', v.pastas.length > 0, true);
checa('toda foto tem pasta', v.porFoto.every(Boolean), true);
const sel = p.frameLocator('#tela').locator('.ed-pasta');
checa('um seletor de pasta por miniatura', await sel.count(), v.porFoto.length);
checa('o seletor lista todas as pastas',
      (await sel.first().locator('option').count()), v.pastas.length);
checa('painel de pastas montado',
      await p.locator('#listaPastas .pasta-linha').count(), v.pastas.length);

/* valores desenhados para quebrar escape. O "</" + "script>" e o caso
   que derruba a pagina inteira se JSON.stringify passar o "<" cru. */
const ALVO = {
  nome: 'Ana & Cia "Estética" <Premium>',
  lema: 'Pele & alma',
  maps: 'https://maps.app.goo.gl/x?a=1&b=2&c=3',
  titulo: 'verruga </' + 'script> & cia',
};
const ultima = v.porFoto.length - 1;
const outraPasta = v.pastas.length > 1 ? v.pastas[1].split('=')[0] : v.pastas[0].split('=')[0];
const nomeNovo = 'Pasta & "renomeada" <x>';

console.log('\n── escreve valores difíceis ──');
await p.evaluate(a => {
  estado.textos.nome = a.nome; estado.textos.lema = a.lema;
  estado.links.maps = a.maps;
  estado.obras[estado.obras.length - 1].titulo = a.titulo;
  agendar();
}, ALVO);
await p.waitForTimeout(900);
await sel.nth(ultima).selectOption(outraPasta);
await p.waitForTimeout(900);
await p.locator('#listaPastas input').last().fill(nomeNovo);
await p.waitForTimeout(1000);
pagina = await p.evaluate(() => feito.home);
await p.close();

console.log('\n── ida e volta ──');
for (const volta of [2, 3]) {
  p = await abrir(pagina);
  v = await ler(p);
  checa(`volta ${volta}: textos`, [v.nome, v.lema, v.maps], [ALVO.nome, ALVO.lema, ALVO.maps]);
  checa(`volta ${volta}: pasta trocada`, v.porFoto[ultima], outraPasta);
  checa(`volta ${volta}: nome da pasta`, v.pastas[v.pastas.length - 1].split('=').slice(1).join('='), nomeNovo);
  checa(`volta ${volta}: id intacto no rename`, v.pastas[v.pastas.length - 1].split('=')[0],
        v.pastas[v.pastas.length - 1].split('=')[0]);
  pagina = await p.evaluate(() => feito.home);
  await p.close();
}

console.log('\n── a página exportada continua de pé ──');
const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
const quebras = [];
pg.on('pageerror', e => quebras.push(e.message));
await pg.setContent(pagina);
await pg.waitForTimeout(1500);
checa('nenhum erro de script na página', quebras, []);
await pg.evaluate(() => { location.hash = '#resultados'; });
await pg.waitForTimeout(900);
checa('o índice de pastas monta',
      (await pg.locator('.res-pasta').count()) > 0, true);
checa('o href do Maps volta ao original',
      await pg.locator('#btMaps').getAttribute('href'), ALVO.maps);
checa('o h1 volta ao original', await pg.locator('h1').textContent(), ALVO.nome);

await b.close();
console.log('\n' + (erros.length ? '✗ ' + erros.join('\n  ') : '✓ editor preserva tudo na ida e volta'));
process.exit(erros.length ? 1 : 0);
