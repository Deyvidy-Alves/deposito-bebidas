module org.example.depositobebidassys {
    requires javafx.controls;
    requires javafx.fxml;


    opens org.example.depositobebidassys to javafx.fxml;
    exports org.example.depositobebidassys;
}