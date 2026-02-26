package org.example.depositobebidassys.dao;

import org.example.depositobebidassys.model.Produto;
import org.example.depositobebidassys.model.TipoItem;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

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

}