import 'package:isar/isar.dart';

part 'item_venda_model.g.dart';

@embedded
class ItemVendaModel {
  String? produtoId;

  String? nomeProduto;

  int quantidade = 1;

  double precoUnitario = 0.0; // Em Kwanza (Kz)

  double precoCusto = 0.0; // Em Kwanza (Kz)

  double desconto = 0.0; // Em Kwanza (Kz)

  double subtotal = 0.0;

  double total = 0.0;

  ItemVendaModel();

  factory ItemVendaModel.criar({
    required String produtoId,
    required String nomeProduto,
    required int quantidade,
    required double precoUnitario,
    required double precoCusto,
    double desconto = 0.0,
  }) {
    final sub = double.parse((precoUnitario * quantidade).toStringAsFixed(2));
    final tot = double.parse((sub - desconto).clamp(0.0, double.infinity).toStringAsFixed(2));

    return ItemVendaModel()
      ..produtoId = produtoId
      ..nomeProduto = nomeProduto
      ..quantidade = quantidade
      ..precoUnitario = double.parse(precoUnitario.toStringAsFixed(2))
      ..precoCusto = double.parse(precoCusto.toStringAsFixed(2))
      ..desconto = double.parse(desconto.toStringAsFixed(2))
      ..subtotal = sub
      ..total = tot;
  }

  factory ItemVendaModel.fromJson(Map<String, dynamic> json) {
    return ItemVendaModel()
      ..produtoId = json['productId']?.toString() ?? json['produtoId']?.toString()
      ..nomeProduto = json['productName']?.toString() ?? json['nomeProduto']?.toString()
      ..quantidade = (json['quantity'] ?? json['quantidade'] as num?)?.toInt() ?? 1
      ..precoUnitario = _toDouble(json['unitPrice'] ?? json['precoUnitario'])
      ..precoCusto = _toDouble(json['costPrice'] ?? json['precoCusto'])
      ..desconto = _toDouble(json['discount'] ?? json['desconto'])
      ..subtotal = _toDouble(json['subtotal'])
      ..total = _toDouble(json['total']);
  }

  Map<String, dynamic> toJson() {
    return {
      'productId': produtoId,
      'productName': nomeProduto,
      'quantity': quantidade,
      'unitPrice': double.parse(precoUnitario.toStringAsFixed(2)),
      'costPrice': double.parse(precoCusto.toStringAsFixed(2)),
      'discount': double.parse(desconto.toStringAsFixed(2)),
      'subtotal': double.parse(subtotal.toStringAsFixed(2)),
      'total': double.parse(total.toStringAsFixed(2)),
    };
  }

  static double _toDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    if (value is String) {
      return double.tryParse(value.replaceAll(',', '.')) ?? 0.0;
    }
    return 0.0;
  }
}
