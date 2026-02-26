module org.example.depositobebidassys {
    requires javafx.controls;
    requires javafx.fxml;
    requires java.sql; // Permissão para o banco que já tínhamos colocado

    // Isso permite que o JavaFX leia seus Controllers
    opens org.example.depositobebidassys.controller to javafx.fxml;
    exports org.example.depositobebidassys.controller;

    // Essas linhas abaixo já devem estar aí, mantenha-as
    opens org.example.depositobebidassys to javafx.fxml;
    exports org.example.depositobebidassys;
}