// Confere se o kit foi descompactado inteiro: cada arquivo do .zip precisa existir na pasta
// com o mesmo tamanho. Usado pelo apresentacao.bat (uma extração interrompida, ou um antivírus
// travando arquivos, deixa arquivos vazios ou pela metade e o Expo quebra com erros estranhos).
//
//   node verificar-kit.js <gestor-vendas.zip> <pasta onde foi descompactado>
//
// Sai com código 0 se está tudo certo e 1 se falta algo.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const [zip, pasta] = process.argv.slice(2);
const tar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');

// Linha do "tar -tv": "-rw-rw-rw-  0 0      0    1197 nov 05 11:05 app/mobile/...".
const LINHA = /^(\S)\S*\s+\d+\s+\S+\s+\S+\s+(\d+)\s+\S+\s+\d+\s+\S+\s(.*)$/;

let listagem;
try {
  listagem = execFileSync(tar, ['-tvf', zip], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
} catch {
  console.log(`Nao consegui ler ${zip}.`);
  process.exit(1);
}

let conferidos = 0;
const problemas = [];
for (const linha of listagem.split(/\r?\n/)) {
  const m = LINHA.exec(linha);
  if (!m || m[1] !== '-') continue; // só arquivos (pula pastas)
  const [, , tamanho, nome] = m;
  conferidos++;
  let real;
  try {
    real = fs.statSync(path.join(pasta, nome)).size;
  } catch {
    problemas.push(`faltando: ${nome}`);
    continue;
  }
  if (real !== Number(tamanho)) problemas.push(`incompleto: ${nome}`);
}

if (conferidos === 0) {
  console.log(`Nao consegui ler a lista de arquivos de ${zip}.`);
  process.exit(1);
}
if (problemas.length > 0) {
  console.log(`${problemas.length} arquivo(s) com problema, por exemplo:`);
  console.log(problemas.slice(0, 5).map((p) => `  ${p}`).join('\n'));
  process.exit(1);
}
console.log(`      ${conferidos} arquivos conferidos.`);
