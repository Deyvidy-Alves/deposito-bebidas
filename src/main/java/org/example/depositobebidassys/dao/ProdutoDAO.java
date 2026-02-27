package org.example.depositobebidassys.dao;

import org.example.depositobebidassys.model.ItemCombo;
import org.example.depositobebidassys.model.Produto;
import org.example.depositobebidassys.model.TipoItem;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ProdutoDAO {

    // Salva produto e retorna true/false pra tela n ficar bipando pop-up atoa
    public boolean salvar(Produto produto) {
        String sql = "INSERT INTO produtos (nome, categoria, tipo_item, codigo_barras, preco_custo, preco_venda, estoque_atual) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, produto.getNome());
            stmt.setString(2, produto.getCategoria());
            // Converte enum pra string pro db aceitar
            stmt.setString(3, produto.getTipoItem().toString());
            stmt.setString(4, produto.getCodigoBarras());
            stmt.setDouble(5, produto.getPrecoCusto());
            stmt.setDouble(6, produto.getPrecoVenda());
            stmt.setInt(7, produto.getEstoqueAtual());

            stmt.execute();
            System.out.println("✅ Produto '" + produto.getNome() + "' cadastrado!");

            return true;

        } catch (SQLException e) {
            System.err.println("❌ Erro ao salvar (provavel cod de barras repetido): " + e.getMessage());
            return false;
        }
    }

    // Puxa tudo pro grid do caixa e estoque
    public List<Produto> listarTodos() {
        List<Produto> produtos = new ArrayList<>();
        String sql = "SELECT * FROM produtos";

        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                Produto p = new Produto();
                p.setId(rs.getInt("id"));
                p.setNome(rs.getString("nome"));
                p.setCategoria(rs.getString("categoria"));
                p.setPrecoCusto(rs.getDouble("preco_custo"));
                p.setPrecoVenda(rs.getDouble("preco_venda"));
                p.setEstoqueAtual(rs.getInt("estoque_atual"));

                // Fallback de segurança se o item não tiver enum setado
                String tipoStr = rs.getString("tipo_item");
                if (tipoStr != null && !tipoStr.isEmpty()) {
                    try {
                        p.setTipoItem(TipoItem.valueOf(tipoStr));
                    } catch (IllegalArgumentException e) {
                        p.setTipoItem(TipoItem.PRODUTO);
                    }
                } else {
                    p.setTipoItem(TipoItem.PRODUTO);
                }

                produtos.add(p);
            }
        } catch (SQLException e) {
            throw new RuntimeException("B.O. ao consultar os produtos: " + e.getMessage());
        }
        return produtos;
    }

    // Grava o cabeçalho do combo e os itens dele. Usa transação pra n salvar pela metade
    public void salvarCombo(Produto combo, List<ItemCombo> itens) {
        String sqlCombo = "INSERT INTO produtos (nome, categoria, tipo_item, preco_custo, preco_venda, estoque_atual) VALUES (?, ?, ?, ?, ?, ?)";
        String sqlItens = "INSERT INTO combo_itens (combo_id, produto_id, quantidade) VALUES (?, ?, ?)";

        try (Connection conn = new ConnectionFactory().recuperarConexao()) {

            conn.setAutoCommit(false); // Trava o envio direto

            try (PreparedStatement stmtCombo = conn.prepareStatement(sqlCombo, Statement.RETURN_GENERATED_KEYS)) {
                stmtCombo.setString(1, combo.getNome());
                stmtCombo.setString(2, "Combo/Kit Promocional");
                stmtCombo.setString(3, combo.getTipoItem().toString());
                stmtCombo.setDouble(4, 0.0); // O custo dele a gnt puxa somando os itens na hora de vender
                stmtCombo.setDouble(5, combo.getPrecoVenda());
                stmtCombo.setInt(6, 0); // Combo n tem estoque fisico

                stmtCombo.executeUpdate();

                // Pega o ID q o banco gerou pro combo
                ResultSet rs = stmtCombo.getGeneratedKeys();
                int comboId = 0;
                if (rs.next()) {
                    comboId = rs.getInt(1);
                }

                // Amarra as bebidas no id do combo
                try (PreparedStatement stmtItens = conn.prepareStatement(sqlItens)) {
                    for (ItemCombo item : itens) {
                        stmtItens.setInt(1, comboId);
                        stmtItens.setInt(2, item.getProduto().getId());
                        stmtItens.setInt(3, item.getQuantidade());
                        stmtItens.executeUpdate();
                    }
                }

                conn.commit(); // Manda td de uma vez

            } catch (SQLException e) {
                conn.rollback(); // Se deu erro no meio, cancela tudo
                System.err.println("Deu ruim no combo, fiz rollback: " + e.getMessage());
            }
        } catch (SQLException e) {
            System.err.println("Erro de conexao: " + e.getMessage());
        }
    }

    public void atualizar(Produto produto) {
        String sql = "UPDATE produtos SET nome = ?, preco_custo = ?, preco_venda = ?, estoque_atual = ? WHERE id = ?";
        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, produto.getNome());
            stmt.setDouble(2, produto.getPrecoCusto());
            stmt.setDouble(3, produto.getPrecoVenda());
            stmt.setInt(4, produto.getEstoqueAtual());
            stmt.setInt(5, produto.getId());

            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Erro atualizando produto: " + e.getMessage());
        }
    }

    public void excluir(int id) {
        String sql = "DELETE FROM produtos WHERE id = ?";
        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, id);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("B.O. ao deletar produto: " + e.getMessage());
        }
    }
}