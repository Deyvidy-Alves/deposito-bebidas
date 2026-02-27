package org.example.depositobebidassys.dao;

import org.example.depositobebidassys.controller.RelatorioController;
import java.sql.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class RelatorioDAO {

    // Retorna Faturamento, Lucro e qtd de vendas (nessa ordem) pro dashboard
    public double[] buscarKpis(LocalDate inicio, LocalDate fim) {
        String sql = "SELECT SUM(total_bruto), SUM(lucro_liquido), COUNT(id) FROM vendas WHERE date(data_venda) BETWEEN ? AND ?";
        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, inicio.toString());
            stmt.setString(2, fim.toString());
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) return new double[]{rs.getDouble(1), rs.getDouble(2), rs.getDouble(3)};
        } catch (SQLException e) { e.printStackTrace(); }
        return new double[]{0.0, 0.0, 0.0};
    }

    // Pega as vendas daquele periodo e junta os itens numa string só pra ficar bonito na tela
    public List<RelatorioController.VendaHistorico> buscarHistoricoVendas(LocalDate inicio, LocalDate fim) {
        List<RelatorioController.VendaHistorico> lista = new ArrayList<>();

        String sql = "SELECT v.id, v.data_venda, v.total_bruto, v.lucro_liquido, v.forma_pagamento, " +
                "GROUP_CONCAT(iv.quantidade || 'x ' || p.nome, ', ') AS descricao_itens " +
                "FROM vendas v " +
                "LEFT JOIN itens_venda iv ON v.id = iv.venda_id " +
                "LEFT JOIN produtos p ON iv.produto_id = p.id " +
                "WHERE date(v.data_venda) BETWEEN ? AND ? " +
                "GROUP BY v.id ORDER BY v.id DESC";

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
                        rs.getDouble("lucro_liquido"),
                        rs.getString("forma_pagamento"),
                        rs.getString("descricao_itens")
                ));
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return lista;
    }

    // Traz os 5 q mais saem pro gráfico de pizza
    public Map<String, Integer> buscarTopProdutos(LocalDate inicio, LocalDate fim) {
        Map<String, Integer> top = new LinkedHashMap<>();
        String sql = "SELECT p.nome, SUM(iv.quantidade) as qtd FROM itens_venda iv " +
                "JOIN produtos p ON iv.produto_id = p.id JOIN vendas v ON iv.venda_id = v.id " +
                "WHERE date(v.data_venda) BETWEEN ? AND ? GROUP BY p.nome ORDER BY qtd DESC LIMIT 5";
        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, inicio.toString());
            stmt.setString(2, fim.toString());
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) top.put(rs.getString("nome"), rs.getInt("qtd"));
        } catch (SQLException e) { e.printStackTrace(); }
        return top;
    }

    // Agrupa a grana q entrou por dia pro grafico de linha
    public Map<String, Double> buscarEvolucaoVendas(LocalDate inicio, LocalDate fim) {
        Map<String, Double> evolucao = new LinkedHashMap<>();
        String sql = "SELECT date(data_venda) as data, SUM(total_bruto) FROM vendas " +
                "WHERE date(data_venda) BETWEEN ? AND ? GROUP BY data ORDER BY data";
        try (Connection conn = new ConnectionFactory().recuperarConexao();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, inicio.toString());
            stmt.setString(2, fim.toString());
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                String[] partes = rs.getString(1).split("-");
                evolucao.put(partes[2] + "/" + partes[1], rs.getDouble(2)); // Formata dia/mes
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return evolucao;
    }
}