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
import org.example.depositobebidassys.model.TipoItem;

import java.util.List;
import java.util.stream.Collectors;

public class VendaController {

    @FXML private TextField txtBuscaProduto;
    @FXML private ComboBox<Produto> cbProdutoVenda;
    @FXML private ComboBox<String> cbMetodoPagamento;
    @FXML private TextField txtQtdVenda;
    @FXML private Label lblTotalVenda;

    @FXML private TableView<ItemCarrinho> tabelaCarrinho;
    @FXML private TableColumn<ItemCarrinho, String> colNomeCarrinho;
    @FXML private TableColumn<ItemCarrinho, Integer> colQtdCarrinho;
    @FXML private TableColumn<ItemCarrinho, Double> colPrecoCarrinho;
    @FXML private TableColumn<ItemCarrinho, Double> colSubtotalCarrinho;

    private double descontoTotal = 0.0;
    private double totalCompra = 0.0;
    private ProdutoDAO dao = new ProdutoDAO();
    private ObservableList<ItemCarrinho> listaCarrinho = FXCollections.observableArrayList();

    // 👇 AQUI ESTAVA O ERRO: FALTAVA DECLARAR ESTA VARIÁVEL NO TOPO 👇
    private List<Produto> listaTodosProdutos;

    @FXML
    public void initialize() {
        colNomeCarrinho.setCellValueFactory(new PropertyValueFactory<>("nomeProduto"));
        colQtdCarrinho.setCellValueFactory(new PropertyValueFactory<>("quantidade"));
        colPrecoCarrinho.setCellValueFactory(new PropertyValueFactory<>("precoUnitario"));
        colSubtotalCarrinho.setCellValueFactory(new PropertyValueFactory<>("subtotal"));
        tabelaCarrinho.setItems(listaCarrinho);

        cbMetodoPagamento.setItems(FXCollections.observableArrayList("Dinheiro", "PIX", "Cartão Débito", "Cartão Crédito"));
        cbMetodoPagamento.setValue("Dinheiro");

        carregarProdutos();

        // Filtro via Texto (TextField)
        txtBuscaProduto.textProperty().addListener((obs, antigo, novo) -> {
            filtrarProdutos(novo);
            if (novo != null && !novo.isEmpty() && !cbProdutoVenda.getItems().isEmpty()) {
                cbProdutoVenda.show();
            }
        });
    }

    private void carregarProdutos() {
        listaTodosProdutos = dao.listarTodos(); // Agora a variável existe!
        cbProdutoVenda.setItems(FXCollections.observableArrayList(listaTodosProdutos));
    }

    private void filtrarProdutos(String termo) {
        if (termo == null || termo.isEmpty()) {
            cbProdutoVenda.setItems(FXCollections.observableArrayList(listaTodosProdutos));
        } else {
            String busca = termo.toLowerCase();
            List<Produto> filtrados = listaTodosProdutos.stream()
                    .filter(p -> p.getNome().toLowerCase().contains(busca) ||
                            p.getCategoria().toLowerCase().contains(busca))
                    .collect(Collectors.toList());
            cbProdutoVenda.setItems(FXCollections.observableArrayList(filtrados));
        }
    }

    @FXML
    private void filtrarPorBotao(ActionEvent event) {
        Button btn = (Button) event.getSource();
        String categoria = btn.getText();
        txtBuscaProduto.clear();

        if (categoria.equals("TODOS")) {
            cbProdutoVenda.setItems(FXCollections.observableArrayList(listaTodosProdutos));
        } else if (categoria.equals("COMBO")) {
            cbProdutoVenda.setItems(FXCollections.observableArrayList(
                    listaTodosProdutos.stream().filter(p -> p.getTipoItem() == TipoItem.COMBO).collect(Collectors.toList())));
        } else {
            cbProdutoVenda.setItems(FXCollections.observableArrayList(
                    listaTodosProdutos.stream().filter(p -> p.getCategoria().equalsIgnoreCase(categoria)).collect(Collectors.toList())));
        }
        cbProdutoVenda.show();
    }

    @FXML
    public void adicionarAoCarrinho(ActionEvent event) {
        Produto p = cbProdutoVenda.getValue();
        if (p == null || txtQtdVenda.getText().isEmpty()) return;

        try {
            int qtd = Integer.parseInt(txtQtdVenda.getText());
            if (p.getTipoItem() == TipoItem.PRODUTO && p.getEstoqueAtual() < qtd) {
                mostrarAlerta("Erro", "Estoque insuficiente!");
                return;
            }
            listaCarrinho.add(new ItemCarrinho(p, qtd));
            totalCompra += p.getPrecoVenda() * qtd;
            atualizarTotalFinal();
            txtQtdVenda.setText("1");
        } catch (NumberFormatException e) {
            mostrarAlerta("Erro", "Quantidade inválida!");
        }
    }

    @FXML
    public void finalizarVenda(ActionEvent event) {
        if (listaCarrinho.isEmpty()) return;

        double lucroBruto = 0.0;
        for (ItemCarrinho item : listaCarrinho) {
            lucroBruto += (item.getProduto().getPrecoVenda() - item.getProduto().getPrecoCusto()) * item.getQuantidade();
        }

        double faturamentoFinal = totalCompra - descontoTotal;
        double lucroFinal = lucroBruto - descontoTotal;

        if (new VendaDAO().registrarVenda(listaCarrinho, faturamentoFinal, lucroFinal, cbMetodoPagamento.getValue())) {
            mostrarAlerta("Sucesso", "Venda finalizada!");
            listaCarrinho.clear();
            totalCompra = 0;
            descontoTotal = 0;
            atualizarTotalFinal();
        }
    }

    @FXML
    public void removerDoCarrinho(ActionEvent event) {
        ItemCarrinho selecionado = tabelaCarrinho.getSelectionModel().getSelectedItem();
        if (selecionado != null) {
            listaCarrinho.remove(selecionado);
            totalCompra -= selecionado.getSubtotal();
            atualizarTotalFinal();
        }
    }

    @FXML
    public void aplicarDesconto(ActionEvent event) {
        TextInputDialog dialog = new TextInputDialog("0.00");
        dialog.setTitle("Aplicar Desconto");
        dialog.setHeaderText("Valor a abater (R$):");

        // 👇 A LINHA MÁGICA QUE DEIXA O FUNDO PRETO 👇
        dialog.getDialogPane().getStylesheets().add(getClass().getResource("/org/example/depositobebidassys/style.css").toExternalForm());
        dialog.getDialogPane().getStyleClass().add("meu-dialog-dark"); // Adiciona uma classe para o CSS

        dialog.showAndWait().ifPresent(valor -> {
            try {
                descontoTotal = Double.parseDouble(valor.replace(",", "."));
                atualizarTotalFinal();
            } catch (Exception e) {
                mostrarAlerta("Erro", "Valor inválido!");
            }
        });
    }

    private void atualizarTotalFinal() {
        lblTotalVenda.setText(String.format("R$ %.2f", Math.max(0, totalCompra - descontoTotal)));
    }

    private void mostrarAlerta(String t, String m) {
        Alert a = new Alert(Alert.AlertType.INFORMATION);
        a.setTitle(t);
        a.setHeaderText(null);
        a.setContentText(m);
        a.getDialogPane().getStylesheets().add(getClass().getResource("/org/example/depositobebidassys/style.css").toExternalForm());
        a.getDialogPane().getStyleClass().add("meu-dialog-dark");

        a.showAndWait();
    }
}