package com.seuamigo.deposito.dao; // Mude se o seu pacote for diferente

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class ConnectionFactory {

    public Connection recuperarConexao() {
        try {
            // Descobre a pasta raiz do usuário no Windows/Mac/Linux
            String pastaUsuario = System.getProperty("user.home");

            // Cria uma pasta invisível ou visível chamada SistemaBebidas
            File diretorio = new File(pastaUsuario, "SistemaBebidas");
            if (!diretorio.exists()) {
                diretorio.mkdirs();
            }

            // Monta o caminho exato do banco de dados
            String url = "jdbc:sqlite:" + diretorio.getAbsolutePath() + "/estoque.db";

            return DriverManager.getConnection(url);
        } catch (SQLException e) {
            throw new RuntimeException("Falha ao conectar no SQLite: " + e.getMessage());
        }
    }
}