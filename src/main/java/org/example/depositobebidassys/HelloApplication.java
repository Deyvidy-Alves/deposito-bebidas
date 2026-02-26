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

        ProdutoDAO dao = new ProdutoDAO();

        FXMLLoader fxmlLoader = new FXMLLoader(HelloApplication.class.getResource("cadastro-produto.fxml"));
        Scene scene = new Scene(fxmlLoader.load(), 450, 500); // Aumentei a tela pra caber tudo!
        stage.setTitle("Depósito - Cadastro de Produtos");
        stage.setScene(scene);
        stage.show();
    }
}