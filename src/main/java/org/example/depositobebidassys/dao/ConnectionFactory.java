package org.example.depositobebidassys.dao;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

public class ConnectionFactory {

    public Connection recuperarConexao() {
        try {
            // Cria o sqlite na msm pasta do .jar pra não dar ruim na hora de entregar
            String url = "jdbc:sqlite:./estoque.db";
            Connection conn = DriverManager.getConnection(url);

            // Já dá um check e cria as tabelas se o db for novo
            inicializarBancoDeDados(conn);

            return conn;
        } catch (SQLException e) {
            throw new RuntimeException("Falha ao conectar no SQLite: " + e.getMessage());
        }
    }

    private void inicializarBancoDeDados(Connection conn) {
        try (Statement stmt = conn.createStatement()) {
            // Cadastro de tudo (bebidas e combos)
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS produtos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    categoria TEXT,
                    tipo_item TEXT DEFAULT 'PRODUTO',
                    codigo_barras TEXT UNIQUE,
                    preco_custo REAL NOT NULL,
                    preco_venda REAL NOT NULL,
                    estoque_atual INTEGER DEFAULT 0
                );
            """);

            // Info de cabeçalho das vendas
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS vendas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
                    total_bruto REAL NOT NULL,
                    lucro_liquido REAL NOT NULL,
                    forma_pagamento TEXT NOT NULL
                );
            """);

            // O que foi vendido em cada compra (vinculado a tabela de vendas)
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS itens_venda (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    venda_id INTEGER NOT NULL,
                    produto_id INTEGER NOT NULL,
                    quantidade INTEGER NOT NULL,
                    preco_unitario REAL NOT NULL,
                    subtotal REAL NOT NULL,
                    FOREIGN KEY (venda_id) REFERENCES vendas(id),
                    FOREIGN KEY (produto_id) REFERENCES produtos(id)
                );
            """);

            // Caixinha geral e amarração dos itens q formam um combo
            stmt.execute("CREATE TABLE IF NOT EXISTS fluxo_caixa (id INTEGER PRIMARY KEY AUTOINCREMENT, data_movimento DATETIME DEFAULT CURRENT_TIMESTAMP, tipo TEXT NOT NULL, descricao TEXT NOT NULL, valor REAL NOT NULL, forma_pagamento TEXT);");
            stmt.execute("CREATE TABLE IF NOT EXISTS combo_itens (id INTEGER PRIMARY KEY AUTOINCREMENT, combo_id INTEGER, produto_id INTEGER, quantidade INTEGER, FOREIGN KEY(combo_id) REFERENCES produtos(id), FOREIGN KEY(produto_id) REFERENCES produtos(id));");

        } catch (SQLException e) {
            System.err.println("Erro ao inicializar tabelas: " + e.getMessage());
        }
    }
}