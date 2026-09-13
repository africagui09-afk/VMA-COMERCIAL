/**
 * Utilitário de Impressão Direta por Clonagem de DOM/HTML
 * Contorna bloqueios de iFrames e restrições de PDF em navegadores mobile (Safari / Chrome).
 */

interface PrintOptions {
  tituloDocumento?: string;
  subtitulo?: string;
}

/**
 * Clona um elemento do DOM e abre uma janela limpa com formatação CSS específica para impressão.
 * @param elementIdOrSelector ID ou seletor CSS do elemento HTML a ser impresso
 * @param options Opções como título do cabeçalho de impressão
 */
export function imprimirElementoDOM(
  elementIdOrSelector: string,
  options: PrintOptions = {}
): boolean {
  // 1. CAPTURA DOS DADOS (HTML DYNAMIC CLONING)
  const elementoOriginal =
    document.getElementById(elementIdOrSelector) ||
    document.querySelector<HTMLElement>(elementIdOrSelector);

  if (!elementoOriginal) {
    console.error(`[DOM Printer] Elemento "${elementIdOrSelector}" não foi encontrado no DOM.`);
    return false;
  }

  // Clona o nó profundamente para não afetar o DOM da aplicação ativa
  const clone = elementoOriginal.cloneNode(true) as HTMLElement;

  // Remove elementos interativos indesejados no documento impresso
  const elementosParaRemover = clone.querySelectorAll(
    'button, [role="button"], input, select, .no-print, .acoes, [title*="Ajuste"], [title*="Ações"]'
  );
  elementosParaRemover.forEach((el) => el.remove());

  const titulo = options.tituloDocumento || 'KwanzaPOS - Relatório Oficial';
  const dataHora = new Date().toLocaleString('pt-AO');

  // 2. CRIAÇÃO DE JANELA POP-UP LIMPA
  const janelaPrint = window.open('', '_blank', 'width=800,height=600');

  if (!janelaPrint) {
    alert('A janela de impressão foi bloqueada pelo navegador. Permita pop-ups para imprimir.');
    return false;
  }

  // 3. INJEÇÃO DE CONTEÚDO E ESTILOS CSS PARA IMPRESSÃO (@media print)
  const cssImpressao = `
    <style>
      *, *::before, *::after {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body {
        margin: 0;
        padding: 18px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        font-size: 12px;
        color: #0f172a;
        background-color: #ffffff;
        width: 100%;
        line-height: 1.4;
      }
      .header-print {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #059669;
        padding-bottom: 12px;
        margin-bottom: 18px;
      }
      .header-print h1 {
        margin: 0;
        font-size: 18px;
        font-weight: 900;
        color: #0f172a;
      }
      .header-print .sub {
        margin: 2px 0 0 0;
        font-size: 11px;
        color: #64748b;
      }
      .header-print .meta {
        text-align: right;
        font-size: 10px;
        color: #475569;
      }
      table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin-top: 10px;
      }
      th, td {
        border: 1px solid #cbd5e1 !important;
        padding: 6px 10px !important;
        text-align: left;
        font-size: 11px;
      }
      th {
        background-color: #f1f5f9 !important;
        color: #0f172a !important;
        font-weight: 700 !important;
        text-transform: uppercase;
        font-size: 10px;
      }
      .text-right { text-align: right !important; }
      .text-center { text-align: center !important; }
      button, nav, .no-print {
        display: none !important;
      }
      @page {
        size: auto;
        margin: 10mm;
      }
      @media print {
        body { padding: 0; }
        .no-print { display: none !important; }
      }
    </style>
  `;

  janelaPrint.document.open();
  janelaPrint.document.write(`
    <!DOCTYPE html>
    <html lang="pt">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${titulo}</title>
        ${cssImpressao}
      </head>
      <body>
        <div class="header-print">
          <div>
            <h1>${titulo}</h1>
            ${options.subtitulo ? `<p class="sub">${options.subtitulo}</p>` : ''}
          </div>
          <div class="meta">
            <div><strong>KwanzaPOS Angola</strong></div>
            <div>Emitido em: ${dataHora}</div>
          </div>
        </div>
        <div id="conteudo-impresso">
          ${clone.outerHTML}
        </div>
      </body>
    </html>
  `);

  // 4. GATILHO COMPATÍVEL COM TODOS OS DISPOSITIVOS
  janelaPrint.document.close();
  janelaPrint.focus();

  // Executa impressão direta e segura
  setTimeout(() => {
    try {
      janelaPrint.print();
      janelaPrint.close();
    } catch (e) {
      console.warn('Erro ao disparar impressão automática:', e);
    }
  }, 250);

  return true;
}

// Funções de conveniência diretas para os botões solicitados:
export function imprimirTabelaEstoque(): boolean {
  return imprimirElementoDOM('container-tabela-estoque', {
    tituloDocumento: 'Relatório de Estoque & Inventário',
    subtitulo: 'Posição de Produtos, Quantidades e Preços',
  });
}

export function imprimirPainelAnalitico(): boolean {
  return imprimirElementoDOM('container-painel-analitico', {
    tituloDocumento: 'Painel Analítico & Demonstrativo Financeiro',
    subtitulo: 'Faturamento, CMV, Despesas e Margens Operacionais',
  });
}
