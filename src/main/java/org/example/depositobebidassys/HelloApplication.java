package org.example.depositobebidassys;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;
import org.example.depositobebidassys.dao.DatabaseBuilder;

import java.io.IOException;

public class HelloApplication extends Application {

    @Override
    public void start(Stage stage) throws IOException {
        // 1. Garante o banco
        new DatabaseBuilder().construirTabelas();

        // 2. Carrega o Menu Principal (que já inclui as outras telas)
        FXMLLoader fxmlLoader = new FXMLLoader(HelloApplication.class.getResource("main-view.fxml"));

        // Tamanho maior para acomodar a tabela de consulta confortavelmente
        Scene scene = new Scene(fxmlLoader.load(), 900, 650);

        stage.setTitle("Sistema de Gestão - Depósito do Neneu");
        stage.setScene(scene);
        stage.show();
    }
}