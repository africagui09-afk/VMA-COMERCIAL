import { Sale } from '../types';

export interface ThermalPrintOptions {
  paperWidth?: '80mm' | '58mm';
  companyName?: string;
  companyNif?: string;
  companyAddress?: string;
  companyPhone?: string;
}

/**
 * Gera o documento HTML e dispara a impressão otimizada para impressoras térmicas ESC/POS (80mm e 58mm)
 * com resets de margem, tipografia monospace condensada e quebras de página protegidas.
 */
export function printThermalReceipt(
  sale: Partial<Sale> & { items: any[]; total: number; invoiceNumber: string },
  options: ThermalPrintOptions = {}
): void {
  const {
    paperWidth = '80mm',
    companyName = 'VMA Comercial Lda',
    companyNif = '5001299834',
    companyAddress = 'Saurimo, Lunda Sul - Angola',
    companyPhone = '+244 924 046 450',
  } = options;

  const is58mm = paperWidth === '58mm';
  const widthMm = is58mm ? '54mm' : '76mm';
  const fontSize = is58mm ? '10px' : '11px';

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <title>Talão ${sale.invoiceNumber}</title>
  <style>
    @page {
      margin: 0;
      size: ${paperWidth} auto;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      width: ${widthMm};
      max-width: ${widthMm};
      margin: 0 auto;
      padding: 6px 3px 20px 3px;
      font-family: 'Courier New', Courier, monospace, 'Lucida Console';
      font-size: ${fontSize};
      line-height: 1.25;
      color: #000;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: bold; }
    .title {
      font-size: 1.2em;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .subtitle {
      font-size: 0.9em;
      margin-bottom: 1px;
    }
    .divider {
      border: none;
      border-top: 1px dashed #000;
      margin: 5px 0;
      width: 100%;
    }
    .double-divider {
      border: none;
      border-top: 1px double #000;
      margin: 5px 0;
      width: 100%;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .table th {
      border-bottom: 1px dashed #000;
      padding: 2px 0;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 0.85em;
    }
    .table td {
      padding: 2px 0;
      vertical-align: top;
      word-break: break-word;
    }
    .item-row {
      page-break-inside: avoid;
    }
    .totals-block {
      page-break-inside: avoid;
      margin-top: 4px;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .grand-total {
      font-size: 1.15em;
      font-weight: 900;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 3px 0;
      margin: 4px 0;
    }
    .footer {
      font-size: 0.8em;
      text-align: center;
      margin-top: 8px;
      line-height: 1.2;
    }
    @media print {
      body { width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <!-- CABEÇALHO FISCAL ANGOLA -->
  <div class="text-center">
    <div class="title">${companyName}</div>
    <div class="subtitle">${companyAddress}</div>
    <div class="subtitle">NIF: ${companyNif} • Tel: ${companyPhone}</div>
  </div>

  <div class="divider"></div>

  <!-- DADOS DO DOCUMENTO -->
  <div>
    <div class="bold">FACTURA SIMPLIFICADA</div>
    <div>Doc: <strong>${sale.invoiceNumber}</strong></div>
    <div>Data: ${new Date().toLocaleDateString('pt-AO')} ${new Date().toLocaleTimeString('pt-AO')}</div>
    <div>Operador: ${sale.sellerName || 'Operador'}</div>
    <div>Cliente: ${sale.customerName || 'Consumidor Final'}</div>
    ${sale.customerNif ? `<div>NIF Cliente: ${sale.customerNif}</div>` : ''}
  </div>

  <div class="divider"></div>

  <!-- ITENS -->
  <table class="table">
    <thead>
      <tr>
        <th class="text-left" style="width: 50%;">Desc</th>
        <th class="text-center" style="width: 20%;">Qtd</th>
        <th class="text-right" style="width: 30%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${sale.items
        .map((item) => {
          const anyItem = item as any;
          const name = item.productName || anyItem.nome || anyItem.name || 'Produto';
          const qtd = item.quantity ?? anyItem.quantidade ?? 1;
          const price = item.unitPrice ?? anyItem.price ?? anyItem.preco ?? 0;
          const itemTotal = item.total ?? (price * qtd);
          return `
            <tr class="item-row">
              <td class="text-left">
                ${name}
                <div style="font-size: 0.85em; color: #333;">${qtd} x ${price.toLocaleString('pt-AO')} Kz</div>
              </td>
              <td class="text-center bold">${qtd}</td>
              <td class="text-right bold">${itemTotal.toLocaleString('pt-AO')}</td>
            </tr>
          `;
        })
        .join('')}
    </tbody>
  </table>

  <div class="divider"></div>

  <!-- TOTAIS E PAGAMENTO -->
  <div class="totals-block">
    <div class="total-line">
      <span>Subtotal Ilíquido:</span>
      <span>${(sale.subtotal || sale.total).toLocaleString('pt-AO')} Kz</span>
    </div>
    ${(sale.discountTotal || 0) > 0 ? `
    <div class="total-line">
      <span>Desconto Comercial:</span>
      <span>-${sale.discountTotal?.toLocaleString('pt-AO')} Kz</span>
    </div>` : ''}
    <div class="total-line">
      <span>Incidência IVA (0% - Art. 12º):</span>
      <span>${sale.total.toLocaleString('pt-AO')} Kz</span>
    </div>
    <div class="total-line">
      <span>Total de Imposto (IVA):</span>
      <span>0,00 Kz</span>
    </div>
    <div class="total-line grand-total">
      <span>TOTAL A PAGAR:</span>
      <span>${sale.total.toLocaleString('pt-AO')} Kz</span>
    </div>
    <div class="total-line">
      <span>Forma Pagamento:</span>
      <span class="bold">${sale.payments?.[0]?.method || 'DINHEIRO'}</span>
    </div>
  </div>

  <div class="divider"></div>

  <!-- CERTIFICAÇÃO FISCAL E RODAPÉ -->
  <div class="footer">
    <div>Regime de Isenção do IVA (Art. 12 do CIVA)</div>
    <div>Software KwanzaPOS v2.6 • Certificado AGT nº 2026/01</div>
    <div style="margin-top: 4px;">*** OBRIGADO PELA PREFERÊNCIA ***</div>
  </div>
</body>
</html>
`;

  // Cria um iframe invisível para disparar a impressão de forma silenciosa e limpa
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  }
}
