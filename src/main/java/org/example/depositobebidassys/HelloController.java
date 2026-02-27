package org.example.depositobebidassys;

import javafx.fxml.FXML;
import javafx.scene.control.Label;

// Classe padrão que veio na criação do projeto.
// Provavelmente nem tô usando mais, mas deixa aí pra evitar B.O fantasma.
public class HelloController {
    @FXML
    private Label welcomeText;

    @FXML
    protected void onHelloButtonClick() {
        welcomeText.setText("Welcome to JavaFX Application!");
    }
}