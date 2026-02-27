module org.example.depositobebidassys {
    requires javafx.controls;
    requires javafx.fxml;
    requires java.sql;
    requires java.desktop;
    requires kernel;
    requires layout;

    // Deixa os arquivos FXML (as telas) enxergarem nossos Controllers
    opens org.example.depositobebidassys.controller to javafx.fxml;
    exports org.example.depositobebidassys.controller;

    // Isso libera o JavaFX pra conseguir ler os "getters" lá nas nossas classes de Model
    opens org.example.depositobebidassys.model to javafx.base;
    exports org.example.depositobebidassys.model;

    // Libera o pacote principal
    opens org.example.depositobebidassys to javafx.fxml;
    exports org.example.depositobebidassys;
}