/// Comandos binários e tags fundamentais do protocolo ESC/POS (Epson Standard Code for POS)
/// para impressoras térmicas de bobina (58mm e 80mm).
class EscPosCommands {
  // Inicialização
  static const List<int> init = [0x1B, 0x40]; // ESC @

  // Alinhamento
  static const List<int> alignLeft = [0x1B, 0x61, 0x00];   // ESC a 0
  static const List<int> alignCenter = [0x1B, 0x61, 0x01]; // ESC a 1
  static const List<int> alignRight = [0x1B, 0x61, 0x02];  // ESC a 2

  // Peso e Estilo do Texto
  static const List<int> boldOn = [0x1B, 0x45, 0x01];  // ESC E 1
  static const List<int> boldOff = [0x1B, 0x45, 0x00]; // ESC E 0

  static const List<int> underlineOn = [0x1B, 0x2D, 0x01];  // ESC - 1
  static const List<int> underlineOff = [0x1B, 0x2D, 0x00]; // ESC - 0

  // Tamanho do Texto
  static const List<int> textNormal = [0x1D, 0x21, 0x00];      // GS ! 0
  static const List<int> textDoubleHeight = [0x1D, 0x21, 0x01];// Altura dobrada
  static const List<int> textDoubleWidth = [0x1D, 0x21, 0x10]; // Largura dobrada
  static const List<int> textDoubleSize = [0x1D, 0x21, 0x11];  // 2x Altura e Largura

  // Avanço e Corte de Papel
  static const List<int> lineFeed = [0x0A]; // LF
  static const List<int> feed3Lines = [0x1B, 0x64, 0x03]; // ESC d 3
  static const List<int> feed5Lines = [0x1B, 0x64, 0x05]; // ESC d 5
  static const List<int> cutPaperPartial = [0x1D, 0x56, 0x42, 0x00]; // GS V 66 0 (corte parcial com avanço)
  static const List<int> cutPaperFull = [0x1D, 0x56, 0x00];         // GS V 0 (corte total)

  // Gaveta de Dinheiro (Kick Drawer pin 2)
  static const List<int> openCashDrawer = [0x1B, 0x70, 0x00, 0x19, 0xFA];
}
