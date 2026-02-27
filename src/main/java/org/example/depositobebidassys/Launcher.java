package org.example.depositobebidassys;

public class Launcher {
    public static void main(String[] args) {
        // Esse cara aqui é o verdadeiro gatilho do sistema.
        // Ele burla a chatice do JavaFX reclamando de "Modules" quando a gnt gera o .jar final.
        HelloApplication.main(args);
    }
}