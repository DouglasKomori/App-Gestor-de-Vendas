import { networkInterfaces } from 'node:os';

import { app } from './app';
import { env } from './env';

/** Endereços IPv4 da máquina na rede local, para configurar o app no celular. */
function enderecosDaRedeLocal(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((rede) => rede !== undefined && rede.family === 'IPv4' && !rede.internal)
    .map((rede) => rede!.address);
}

app.listen(env.PORT, env.HOST, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
  console.log('Para o celular, use o endereço do seu Wi-Fi (normalmente 192.168.x.x ou 10.x.x.x):');
  for (const ip of enderecosDaRedeLocal()) {
    console.log(`  http://${ip}:${env.PORT}`);
  }
});
