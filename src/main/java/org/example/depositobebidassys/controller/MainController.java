package org.example.depositobebidassys.controller;

import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.ToggleButton;
import javafx.scene.layout.VBox;

public class MainController {

    @FXML private ToggleButton btnTema;
    @FXML private VBox rootPane; // Controla a tela toda

    @FXML
    public void alternarTema(ActionEvent event) {
        if (btnTema.isSelected()) {
            btnTema.setText("Modo Escuro"); // Se está no claro, o botão sugere voltar pro escuro
            rootPane.getStyleClass().add("light-mode");
        } else {
            btnTema.setText("Modo Claro"); // Se está no escuro, sugere ir pro claro
            rootPane.getStyleClass().remove("light-mode");
        }
    }
}