module org.example.depositobebidassys {
    requires javafx.controls;
    requires javafx.fxml;
    requires java.sql;
    requires java.desktop;
    requires kernel;
    requires layout;

    // Permissão para as Telas lerem os Controllers
    opens org.example.depositobebidassys.controller to javafx.fxml;
    exports org.example.depositobebidassys.controller;

    // 👇 AS DUAS LINHAS MÁGICAS PARA A TABELA FUNCIONAR 👇
    opens org.example.depositobebidassys.model to javafx.base;
    exports org.example.depositobebidassys.model;

    // Permissão geral
    opens org.example.depositobebidassys to javafx.fxml;
    exports org.example.depositobebidassys;
}