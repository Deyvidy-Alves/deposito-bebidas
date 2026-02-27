package org.example.depositobebidassys;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;

import java.io.IOException;

public class HelloApplication extends Application {

    @Override
    public void start(Stage stage) throws IOException {
        FXMLLoader fxmlLoader = new FXMLLoader(HelloApplication.class.getResource("main-view.fxml"));
        Scene scene = new Scene(fxmlLoader.load(), 1200, 700);

        // Nome que vai aparecer lá em cima na barra do Windows
        stage.setTitle("Sistema de Gestão - Depósito do Neneu");

        stage.setScene(scene);

        // Ja abre a tela ocupando o monitor todo, pegada padrão de sistema de caixa (PDV)
        stage.setMaximized(true);

        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}