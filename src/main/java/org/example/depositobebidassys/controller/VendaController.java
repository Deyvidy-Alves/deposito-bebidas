package org.example.depositobebidassys.controller;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import org.example.depositobebidassys.dao.ProdutoDAO;
import org.example.depositobebidassys.dao.VendaDAO;
import org.example.depositobebidassys.model.ItemCarrinho;
import org.example.depositobebidassys.model.Produto;

import java.util.List;

public class VendaController {

    @FXML private ComboBox<Produto> cbProdutoVenda;
    @FXML private TextField txtQtdVenda;

    @FXML private TableView<ItemCarrinho> tabelaCarrinho;
    @FXML private TableColumn<ItemCarrinho, String> colNomeCarrinho;
    @FXML private TableColumn<ItemCarrinho, Integer> colQtdCarrinho;
    @FXML private TableColumn<ItemCarrinho, Double> colPrecoCarrinho;
    @FXML private TableColumn<ItemCarrinho, Double> colSubtotalCarrinho;
    @FXML private Label lblTotalVenda;

    private ProdutoDAO dao = new ProdutoDAO();
    private ObservableList<ItemCarrinho> listaCarrinho = FXCollections.observableArrayList();
    private double totalCompra = 0.0;

    @FXML
    public void initialize() {
        colNomeCarrinho.setCellValueFactory(new PropertyValueFactory<>("nomeProduto"));
        colQtdCarrinho.setCellValueFactory(new PropertyValueFactory<>("quantidade"));
        colPrecoCarrinho.setCellValueFactory(new PropertyValueFactory<>("precoUnitario"));
        colSubtotalCarrinho.setCellValueFactory(new PropertyValueFactory<>("subtotal"));

        tabelaCarrinho.setItems(listaCarrinho);

        atualizarListaProdutos();
        cbProdutoVenda.setOnShowing(event -> atualizarListaProdutos());
    }

    private void atualizarListaProdutos() {
        List<Produto> listaDeProdutos = dao.listarTodos();
        cbProdutoVenda.setItems(FXCollections.observableArrayList(listaDeProdutos));
    }

    @FXML
    public void adicionarAoCarrinho(ActionEvent event) {
        Produto produtoSelecionado = cbProdutoVenda.getValue();
        String qtdTexto = txtQtdVenda.getText();

        if (produtoSelecionado == null || qtdTexto == null || qtdTexto.isEmpty()) {
            mostrarAlerta("Atenção", "Selecione um produto e digite a quantidade!", Alert.AlertType.WARNING);
            return;
        }

        try {
            int qtd = Integer.parseInt(qtdTexto);

            ItemCarrinho item = new ItemCarrinho(produtoSelecionado, qtd);
            listaCarrinho.add(item);

            totalCompra += item.getSubtotal();
            lblTotalVenda.setText(String.format("R$ %.2f", totalCompra));

            cbProdutoVenda.getSelectionModel().clearSelection();
            txtQtdVenda.clear();

        } catch (NumberFormatException e) {
            mostrarAlerta("Erro", "A quantidade deve ser um número inteiro.", Alert.AlertType.ERROR);
        }
    }

    @FXML
    public void finalizarVenda(ActionEvent event) {
        if (listaCarrinho.isEmpty()) {
            mostrarAlerta("Atenção", "O carrinho está vazio!", Alert.AlertType.WARNING);
            return;
        }

        // Chama o DAO que acabamos de criar
        VendaDAO vendaDAO = new VendaDAO();
        boolean sucesso = vendaDAO.registrarVenda(listaCarrinho, totalCompra);

        if (sucesso) {
            mostrarAlerta("Sucesso", "Venda finalizada! O estoque foi atualizado automaticamente.", Alert.AlertType.INFORMATION);

            // Limpa o carrinho pro próximo cliente do depósito
            listaCarrinho.clear();
            totalCompra = 0.0;
            lblTotalVenda.setText("R$ 0,00");
        } else {
            mostrarAlerta("Erro", "Ocorreu um erro ao registrar a venda. Veja o terminal.", Alert.AlertType.ERROR);
        }
    }

    @FXML
    public void removerDoCarrinho(ActionEvent event) {
        // 1. Pega o item que o Manel clicou na tabela
        ItemCarrinho itemSelecionado = tabelaCarrinho.getSelectionModel().getSelectedItem();

        if (itemSelecionado == null) {
            mostrarAlerta("Atenção", "Selecione um item na tabela para remover!", Alert.AlertType.WARNING);
            return;
        }

        // 2. Remove da lista que aparece na tela
        listaCarrinho.remove(itemSelecionado);

        // 3. Recalcula o Total a Pagar subtraindo o subtotal do item removido
        totalCompra -= itemSelecionado.getSubtotal();

        // Garante que o total não fique negativo por erro de arredondamento
        if (totalCompra < 0) totalCompra = 0;

        lblTotalVenda.setText(String.format("R$ %.2f", totalCompra));
    }

    private void mostrarAlerta(String titulo, String mensagem, Alert.AlertType tipo) {
        Alert alert = new Alert(tipo);
        alert.setTitle(titulo);
        alert.setHeaderText(null);
        alert.setContentText(mensagem);
        alert.showAndWait();
    }

}