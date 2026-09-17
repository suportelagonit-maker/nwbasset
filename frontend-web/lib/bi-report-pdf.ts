/**
 * Geração do PDF do relatório BI patrimonial no navegador.
 *
 * KPIs, alertas e tabelas são desenhados como texto (nítidos e pesquisáveis);
 * os gráficos são capturados do DOM em alta resolução (html-to-image) e
 * inseridos como imagem. As bibliotecas são carregadas sob demanda para não
 * pesar o bundle da tela.
 */

export type BiPdfKpi = { label: string; value: string; hint?: string };

export type BiPdfInsight = { tone: 'good' | 'info' | 'warn' | 'bad'; title: string; text: string };

export type BiPdfChart = { title: string; subtitle?: string; node: HTMLElement | null };

export type BiPdfTable = {
  title: string;
  head: string[];
  body: Array<Array<string | number>>;
  align?: Array<'left' | 'right'>;
  emptyText?: string;
};

export type BiReportPdfInput = {
  empresaNome: string;
  empresaCnpj?: string | null;
  filtros: string[];
  geradoEm: Date;
  kpis: BiPdfKpi[];
  insights: BiPdfInsight[];
  charts: BiPdfChart[];
  tables: BiPdfTable[];
};

type Rgb = [number, number, number];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 14;

const INK: Rgb = [22, 24, 29];
const MUTED: Rgb = [112, 117, 127];
const LINE: Rgb = [226, 228, 233];
const ACCENT: Rgb = [246, 164, 0];
const SOFT: Rgb = [250, 250, 250];

const INSIGHT_COLORS: Record<BiPdfInsight['tone'], { fill: Rgb; badge: Rgb; label: string }> = {
  good: { fill: [236, 253, 243], badge: [34, 197, 94], label: 'EM DIA' },
  info: { fill: [239, 244, 255], badge: [37, 99, 235], label: 'INFORMACAO' },
  warn: { fill: [255, 247, 230], badge: [246, 164, 0], label: 'ATENCAO' },
  bad: { fill: [254, 241, 244], badge: [225, 29, 72], label: 'ACAO NECESSARIA' },
};

async function loadImageDataUrl(src: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const response = await fetch(src, { cache: 'force-cache' });
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error('imagem inválida'));
      image.src = dataUrl;
    });

    return { dataUrl, ...size };
  } catch {
    return null;
  }
}

