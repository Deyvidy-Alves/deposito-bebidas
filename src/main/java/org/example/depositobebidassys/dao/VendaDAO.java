package org.example.depositobebidassys.dao;

import org.example.depositobebidassys.model.ItemCarrinho;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

public class VendaDAO {

    public boolean registrarVenda(List<ItemCarrinho> itens, double total, double lucroLiquido, String metodoPagamento) {
        String sqlVenda = "INSERT INTO vendas (total_bruto, lucro_liquido, forma_pagamento, data_venda) VALUES (?, ?, ?, datetime('now', 'localtime'))";
        String sqlItemVenda = "INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)";
        String sqlBaixaEstoque = "UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?";

        try (Connection conn = new ConnectionFactory().recuperarConexao()) {
            conn.setAutoCommit(false);
            try {
                int vendaId = 0;
                try (PreparedStatement stmtVenda = conn.prepareStatement(sqlVenda, Statement.RETURN_GENERATED_KEYS)) {
                    stmtVenda.setDouble(1, total);
                    stmtVenda.setDouble(2, lucroLiquido);
                    stmtVenda.setString(3, metodoPagamento);
                    stmtVenda.executeUpdate();
                    ResultSet rs = stmtVenda.getGeneratedKeys();
                    if (rs.next()) vendaId = rs.getInt(1);
                }

                try (PreparedStatement stmtItem = conn.prepareStatement(sqlItemVenda);
                     PreparedStatement stmtBaixa = conn.prepareStatement(sqlBaixaEstoque)) {
                    for (ItemCarrinho item : itens) {
                        stmtItem.setInt(1, vendaId);
                        stmtItem.setInt(2, item.getProduto().getId());
                        stmtItem.setInt(3, item.getQuantidade());
                        stmtItem.setDouble(4, item.getPrecoUnitario());
                        stmtItem.setDouble(5, item.getSubtotal());
                        stmtItem.executeUpdate();

                        // Só baixa estoque se for PRODUTO unitário.
                        // Combos devem ter baixado seus itens na criação ou via trigger (opcional)
                        stmtBaixa.setInt(1, item.getQuantidade());
                        stmtBaixa.setInt(2, item.getProduto().getId());
                        stmtBaixa.executeUpdate();
                    }
                }
                conn.commit();
                return true;
            } catch (SQLException e) {
                conn.rollback();
                return false;
            }
        } catch (SQLException e) { return false; }
    }

    public boolean estornarVenda(int vendaId) {
        String sqlBuscaItens = "SELECT produto_id, quantidade FROM itens_venda WHERE venda_id = ?";
        String sqlVoltaEstoque = "UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?";
        String sqlDeletaItens = "DELETE FROM itens_venda WHERE venda_id = ?";
        String sqlDeletaVenda = "DELETE FROM vendas WHERE id = ?";

        try (Connection conn = new ConnectionFactory().recuperarConexao()) {
            conn.setAutoCommit(false);
            try {
                try (PreparedStatement stmtBusca = conn.prepareStatement(sqlBuscaItens)) {
                    stmtBusca.setInt(1, vendaId);
                    ResultSet rs = stmtBusca.executeQuery();
                    while (rs.next()) {
                        try (PreparedStatement stmtEstoque = conn.prepareStatement(sqlVoltaEstoque)) {
                            stmtEstoque.setInt(1, rs.getInt("quantidade"));
                            stmtEstoque.setInt(2, rs.getInt("produto_id"));
                            stmtEstoque.executeUpdate();
                        }
                    }
                }
                try (PreparedStatement d1 = conn.prepareStatement(sqlDeletaItens)) { d1.setInt(1, vendaId); d1.executeUpdate(); }
                try (PreparedStatement d2 = conn.prepareStatement(sqlDeletaVenda)) { d2.setInt(1, vendaId); d2.executeUpdate(); }
                conn.commit();
                return true;
            } catch (SQLException e) {
                conn.rollback();
                return false;
            }
        } catch (SQLException e) { return false; }
    }
}