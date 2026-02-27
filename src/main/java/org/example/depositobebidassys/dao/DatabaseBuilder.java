package org.example.depositobebidassys.dao;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

public class DatabaseBuilder {

    // Essa classe não ta sendo muito usada pq joguei td pra ConnectionFactory
    // mas deixei aqui de backup caso precise rodar um setup forçado
    public void construirTabelas() {
        ConnectionFactory factory = new ConnectionFactory();

        String sqlProdutos = "CREATE TABLE IF NOT EXISTS produtos (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "nome TEXT NOT NULL, " +
                "categoria TEXT, " +
                "tipo_item TEXT DEFAULT 'PRODUTO', " +
                "codigo_barras TEXT UNIQUE, " +
                "preco_custo REAL NOT NULL, " +
                "preco_venda REAL NOT NULL, " +
                "estoque_atual INTEGER DEFAULT 0)";

        String sqlVendas = "CREATE TABLE IF NOT EXISTS vendas (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "data_venda DATETIME DEFAULT CURRENT_TIMESTAMP, " +
                "total_bruto REAL NOT NULL, " +
                "lucro_liquido REAL NOT NULL, " +
                "forma_pagamento TEXT NOT NULL)";

        String sqlItensVenda = "CREATE TABLE IF NOT EXISTS itens_venda (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "venda_id INTEGER NOT NULL, " +
                "produto_id INTEGER NOT NULL, " +
                "quantidade INTEGER NOT NULL, " +
                "preco_unitario REAL NOT NULL, " +
                "subtotal REAL NOT NULL, " +
                "FOREIGN KEY (venda_id) REFERENCES vendas(id), " +
                "FOREIGN KEY (produto_id) REFERENCES produtos(id))";

        String sqlFluxoCaixa = "CREATE TABLE IF NOT EXISTS fluxo_caixa (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "data_movimento DATETIME DEFAULT CURRENT_TIMESTAMP, " +
                "tipo TEXT NOT NULL, " +
                "descricao TEXT NOT NULL, " +
                "valor REAL NOT NULL, " +
                "forma_pagamento TEXT)";

        String sqlComboItens = "CREATE TABLE IF NOT EXISTS combo_itens (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "combo_id INTEGER, " +
                "produto_id INTEGER, " +
                "quantidade INTEGER, " +
                "FOREIGN KEY(combo_id) REFERENCES produtos(id), " +
                "FOREIGN KEY(produto_id) REFERENCES produtos(id))";

        try (Connection conn = factory.recuperarConexao();
             Statement stmt = conn.createStatement()) {

            stmt.execute(sqlProdutos);
            stmt.execute(sqlVendas);
            stmt.execute(sqlItensVenda);
            stmt.execute(sqlFluxoCaixa);
            stmt.execute(sqlComboItens);

            System.out.println("✅ Banco de dados 'estoque.db' verificado/criado!");

        } catch (SQLException e) {
            System.err.println("❌ Erro ao construir db: " + e.getMessage());
        }
    }
}