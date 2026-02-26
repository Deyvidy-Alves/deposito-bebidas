package org.example.depositobebidassys.dao;

import org.example.depositobebidassys.model.ItemCarrinho;
import org.example.depositobebidassys.model.TipoItem;

import java.sql.*;
import java.util.List;

public class VendaDAO {

    // --- NOVO: Adicionado o parâmetro lucroLiquido ---
    public boolean registrarVenda(List<ItemCarrinho> itens, double total, double lucroLiquido) {
        String sqlVenda = "INSERT INTO vendas (total_bruto, lucro_liquido, forma_pagamento) VALUES (?, ?, ?)";
        String sqlItemVenda = "INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)";
        String sqlBaixaEstoque = "UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?";
        String sqlBuscaReceita = "SELECT produto_id, quantidade FROM combo_itens WHERE combo_id = ?";

        try (Connection conn = new ConnectionFactory().recuperarConexao()) {
            conn.setAutoCommit(false);

            try {
                int vendaId = 0;
                try (PreparedStatement stmtVenda = conn.prepareStatement(sqlVenda, Statement.RETURN_GENERATED_KEYS)) {
                    stmtVenda.setDouble(1, total);
                    // --- NOVO: Salvando o lucro real no banco de dados ---
                    stmtVenda.setDouble(2, lucroLiquido);
                    stmtVenda.setString(3, "Dinheiro/Pix");
                    stmtVenda.executeUpdate();

                    ResultSet rs = stmtVenda.getGeneratedKeys();
                    if (rs.next()) {
                        vendaId = rs.getInt(1);
                    }
                }

                try (PreparedStatement stmtItem = conn.prepareStatement(sqlItemVenda);
                     PreparedStatement stmtBaixa = conn.prepareStatement(sqlBaixaEstoque);
                     PreparedStatement stmtBuscaReceita = conn.prepareStatement(sqlBuscaReceita)) {

                    for (ItemCarrinho item : itens) {
                        stmtItem.setInt(1, vendaId);
                        stmtItem.setInt(2, item.getProduto().getId());
                        stmtItem.setInt(3, item.getQuantidade());
                        stmtItem.setDouble(4, item.getPrecoUnitario());
                        stmtItem.setDouble(5, item.getSubtotal());
                        stmtItem.executeUpdate();

                        if (item.getProduto().getTipoItem() == TipoItem.PRODUTO) {
                            stmtBaixa.setInt(1, item.getQuantidade());
                            stmtBaixa.setInt(2, item.getProduto().getId());
                            stmtBaixa.executeUpdate();

                        } else if (item.getProduto().getTipoItem() == TipoItem.COMBO) {
                            stmtBuscaReceita.setInt(1, item.getProduto().getId());
                            ResultSet rsReceita = stmtBuscaReceita.executeQuery();

                            while (rsReceita.next()) {
                                int ingredienteId = rsReceita.getInt("produto_id");
                                int qtdNaReceita = rsReceita.getInt("quantidade");
                                int totalBaixar = qtdNaReceita * item.getQuantidade();

                                stmtBaixa.setInt(1, totalBaixar);
                                stmtBaixa.setInt(2, ingredienteId);
                                stmtBaixa.executeUpdate();
                            }
                        }
                    }
                }

                conn.commit();
                return true;

            } catch (SQLException e) {
                conn.rollback();
                System.err.println("Erro na transação da venda (Rollback executado): " + e.getMessage());
                return false;
            }
        } catch (SQLException e) {
            System.err.println("Erro de conexão no Caixa: " + e.getMessage());
            return false;
        }
    }

    public double[] buscarResumoDiario() {
        String sql = "SELECT SUM(total_bruto), SUM(lucro_liquido) FROM vendas WHERE date(data_venda) = date('now')";
        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                return new double[]{rs.getDouble(1), rs.getDouble(2)};
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return new double[]{0.0, 0.0};
    }
}