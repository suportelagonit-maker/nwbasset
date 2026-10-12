'use client';

import { useState } from 'react';

import CiapBem from '@/components/CiapBem';
import EventosValorBem from '@/components/EventosValorBem';
import MemoriaCalculoDepreciacao from '@/components/MemoriaCalculoDepreciacao';

/**
 * Junta a memória de cálculo e os eventos de valor do bem. Quando um evento
 * é registrado ou removido, a memória recalcula (remonta pela key).
 */
export default function BemDepreciacaoView({ bemId }: { bemId: number }) {
  const [versao, setVersao] = useState(0);

  return (
    <div className="grid gap-5">
      <MemoriaCalculoDepreciacao key={versao} bemId={bemId} />
      <EventosValorBem bemId={bemId} onMudou={() => setVersao((v) => v + 1)} />
      <CiapBem bemId={bemId} />
    </div>
  );
}
