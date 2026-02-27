package org.example.depositobebidassys.controller;

import javafx.collections.FXCollections;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.ComboBox;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.control.TextField;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.util.StringConverter;
import org.example.depositobebidassys.dao.ProdutoDAO;
import org.example.depositobebidassys.model.ItemCombo;
import org.example.depositobebidassys.model.Produto;
import org.example.depositobebidassys.model.TipoItem;

import java.util.List;
import java.util.stream.Collectors;

public class ComboController {

    @FXML private TextField txtNomeCombo;
    @FXML private TextField txtPrecoCombo;
    @FXML private TextField txtBuscaItemCombo;
    @FXML private ComboBox<Produto> cbProduto;
    @FXML private TextField txtQtdItem;

    @FXML private TableView<ItemCombo> tabelaItensCombo;
    @FXML private TableColumn<ItemCombo, String> colProduto;
    @FXML private TableColumn<ItemCombo, Integer> colQtd;

    private ProdutoDAO dao = new ProdutoDAO();
    private List<Produto> listaTodosProdutos; // Cache pra não bater no banco toda hora

    @FXML
    public void initialize() {
        colProduto.setCellValueFactory(new PropertyValueFactory<>("nomeProduto"));
        colQtd.setCellValueFactory(new PropertyValueFactory<>("quantidade"));

        carregarProdutos();

        // Formata como o objeto vai aparecer escrito no ComboBox
        cbProduto.setConverter(new StringConverter<Produto>() {
            @Override
            public String toString(Produto p) {
                return p == null ? "" : p.getNome() + " (Estoque: " + p.getEstoqueAtual() + ")";
            }
            @Override
            public Produto fromString(String s) { return null; }
        });

        // Listener pra filtrar a lista dinamicamente enquanto digita
        txtBuscaItemCombo.textProperty().addListener((obs, antigo, novo) -> {
            filtrarProdutosCombo(novo);
            if (novo != null && !novo.isEmpty() && !cbProduto.getItems().isEmpty()) {
                cbProduto.show();
            }
        });
    }

    private void carregarProdutos() {
        listaTodosProdutos = dao.listarTodos(); // Puxa dados frescos
    }

    private void filtrarProdutosCombo(String termo) {
        carregarProdutos();
        if (termo == null || termo.isEmpty()) {
            cbProduto.setItems(FXCollections.observableArrayList(listaTodosProdutos));
        } else {
            String busca = termo.toLowerCase();
            List<Produto> filtrados = listaTodosProdutos.stream()
                    .filter(p -> p.getNome().toLowerCase().contains(busca) ||
                            (p.getCategoria() != null && p.getCategoria().toLowerCase().contains(busca))) // Proteção pro null
                    .collect(Collectors.toList());
            cbProduto.setItems(FXCollections.observableArrayList(filtrados));
        }
    }

    @FXML
    private void filtrarComboPorBotao(ActionEvent event) {
        carregarProdutos(); // Garante q a lista base ta atualizada
        Button btn = (Button) event.getSource();
        String categoria = btn.getText();
        txtBuscaItemCombo.clear();

        if (categoria.equals("TODOS")) {
            cbProduto.setItems(FXCollections.observableArrayList(listaTodosProdutos));
        } else {
            cbProduto.setItems(FXCollections.observableArrayList(
                    listaTodosProdutos.stream()
                            .filter(p -> p.getCategoria() != null && p.getCategoria().equalsIgnoreCase(categoria))
                            .collect(Collectors.toList())
            ));
        }
        cbProduto.show();
    }

    @FXML
    public void adicionarItemReceita(ActionEvent event) {
        Produto produtoSelecionado = cbProduto.getValue();
        String qtdTexto = txtQtdItem.getText();

        if (produtoSelecionado == null || qtdTexto.isEmpty()) {
            mostrarAlerta("Atenção", "Selecione um produto e a quantidade!", Alert.AlertType.WARNING);
            return;
        }

        try {
            int qtd = Integer.parseInt(qtdTexto);
            ItemCombo novoItem = new ItemCombo(produtoSelecionado, qtd);
            tabelaItensCombo.getItems().add(novoItem);

            cbProduto.getSelectionModel().clearSelection();
            txtQtdItem.clear();
            txtBuscaItemCombo.clear();
        } catch (NumberFormatException e) {
            mostrarAlerta("Erro", "Quantidade inválida!", Alert.AlertType.ERROR);
        }
    }

    @FXML
    public void salvarCombo(ActionEvent event) {
        String nome = txtNomeCombo.getText();
        String precoStr = txtPrecoCombo.getText();
        List<ItemCombo> itensReceita = tabelaItensCombo.getItems();

        if (nome.isEmpty() || precoStr.isEmpty() || itensReceita.isEmpty()) {
            mostrarAlerta("Atenção", "Preencha todos os campos e adicione itens!", Alert.AlertType.WARNING);
            return;
        }

        try {
            Produto combo = new Produto();
            combo.setNome(nome);
            combo.setPrecoVenda(Double.parseDouble(precoStr.replace(",", ".")));
            combo.setTipoItem(TipoItem.COMBO);

            dao.salvarCombo(combo, itensReceita);

            mostrarAlerta("Sucesso", "Combo cadastrado com sucesso!", Alert.AlertType.INFORMATION);
            limparTela();
        } catch (NumberFormatException e) {
            mostrarAlerta("Erro", "Preço inválido!", Alert.AlertType.ERROR);
        }
    }

    private void limparTela() {
        txtNomeCombo.clear();
        txtPrecoCombo.clear();
        tabelaItensCombo.getItems().clear();
    }

    private void mostrarAlerta(String t, String m, Alert.AlertType tp) {
        Alert a = new Alert(tp);
        a.setTitle(t);
        a.setHeaderText(null);
        a.setContentText(m);
        a.showAndWait();
    }
}