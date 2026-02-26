package org.example.depositobebidassys.dao;

import org.example.depositobebidassys.model.ItemCombo;
import org.example.depositobebidassys.model.Produto;
import org.example.depositobebidassys.model.TipoItem;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ProdutoDAO {

    /**
     * Persiste um novo produto unitário no banco de dados.
     * Utiliza PreparedStatements para prevenir SQL Injection.
     */
    public void salvar(Produto produto) {
        String sql = "INSERT INTO produtos (nome, categoria, tipo_item, codigo_barras, preco_custo, preco_venda, estoque_atual) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, produto.getNome());
            stmt.setString(2, produto.getCategoria());
            // Índice 3: Mapeia o Enum para String para persistência no SQLite
            stmt.setString(3, produto.getTipoItem().toString());
            stmt.setString(4, produto.getCodigoBarras());
            stmt.setDouble(5, produto.getPrecoCusto());
            stmt.setDouble(6, produto.getPrecoVenda());
            stmt.setInt(7, produto.getEstoqueAtual());

            stmt.execute();
            System.out.println("✅ Produto '" + produto.getNome() + "' cadastrado com sucesso!");

        } catch (SQLException e) {
            System.err.println("❌ Erro ao salvar produto no banco: " + e.getMessage());
        }
    }

    /**
     * Recupera todos os registros da tabela produtos.
     * Inclui tratamento de erro para campos nulos e conversão de Enums.
     */
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

                // --- NOVO: Puxando o preço de custo do banco de dados ---
                p.setPrecoCusto(rs.getDouble("preco_custo"));

                p.setPrecoVenda(rs.getDouble("preco_venda"));
                p.setEstoqueAtual(rs.getInt("estoque_atual"));

                // Tratamento preventivo para evitar NullPointerException em registros antigos
                String tipoStr = rs.getString("tipo_item");
                if (tipoStr != null && !tipoStr.isEmpty()) {
                    try {
                        p.setTipoItem(TipoItem.valueOf(tipoStr));
                    } catch (IllegalArgumentException e) {
                        p.setTipoItem(TipoItem.PRODUTO); // Fallback caso o valor seja inválido
                    }
                } else {
                    p.setTipoItem(TipoItem.PRODUTO); // Default para registros que migraram sem o campo preenchido
                }

                produtos.add(p);
            }
        } catch (SQLException e) {
            throw new RuntimeException("Erro ao consultar lista de produtos: " + e.getMessage());
        }
        return produtos;
    }

    /**
     * Executa a persistência de um Combo e seus respectivos itens de receita.
     * Implementa lógica de Transação (ACID) para garantir a integridade dos dados.
     */
    public void salvarCombo(Produto combo, List<ItemCombo> itens) {
        String sqlCombo = "INSERT INTO produtos (nome, categoria, tipo_item, preco_custo, preco_venda, estoque_atual) VALUES (?, ?, ?, ?, ?, ?)";
        String sqlItens = "INSERT INTO combo_itens (combo_id, produto_id, quantidade) VALUES (?, ?, ?)";

        try (Connection conn = new ConnectionFactory().recuperarConexao()) {
            // Desabilita o auto-commit para gerenciar o escopo da transação manualmente
            conn.setAutoCommit(false);

            try (PreparedStatement stmtCombo = conn.prepareStatement(sqlCombo, Statement.RETURN_GENERATED_KEYS)) {
                stmtCombo.setString(1, combo.getNome());
                stmtCombo.setString(2, "Combo/Kit Promocional");
                stmtCombo.setString(3, combo.getTipoItem().toString());
                stmtCombo.setDouble(4, 0.0); // Preço de custo zerado para combos (calculado via itens na saída)
                stmtCombo.setDouble(5, combo.getPrecoVenda());
                stmtCombo.setInt(6, 0); // Combos não possuem estoque físico próprio, apenas virtual

                stmtCombo.executeUpdate();

                // Recupera o ID gerado pelo banco para vincular aos itens da receita
                ResultSet rs = stmtCombo.getGeneratedKeys();
                int comboId = 0;
                if (rs.next()) {
                    comboId = rs.getInt(1);
                }

                try (PreparedStatement stmtItens = conn.prepareStatement(sqlItens)) {
                    for (ItemCombo item : itens) {
                        stmtItens.setInt(1, comboId);
                        stmtItens.setInt(2, item.getProduto().getId());
                        stmtItens.setInt(3, item.getQuantidade());
                        stmtItens.executeUpdate();
                    }
                }

                // Efetiva todas as operações se nenhum erro ocorrer
                conn.commit();

            } catch (SQLException e) {
                // Em caso de falha em qualquer insert, reverte todas as alterações (Rollback)
                conn.rollback();
                System.err.println("Erro ao salvar combo (Rollback executado): " + e.getMessage());
            }
        } catch (SQLException e) {
            System.err.println("Erro de conexão: " + e.getMessage());
        }
    }

    public void atualizar(Produto produto) {
        // Adicionamos o preco_custo no UPDATE
        String sql = "UPDATE produtos SET nome = ?, preco_custo = ?, preco_venda = ?, estoque_atual = ? WHERE id = ?";
        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, produto.getNome());
            stmt.setDouble(2, produto.getPrecoCusto()); // NOVO CAMPO
            stmt.setDouble(3, produto.getPrecoVenda());
            stmt.setInt(4, produto.getEstoqueAtual());
            stmt.setInt(5, produto.getId());

            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Erro ao atualizar produto: " + e.getMessage());
        }
    }

    /**
     * Remove um produto do banco de dados pelo seu ID.
     */
    public void excluir(int id) {
        String sql = "DELETE FROM produtos WHERE id = ?";
        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, id);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Erro ao excluir produto: " + e.getMessage());
        }
    }
}