package org.example.depositobebidassys.dao;

import org.example.depositobebidassys.model.ItemCombo;
import org.example.depositobebidassys.model.Produto;
import org.example.depositobebidassys.model.TipoItem;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.sql.Statement;

public class ProdutoDAO {

    public void salvar(Produto produto) {
        // O SQL com as "vagas" (?) aguardando os dados de forma segura
        String sql = "INSERT INTO produtos (nome, categoria, tipo_item, codigo_barras, preco_custo, preco_venda, estoque_atual) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)";

        // O bloco try-with-resources já fecha a conexão sozinho no final
        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            // Preenchendo as vagas (?) com os dados do objeto Produto
            stmt.setString(1, produto.getNome());
            stmt.setString(2, produto.getCategoria());
            stmt.setString(4, produto.getCodigoBarras());
            stmt.setDouble(5, produto.getPrecoCusto());
            stmt.setDouble(6, produto.getPrecoVenda());
            stmt.setInt(7, produto.getEstoqueAtual());

            // Executa o comando no banco
            stmt.execute();

            System.out.println("✅ Produto '" + produto.getNome() + "' cadastrado com sucesso!");

        } catch (SQLException e) {
            System.err.println("❌ Erro ao salvar produto no banco: " + e.getMessage());
        }
    }

    public List<Produto> listarTodos() {
        List<Produto> lista = new ArrayList<>();
        String sql = "SELECT * FROM produtos ORDER BY nome ASC";

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
                lista.add(p);
            }
        } catch (SQLException e) {
            System.err.println("Erro ao listar produtos: " + e.getMessage());
        }
        return lista;
    }

    public void salvarCombo(Produto combo, List<ItemCombo> itens) {
        // 1. SQL CORRIGIDO: Adicionado o preco_custo e 6 interrogações
        String sqlCombo = "INSERT INTO produtos (nome, categoria, tipo_item, preco_custo, preco_venda, estoque_atual) VALUES (?, ?, ?, ?, ?, ?)";
        String sqlItens = "INSERT INTO combo_itens (combo_id, produto_id, quantidade) VALUES (?, ?, ?)";

        try (Connection conn = new ConnectionFactory().recuperarConexao()) {
            conn.setAutoCommit(false);

            try (PreparedStatement stmtCombo = conn.prepareStatement(sqlCombo, Statement.RETURN_GENERATED_KEYS)) {
                stmtCombo.setString(1, combo.getNome());
                stmtCombo.setString(2, "Combo/Kit Promocional");
                stmtCombo.setString(3, combo.getTipoItem().toString());

                // 👇 AQUI ESTÁ A MÁGICA: Forçamos o custo a ser 0.0 pro banco aceitar
                stmtCombo.setDouble(4, 0.0);

                stmtCombo.setDouble(5, combo.getPrecoVenda()); // O seu 110 entra aqui!
                stmtCombo.setInt(6, 0);

                stmtCombo.executeUpdate();

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

                conn.commit();

            } catch (SQLException e) {
                conn.rollback();
                System.err.println("Erro ao salvar combo (Rollback executado): " + e.getMessage());
            }
        } catch (SQLException e) {
            System.err.println("Erro de conexão: " + e.getMessage());
        }
    }

    public void atualizar(Produto produto) {
        String sql = "UPDATE produtos SET nome = ?, preco_venda = ?, estoque_atual = ? WHERE id = ?";
        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, produto.getNome());
            stmt.setDouble(2, produto.getPrecoVenda());
            stmt.setInt(3, produto.getEstoqueAtual());
            stmt.setInt(4, produto.getId());

            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Erro ao atualizar produto: " + e.getMessage());
        }
    }

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