function formatDateTime(date: Date) {
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export async function generateBiReportPdf(input: BiReportPdfInput): Promise<void> {
  const [{ jsPDF }, { default: autoTable }, { toPng }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('html-to-image'),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  let y = MARGIN;

  const setColor = (rgb: Rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setFill = (rgb: Rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb: Rgb) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

  function ensureSpace(height: number) {
    if (y + height > PAGE_H - FOOTER_H - 4) {
      doc.addPage();
      y = MARGIN;
    }
  }

  // keepWith: altura do primeiro bloco da seção, para o título nunca ficar órfão no fim da página.
  function sectionTitle(title: string, subtitle?: string, keepWith = 20) {
    ensureSpace(14 + keepWith);
    setFill(ACCENT);
    doc.roundedRect(MARGIN, y + 0.8, 1.6, 6.4, 0.8, 0.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    setColor(INK);
    doc.text(title, MARGIN + 4.5, y + 5.6);
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(MUTED);
      doc.text(subtitle, MARGIN + 4.5, y + 10.2);
      y += 14;
    } else {
      y += 10;
    }
  }

  /* ------------------------------ Cabeçalho ------------------------------ */

  setFill(ACCENT);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  const logo = await loadImageDataUrl('/logoasset.png');
  let headerTextX = MARGIN;
  if (logo) {
    const logoH = 11;
    const logoW = (logo.width / logo.height) * logoH;
    doc.addImage(logo.dataUrl, 'PNG', MARGIN, y + 1, logoW, logoH);
    headerTextX = MARGIN + logoW + 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  setColor(INK);
  doc.text('Relatório BI Patrimonial', headerTextX, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  setColor(MUTED);
  doc.text('Painel analítico do patrimônio · NWB Asset', headerTextX, y + 11.5);

  // Bloco da empresa à direita.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  setColor(INK);
  doc.text(input.empresaNome, PAGE_W - MARGIN, y + 5.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(MUTED);
  if (input.empresaCnpj) {
    doc.text(`CNPJ ${input.empresaCnpj}`, PAGE_W - MARGIN, y + 9.8, { align: 'right' });
  }
  doc.text(`Gerado em ${formatDateTime(input.geradoEm)}`, PAGE_W - MARGIN, y + (input.empresaCnpj ? 13.8 : 9.8), { align: 'right' });

  y += 18;
  setDraw(LINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 4;

  // Filtros aplicados.
  setFill(SOFT);
  setDraw(LINE);
  doc.roundedRect(MARGIN, y, CONTENT_W, 9, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setColor(MUTED);
  doc.text('RECORTE', MARGIN + 4, y + 5.6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(INK);
  doc.text(input.filtros.join('   ·   '), MARGIN + 22, y + 5.7);
  y += 15;

  /* -------------------------------- KPIs --------------------------------- */

  sectionTitle('Indicadores-chave', 'Visão consolidada do recorte selecionado');

  const kpiCols = 3;
  const kpiGap = 4;
  const kpiW = (CONTENT_W - kpiGap * (kpiCols - 1)) / kpiCols;
  const kpiH = 19;
  input.kpis.forEach((kpi, index) => {
    const col = index % kpiCols;
    if (col === 0) {
      ensureSpace(kpiH + kpiGap);
    }
    const x = MARGIN + col * (kpiW + kpiGap);

    setFill([255, 255, 255]);
    setDraw(LINE);
    doc.roundedRect(x, y, kpiW, kpiH, 2.5, 2.5, 'FD');
    setFill(ACCENT);
    doc.roundedRect(x, y + 4, 1.2, kpiH - 8, 0.6, 0.6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setColor(MUTED);
    doc.text(kpi.label.toUpperCase(), x + 4.5, y + 5.5);
    doc.setFontSize(14);
    setColor(INK);
    doc.text(kpi.value, x + 4.5, y + 12.2);
    if (kpi.hint) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setColor(MUTED);
      doc.text(kpi.hint, x + 4.5, y + 16.4);
    }

    if (col === kpiCols - 1 || index === input.kpis.length - 1) {
      y += kpiH + kpiGap;
    }
  });
  y += 2;

  /* ------------------------------ Insights ------------------------------- */

  sectionTitle('Alertas e recomendações', 'Leitura automática dos indicadores para apoiar a tomada de decisão');

  doc.setFontSize(8.5);
  input.insights.forEach((insight) => {
    const colors = INSIGHT_COLORS[insight.tone];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const textLines = doc.splitTextToSize(insight.text, CONTENT_W - 10) as string[];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const titleLines = doc.splitTextToSize(insight.title, CONTENT_W - 10) as string[];
    const boxH = 9 + titleLines.length * 4.4 + textLines.length * 3.9 + 2;
    ensureSpace(boxH + 3);

    setFill(colors.fill);
    setDraw(LINE);
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    const badgeW = doc.getTextWidth(colors.label) + 5;
    setFill(colors.badge);
    doc.roundedRect(MARGIN + 4, y + 3, badgeW, 4.6, 2.3, 2.3, 'F');
    setColor([255, 255, 255]);
    doc.text(colors.label, MARGIN + 6.5, y + 6.2);

    doc.setFontSize(9.5);
    setColor(INK);
    doc.text(titleLines, MARGIN + 4, y + 12.3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setColor([74, 79, 88]);
    doc.text(textLines, MARGIN + 4, y + 12.3 + titleLines.length * 4.4);

    y += boxH + 3;
  });
  y += 2;

  /* ------------------------------- Gráficos ------------------------------ */

  const chartsTitle = (keepWith: number) => sectionTitle('Análise gráfica', 'Distribuição, custódia, depreciação e inventário', keepWith);

  const chartGap = 5;
  const chartW = (CONTENT_W - chartGap) / 2;
  const captured: Array<{ chart: BiPdfChart; dataUrl: string | null; aspect: number }> = [];

  for (const chart of input.charts) {
    if (!chart.node) {
      captured.push({ chart, dataUrl: null, aspect: 0.35 });
      continue;
    }

    try {
      const rect = chart.node.getBoundingClientRect();
      const dataUrl = await toPng(chart.node, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
      captured.push({ chart, dataUrl, aspect: rect.height / Math.max(rect.width, 1) });
    } catch {
      captured.push({ chart, dataUrl: null, aspect: 0.35 });
    }
  }

  const firstRowH = captured.length ? Math.max(...captured.slice(0, 2).map((item) => chartW * item.aspect)) + 14 : 0;
  chartsTitle(firstRowH);

  for (let index = 0; index < captured.length; index += 2) {
    const row = captured.slice(index, index + 2);
    const imageHeights = row.map((item) => chartW * item.aspect);
    const rowH = Math.max(...imageHeights) + 14;
    ensureSpace(rowH + chartGap);

    row.forEach((item, col) => {
      const x = MARGIN + col * (chartW + chartGap);
      setFill([255, 255, 255]);
      setDraw(LINE);
      doc.roundedRect(x, y, chartW, rowH, 2.5, 2.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      setColor(INK);
      doc.text(item.chart.title, x + 4, y + 6);
      if (item.chart.subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        setColor(MUTED);
        doc.text(doc.splitTextToSize(item.chart.subtitle, chartW - 8)[0] as string, x + 4, y + 10);
      }

      if (item.dataUrl) {
        const imageW = chartW - 6;
        const imageH = imageW * item.aspect;
        doc.addImage(item.dataUrl, 'PNG', x + 3, y + 12.5, imageW, imageH);
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        setColor(MUTED);
        doc.text('Sem dados para este gráfico no recorte selecionado.', x + chartW / 2, y + rowH / 2 + 4, { align: 'center' });
      }
    });

    y += rowH + chartGap;
  }
  y += 2;

  /* -------------------------------- Tabelas ------------------------------ */

  for (const table of input.tables) {
    sectionTitle(table.title, `${table.body.length} registro(s)`, 24);

    if (!table.body.length) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      setColor(MUTED);
      doc.text(table.emptyText ?? 'Nenhum registro no recorte selecionado.', MARGIN + 4.5, y + 2);
      y += 10;
      continue;
    }

    const columnStyles: Record<number, { halign: 'left' | 'right' }> = {};
    (table.align ?? []).forEach((align, index) => {
      columnStyles[index] = { halign: align };
    });

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_H + 4 },
      head: [table.head],
      body: table.body,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, textColor: INK, lineColor: LINE, lineWidth: 0.2 },
      headStyles: { fillColor: [248, 250, 252], textColor: MUTED, fontStyle: 'bold', fontSize: 7.2 },
      alternateRowStyles: { fillColor: [252, 252, 253] },
      columnStyles,
    });

    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;
  }

  /* -------------------------------- Rodapé ------------------------------- */

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    setDraw(LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - FOOTER_H + 2, PAGE_W - MARGIN, PAGE_H - FOOTER_H + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setColor(MUTED);
    doc.text(`NWB Asset · Relatório BI Patrimonial · ${input.empresaNome}`, MARGIN, PAGE_H - FOOTER_H + 7);
    doc.text(`Página ${page} de ${pageCount}`, PAGE_W - MARGIN, PAGE_H - FOOTER_H + 7, { align: 'right' });
  }

  const stamp = input.geradoEm.toISOString().slice(0, 16).replace(/[-:T]/g, '');
  doc.save(`relatorio-bi-patrimonial-${stamp}.pdf`);
}
