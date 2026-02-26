package org.example.depositobebidassys.dao;

import org.example.depositobebidassys.model.ItemCarrinho;
import org.example.depositobebidassys.model.TipoItem;

import java.sql.*;
import java.util.List;

public class VendaDAO {

    public boolean registrarVenda(List<ItemCarrinho> itens, double total) {
        String sqlVenda = "INSERT INTO vendas (total_bruto, lucro_liquido, forma_pagamento) VALUES (?, ?, ?)";
        String sqlItemVenda = "INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)";
        String sqlBaixaEstoque = "UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?";

        // SQL que busca a "receita" do combo para sabermos o que dar baixa
        String sqlBuscaReceita = "SELECT produto_id, quantidade FROM combo_itens WHERE combo_id = ?";

        try (Connection conn = new ConnectionFactory().recuperarConexao()) {

            conn.setAutoCommit(false); // TRAVA O BANCO: Inicia a transação segura!

            try {
                // 1. Salva o cabeçalho da Venda
                int vendaId = 0;
                try (PreparedStatement stmtVenda = conn.prepareStatement(sqlVenda, Statement.RETURN_GENERATED_KEYS)) {
                    stmtVenda.setDouble(1, total);
                    stmtVenda.setDouble(2, 0.0); // O cálculo do lucro líquido faremos em uma atualização futura
                    stmtVenda.setString(3, "Dinheiro/Pix"); // Forma de pagamento padrão por enquanto
                    stmtVenda.executeUpdate();

                    ResultSet rs = stmtVenda.getGeneratedKeys();
                    if (rs.next()) {
                        vendaId = rs.getInt(1);
                    }
                }

                // 2. Salva os Itens e Faz a Mágica do Estoque
                try (PreparedStatement stmtItem = conn.prepareStatement(sqlItemVenda);
                     PreparedStatement stmtBaixa = conn.prepareStatement(sqlBaixaEstoque);
                     PreparedStatement stmtBuscaReceita = conn.prepareStatement(sqlBuscaReceita)) {

                    for (ItemCarrinho item : itens) {
                        // Salva o produto na "nota fiscal"
                        stmtItem.setInt(1, vendaId);
                        stmtItem.setInt(2, item.getProduto().getId());
                        stmtItem.setInt(3, item.getQuantidade());
                        stmtItem.setDouble(4, item.getPrecoUnitario());
                        stmtItem.setDouble(5, item.getSubtotal());
                        stmtItem.executeUpdate();

                        // BAIXA DE ESTOQUE
                        if (item.getProduto().getTipoItem() == TipoItem.PRODUTO) {
                            // Se for uma Coca ou Heineken normal: tira do estoque direto
                            stmtBaixa.setInt(1, item.getQuantidade());
                            stmtBaixa.setInt(2, item.getProduto().getId());
                            stmtBaixa.executeUpdate();

                        } else if (item.getProduto().getTipoItem() == TipoItem.COMBO) {
                            // Se for Combo: Vai no banco, olha a receita e tira os ingredientes!
                            stmtBuscaReceita.setInt(1, item.getProduto().getId());
                            ResultSet rsReceita = stmtBuscaReceita.executeQuery();

                            while (rsReceita.next()) {
                                int ingredienteId = rsReceita.getInt("produto_id");
                                int qtdNaReceita = rsReceita.getInt("quantidade");
                                int totalBaixar = qtdNaReceita * item.getQuantidade();

                                // ADICIONE ESTA LINHA PARA DEBUG:
                                System.out.println("DEBUG: Baixando ID " + ingredienteId + " - Qtd: " + totalBaixar);

                                stmtBaixa.setInt(1, totalBaixar);
                                stmtBaixa.setInt(2, ingredienteId);
                                stmtBaixa.executeUpdate();
                            }
                        }
                    }
                }

                conn.commit(); // Salva tudo de vez.
                return true;

            } catch (SQLException e) {
                conn.rollback(); // DEU ERRO! Desfaz tudo para não dar furo no estoque.
                System.err.println("Erro na transação da venda (Rollback executado): " + e.getMessage());
                return false;
            }
        } catch (SQLException e) {
            System.err.println("Erro de conexão no Caixa: " + e.getMessage());
            return false;
        }
    }
}