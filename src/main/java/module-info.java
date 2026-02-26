module org.example.depositobebidassys {
    requires javafx.controls;
    requires javafx.fxml;
    requires java.sql;


    opens org.example.depositobebidassys to javafx.fxml;
    exports org.example.depositobebidassys;
}