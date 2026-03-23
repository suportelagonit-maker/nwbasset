'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

type PatrimonioBarcodeProps = {
  value: string;
  className?: string;
  height?: number;
  width?: number;
  displayValue?: boolean;
};

export default function PatrimonioBarcode({
  value,
  className,
  height = 44,
  width = 1.55,
  displayValue = false,
}: PatrimonioBarcodeProps) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || !value) {
      return;
    }

    JsBarcode(ref.current, value, {
      format: 'CODE128',
      lineColor: '#101828',
      width,
      height,
      margin: 0,
      background: 'transparent',
      displayValue,
      fontOptions: 'bold',
      fontSize: 12,
      textMargin: 4,
    });
  }, [displayValue, height, value, width]);

  return <svg ref={ref} className={className} aria-label="Código de barras patrimonial" />;
}
