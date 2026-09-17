'use client';

import type { TermoAceite } from '@/lib/termo-uso';

/**
 * Carimbo do aceite eletrônico no estilo de um carimbo de borracha: selo
 * circular com o texto acompanhando o anel e a data no centro, mais um
 * carimbo retangular inclinado com o nome do usuário, hora, versão e IP.
 * Desenhado em SVG com traço limpo, para ficar nítido em qualquer tamanho
 * (tela, impressão e PDF).
 */

const TINTA = '#15803d';
const FONTE = "'Courier New', Courier, 'Liberation Mono', monospace";

function partesDataHora(value: string | null | undefined) {
  if (!value) {
    return { data: '--.--.----', hora: '--:--:--' };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { data: value, hora: '' };
  }
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return { data: `${dd}.${mm}.${yyyy}`, hora };
}

function normalizarNome(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export default function CarimboAceite({ aceite, largura = 300 }: { aceite: TermoAceite; largura?: number }) {
  const { data, hora } = partesDataHora(aceite.aceito_em);
  const nome = normalizarNome(aceite.nome_usuario);
  // O nome precisa caber na etiqueta retangular: reduz a fonte conforme o tamanho.
  const fonteNome = Math.max(6.5, Math.min(12.5, (148 / Math.max(nome.length, 1) - 1.1) / 0.62));
  const linhaIp = aceite.ip ? `IP ${aceite.ip}` : 'ACEITE ELETRONICO';
  const rotulo = `Aceito eletronicamente por ${aceite.nome_usuario} em ${data} às ${hora}, versão ${aceite.versao}`;

  return (
    <svg
      viewBox="0 0 330 222"
      width={largura}
      height={(largura * 222) / 330}
      role="img"
      aria-label={rotulo}
      className="termo-carimbo select-none"
      style={{ mixBlendMode: 'multiply' }}
    >
      <defs>
        {/* Arco superior (sentido horário) e inferior (anti-horário) para o texto ficar sempre legível. */}
        <path id="carimbo-arco-topo" d="M 34 105 A 71 71 0 1 1 176 105" />
        <path id="carimbo-arco-base" d="M 30 105 A 75 75 0 0 0 180 105" />
      </defs>

      {/* Selo circular */}
      <g fill="none" stroke={TINTA} transform="rotate(-8 105 105)">
        <circle cx="105" cy="105" r="88" strokeWidth="3" />
        <circle cx="105" cy="105" r="83" strokeWidth="1.2" />
        <circle cx="105" cy="105" r="58" strokeWidth="1.2" />
      </g>
      <g fill={TINTA} fontFamily={FONTE} fontWeight="700" transform="rotate(-8 105 105)">
        <text fontSize="10.5" letterSpacing="1.6" textAnchor="middle">
          <textPath href="#carimbo-arco-topo" startOffset="50%">ACEITO ELETRONICAMENTE</textPath>
        </text>
        <text fontSize="8" letterSpacing="1.1" textAnchor="middle">
          <textPath href="#carimbo-arco-base" startOffset="50%">NWB ASSET · TERMO DE USO E LGPD</textPath>
        </text>
        <text x="105" y="88" fontSize="9" letterSpacing="2" textAnchor="middle">✓ ACEITO</text>
        <text x="105" y="113" fontSize="17.5" letterSpacing="0.8" textAnchor="middle">{data}</text>
        <text x="105" y="133" fontSize="11" letterSpacing="1.5" textAnchor="middle">{hora}</text>
        <text x="105" y="149" fontSize="7.5" letterSpacing="1.8" textAnchor="middle">VERSAO {aceite.versao}</text>
      </g>
      {/* Estrelas separadoras nas laterais do anel, como nos carimbos postais */}
      <g fill={TINTA} fontFamily={FONTE} fontSize="12" fontWeight="700" transform="rotate(-8 105 105)">
        <text x="24" y="109" textAnchor="middle">★</text>
        <text x="186" y="109" textAnchor="middle">★</text>
      </g>

      {/* Etiqueta retangular inclinada */}
      <g transform="rotate(-12 240 158)">
        <rect x="154" y="124" width="172" height="68" rx="9" fill="none" stroke={TINTA} strokeWidth="2.6" />
        <rect x="159" y="129" width="162" height="58" rx="6" fill="none" stroke={TINTA} strokeWidth="1" />
        <g fill={TINTA} fontFamily={FONTE} fontWeight="700" textAnchor="middle">
          <text x="240" y="150" fontSize={fonteNome} letterSpacing="1.1">{nome}</text>
          <line x1="170" y1="157" x2="310" y2="157" stroke={TINTA} strokeWidth="1" />
          <text x="240" y="170" fontSize="10.5" letterSpacing="1.4">{data} · {hora}</text>
          <text x="240" y="181" fontSize="7.5" letterSpacing="1.2">{linhaIp}</text>
        </g>
      </g>
    </svg>
  );
}
