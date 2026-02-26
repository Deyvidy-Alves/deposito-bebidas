package org.example.depositobebidassys.dao;

import org.example.depositobebidassys.controller.RelatorioController;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class RelatorioDAO {

    // Retorna [0] Faturamento, [1] Lucro, [2] Qtd Vendas
    public double[] buscarKpis(LocalDate inicio, LocalDate fim) {
        String sql = "SELECT SUM(total_bruto), SUM(lucro_liquido), COUNT(id) FROM vendas " +
                "WHERE date(data_venda) BETWEEN ? AND ?";

        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, inicio.toString());
            stmt.setString(2, fim.toString());

            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return new double[]{rs.getDouble(1), rs.getDouble(2), rs.getDouble(3)};
            }
        } catch (SQLException e) {
            System.err.println("Erro ao buscar KPIs: " + e.getMessage());
        }
        return new double[]{0.0, 0.0, 0.0};
    }

    // Retorna os 5 produtos mais vendidos no período para o Gráfico de Pizza
    public Map<String, Integer> buscarTopProdutos(LocalDate inicio, LocalDate fim) {
        Map<String, Integer> topProdutos = new LinkedHashMap<>();
        String sql = "SELECT p.nome, SUM(iv.quantidade) as qtd_total " +
                "FROM itens_venda iv " +
                "JOIN produtos p ON iv.produto_id = p.id " +
                "JOIN vendas v ON iv.venda_id = v.id " +
                "WHERE date(v.data_venda) BETWEEN ? AND ? " +
                "GROUP BY p.nome ORDER BY qtd_total DESC LIMIT 5";

        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, inicio.toString());
            stmt.setString(2, fim.toString());

            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                topProdutos.put(rs.getString("nome"), rs.getInt("qtd_total"));
            }
        } catch (SQLException e) {
            System.err.println("Erro ao buscar Top Produtos: " + e.getMessage());
        }
        return topProdutos;
    }

    // Retorna o faturamento dia a dia para o Gráfico de Linha (Evolução)
    public Map<String, Double> buscarEvolucaoVendas(LocalDate inicio, LocalDate fim) {
        Map<String, Double> evolucao = new LinkedHashMap<>();
        String sql = "SELECT date(data_venda) as data_fmt, SUM(total_bruto) as total_dia " +
                "FROM vendas " +
                "WHERE date(data_venda) BETWEEN ? AND ? " +
                "GROUP BY date(data_venda) ORDER BY data_fmt";

        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, inicio.toString());
            stmt.setString(2, fim.toString());

            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                // Pega só o dia e mês (ex: 26/02) para o gráfico não ficar espremido
                String[] dataPartes = rs.getString("data_fmt").split("-");
                String diaMes = dataPartes[2] + "/" + dataPartes[1];
                evolucao.put(diaMes, rs.getDouble("total_dia"));
            }
        } catch (SQLException e) {
            System.err.println("Erro ao buscar Evolução: " + e.getMessage());
        }
        return evolucao;
    }

    // Retorna a lista detalhada para a tabela de histórico
    public List<RelatorioController.VendaHistorico> buscarHistoricoVendas(LocalDate inicio, LocalDate fim) {
        List<RelatorioController.VendaHistorico> lista = new java.util.ArrayList<>();
        // Busca as vendas mais recentes primeiro (ORDER BY id DESC)
        String sql = "SELECT id, data_venda, total_bruto, lucro_liquido FROM vendas " +
                "WHERE date(data_venda) BETWEEN ? AND ? ORDER BY id DESC";

        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, inicio.toString());
            stmt.setString(2, fim.toString());

            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                lista.add(new RelatorioController.VendaHistorico(
                        rs.getString("data_venda"),
                        rs.getInt("id"),
                        rs.getDouble("total_bruto"),
                        rs.getDouble("lucro_liquido")
                ));
            }
        } catch (SQLException e) {
            System.err.println("Erro ao buscar histórico: " + e.getMessage());
        }
        return lista;
    }

}