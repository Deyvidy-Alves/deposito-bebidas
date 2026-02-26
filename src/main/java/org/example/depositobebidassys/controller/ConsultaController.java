package org.example.depositobebidassys.controller;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.fxml.FXML;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.control.cell.PropertyValueFactory;
import org.example.depositobebidassys.dao.ProdutoDAO;
import org.example.depositobebidassys.model.Produto;

public class ConsultaController {

    @FXML private TableView<Produto> tabelaProdutos;
    @FXML private TableColumn<Produto, Integer> colID;
    @FXML private TableColumn<Produto, String> colNome;
    @FXML private TableColumn<Produto, String> colCategoria;
    @FXML private TableColumn<Produto, Integer> colEstoque;
    @FXML private TableColumn<Produto, Double> colVenda;

    private ProdutoDAO dao = new ProdutoDAO();

    @FXML
    public void initialize() {
        // Mapeia qual atributo da classe Produto vai em qual coluna
        colID.setCellValueFactory(new PropertyValueFactory<>("id"));
        colNome.setCellValueFactory(new PropertyValueFactory<>("nome"));
        colCategoria.setCellValueFactory(new PropertyValueFactory<>("categoria"));
        colEstoque.setCellValueFactory(new PropertyValueFactory<>("estoqueAtual"));
        colVenda.setCellValueFactory(new PropertyValueFactory<>("precoVenda"));

        atualizarTabela();
    }

    @FXML
    public void atualizarTabela() {
        ObservableList<Produto> itens = FXCollections.observableArrayList(dao.listarTodos());
        tabelaProdutos.setItems(itens);
    }
}