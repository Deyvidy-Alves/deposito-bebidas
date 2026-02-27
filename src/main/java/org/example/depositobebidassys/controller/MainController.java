package org.example.depositobebidassys.controller;

import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.ToggleButton;
import javafx.scene.layout.VBox;

public class MainController {

    @FXML private ToggleButton btnTema;
    @FXML private VBox rootPane;

    @FXML
    public void alternarTema(ActionEvent event) {
        if (btnTema.isSelected()) {
            // Toggles text and css class pro modo dark/light
            btnTema.setText("Modo Escuro");
            rootPane.getStyleClass().add("light-mode");
        } else {
            btnTema.setText("Modo Claro");
            rootPane.getStyleClass().remove("light-mode");
        }
    }
}