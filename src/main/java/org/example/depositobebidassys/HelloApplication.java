package org.example.depositobebidassys;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;
import org.example.depositobebidassys.dao.DatabaseBuilder;
import org.example.depositobebidassys.dao.ProdutoDAO;

import java.io.IOException;

public class HelloApplication extends Application {

    @Override
    public void start(Stage stage) throws IOException {

        // 1. Garante que o banco existe
        new DatabaseBuilder().construirTabelas();

        // ---- INÍCIO DO TESTE DE GRAVAÇÃO ----
        ProdutoDAO dao = new ProdutoDAO();

        // Criando a primeira bebida em memória RAM (usando nosso Enum TipoItem.PRODUTO)
        org.example.depositobebidassys.model.Produto primeiraCerveja = new org.example.depositobebidassys.model.Produto(
                "Heineken 600ml",
                "Cerveja",
                org.example.depositobebidassys.model.TipoItem.PRODUTO,
                "7891234567890",
                7.50, // Preço de Custo
                12.00, // Preço de Venda
                24 // Quantidade em Estoque (1 caixa)
        );

        // Mandando gravar no SQLite
        dao.salvar(primeiraCerveja);

        FXMLLoader fxmlLoader = new FXMLLoader(HelloApplication.class.getResource("hello-view.fxml"));
        Scene scene = new Scene(fxmlLoader.load(), 320, 240);
        stage.setTitle("Sistema Depósito");
        stage.setScene(scene);
        stage.show();
    }
}