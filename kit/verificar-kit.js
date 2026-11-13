// Confere se o kit foi descompactado inteiro e sem estragos: cada arquivo do .zip precisa
// existir na pasta com o mesmo conteúdo (CRC-32 gravado no próprio .zip). Os arquivos com
// problema são extraídos de novo direto do .zip, sem depender do tar.
//
//   node verificar-kit.js <gestor-vendas.zip> <pasta onde foi descompactado>
//
// Códigos de saída: 0 = tudo certo (ou consertado), 1 = não deu para consertar,
// 2 = o próprio .zip está estragado (precisa baixar de novo).
//
// Motivo: na faculdade, arquivos da node_modules ficaram com lixo no meio, mas com o tamanho
// certo, e o Expo quebrava com erros como "Invalid package config" ou "SyntaxError".

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const [zipPath, pasta] = process.argv.slice(2);

/** Lê o diretório central do .zip: nome, CRC, tamanhos e posição de cada arquivo. */
function lerEntradas(fd, tamanhoZip) {
  // Fim do diretório central (EOCD): fica nos últimos 64 KB do arquivo.
  const fimLen = Math.min(tamanhoZip, 65557);
  const fim = Buffer.alloc(fimLen);
  fs.readSync(fd, fim, 0, fimLen, tamanhoZip - fimLen);
  const eocd = fim.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('fim do zip não encontrado');

  let total = fim.readUInt16LE(eocd + 10);
  let cdTamanho = fim.readUInt32LE(eocd + 12);
  let cdInicio = fim.readUInt32LE(eocd + 16);

  // Zip64: os valores reais ficam no registro "zip64 end of central directory".
  if (total === 0xffff || cdTamanho === 0xffffffff || cdInicio === 0xffffffff) {
    const loc = eocd - 20;
    if (loc < 0 || fim.readUInt32LE(loc) !== 0x07064b50) throw new Error('zip64 sem localizador');
    const z64pos = Number(fim.readBigUInt64LE(loc + 8));
    const z64 = Buffer.alloc(56);
    fs.readSync(fd, z64, 0, 56, z64pos);
    total = Number(z64.readBigUInt64LE(32));
    cdTamanho = Number(z64.readBigUInt64LE(40));
    cdInicio = Number(z64.readBigUInt64LE(48));
  }

  const cd = Buffer.alloc(cdTamanho);
  fs.readSync(fd, cd, 0, cdTamanho, cdInicio);

  const entradas = [];
  let p = 0;
  for (let i = 0; i < total; i++) {
    if (cd.readUInt32LE(p) !== 0x02014b50) throw new Error('diretório central inválido');
    const metodo = cd.readUInt16LE(p + 10);
    const crc = cd.readUInt32LE(p + 16);
    let comprimido = cd.readUInt32LE(p + 20);
    let tamanho = cd.readUInt32LE(p + 24);
    const nomeLen = cd.readUInt16LE(p + 28);
    const extraLen = cd.readUInt16LE(p + 30);
    const comentLen = cd.readUInt16LE(p + 32);
    let local = cd.readUInt32LE(p + 42);
    const nome = cd.toString('utf8', p + 46, p + 46 + nomeLen);

    // Campo extra zip64 (id 0x0001): traz os valores que não couberam em 32 bits, nesta ordem.
    let e = p + 46 + nomeLen;
    const fimExtra = e + extraLen;
    while (e + 4 <= fimExtra) {
      const id = cd.readUInt16LE(e);
      const len = cd.readUInt16LE(e + 2);
      if (id === 0x0001) {
        let q = e + 4;
        if (tamanho === 0xffffffff) { tamanho = Number(cd.readBigUInt64LE(q)); q += 8; }
        if (comprimido === 0xffffffff) { comprimido = Number(cd.readBigUInt64LE(q)); q += 8; }
        if (local === 0xffffffff) { local = Number(cd.readBigUInt64LE(q)); q += 8; }
      }
      e += 4 + len;
    }

    if (!nome.endsWith('/')) entradas.push({ nome, metodo, crc, comprimido, tamanho, local });
    p += 46 + nomeLen + extraLen + comentLen;
  }
  return entradas;
}

/** Descompacta uma entrada direto do .zip. Devolve null se o próprio .zip estiver estragado. */
function extrairEntrada(fd, entrada) {
  const cab = Buffer.alloc(30);
  fs.readSync(fd, cab, 0, 30, entrada.local);
  if (cab.readUInt32LE(0) !== 0x04034b50) return null;
  const inicio = entrada.local + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28);
  const dados = Buffer.alloc(entrada.comprimido);
  fs.readSync(fd, dados, 0, entrada.comprimido, inicio);
  let conteudo;
  try {
    conteudo = entrada.metodo === 0 ? dados : zlib.inflateRawSync(dados);
  } catch {
    return null;
  }
  return zlib.crc32(conteudo) === entrada.crc ? conteudo : null;
}

function conferir(entrada) {
  try {
    const conteudo = fs.readFileSync(path.join(pasta, entrada.nome));
    return conteudo.length === entrada.tamanho && zlib.crc32(conteudo) === entrada.crc;
  } catch {
    return false;
  }
}

let fd;
try {
  fd = fs.openSync(zipPath, 'r');
} catch {
  console.log(`Nao consegui abrir ${zipPath}.`);
  process.exit(2);
}

let entradas;
try {
  entradas = lerEntradas(fd, fs.fstatSync(fd).size);
} catch (erro) {
  console.log(`O arquivo ${zipPath} esta estragado (${erro.message}).`);
  process.exit(2);
}

// Na primeira vez o antivírus do Windows examina cada arquivo lido, e isso leva alguns minutos.
const ruins = [];
entradas.forEach((entrada, i) => {
  if (!conferir(entrada)) ruins.push(entrada);
  if (i % 500 === 0 || i === entradas.length - 1) {
    process.stdout.write(`\r      Conferindo arquivos: ${Math.round(((i + 1) / entradas.length) * 100)}%   `);
  }
});
process.stdout.write('\n');
if (ruins.length === 0) {
  console.log(`      ${entradas.length} arquivos conferidos, todos inteiros.`);
  process.exit(0);
}

console.log(`      ${ruins.length} arquivo(s) estragado(s), por exemplo ${ruins[0].nome}. Consertando...`);
for (const entrada of ruins) {
  const conteudo = extrairEntrada(fd, entrada);
  if (conteudo === null) {
    console.log(`O proprio .zip esta estragado em ${entrada.nome}.`);
    process.exit(2);
  }
  const destino = path.join(pasta, entrada.nome);
  try {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, conteudo);
  } catch (erro) {
    console.log(`Nao consegui gravar ${entrada.nome}: ${erro.message}`);
    process.exit(1);
  }
}

// Confere de novo: se o arquivo estraga logo depois de gravado, é algo neste PC (ex.: antivírus).
const aindaRuins = ruins.filter((entrada) => !conferir(entrada));
if (aindaRuins.length > 0) {
  console.log(`${aindaRuins.length} arquivo(s) continuam estragados depois de gravados de novo,`);
  console.log(`por exemplo ${aindaRuins[0].nome}. Algo neste PC esta alterando os arquivos.`);
  process.exit(1);
}
console.log(`      ${ruins.length} arquivo(s) consertado(s).`);
