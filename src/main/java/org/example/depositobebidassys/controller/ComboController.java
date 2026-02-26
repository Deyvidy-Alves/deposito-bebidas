package org.example.depositobebidassys.controller;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import org.example.depositobebidassys.dao.ProdutoDAO;
import org.example.depositobebidassys.model.ItemCombo;
import org.example.depositobebidassys.model.Produto;
import org.example.depositobebidassys.model.TipoItem;

import java.util.List;

public class ComboController {

    // --- CAMPOS DA TELA ---
    @FXML private TextField txtNomeCombo;
    @FXML private TextField txtPrecoCombo;
    @FXML private ComboBox<Produto> cbProduto;
    @FXML private TextField txtQuantidade;

    // --- TABELA ---
    @FXML private TableView<ItemCombo> tabelaItens;
    @FXML private TableColumn<ItemCombo, String> colNomeItem;
    @FXML private TableColumn<ItemCombo, Integer> colQtdItem;

    private ProdutoDAO dao = new ProdutoDAO();

    @FXML
    public void initialize() {
        // 1. Configura a Tabela para saber ler a nossa classe ItemCombo
        colNomeItem.setCellValueFactory(new PropertyValueFactory<>("nomeProduto"));
        colQtdItem.setCellValueFactory(new PropertyValueFactory<>("quantidade"));

        // 2. Carrega as bebidas na caixinha
        atualizarListaProdutos();
        cbProduto.setOnShowing(event -> atualizarListaProdutos());
    }

    private void atualizarListaProdutos() {
        List<Produto> listaDeProdutos = dao.listarTodos();
        ObservableList<Produto> produtosParaTela = FXCollections.observableArrayList(listaDeProdutos);
        cbProduto.setItems(produtosParaTela);
    }

    // 👇 AQUI ESTÁ A LÓGICA DO BOTÃO + INCLUIR ITEM 👇
    @FXML
    public void adicionarItem(ActionEvent event) {
        Produto produtoSelecionado = cbProduto.getValue();
        String qtdTexto = txtQuantidade.getText();

        // Verifica se ele esqueceu de preencher algo
        if (produtoSelecionado == null || qtdTexto == null || qtdTexto.isEmpty()) {
            mostrarAlerta("Atenção", "Selecione um produto e digite a quantidade!", Alert.AlertType.WARNING);
            return;
        }

        try {
            int qtd = Integer.parseInt(qtdTexto);

            // Cria o item da receita e joga dentro da tabela
            ItemCombo novoItem = new ItemCombo(produtoSelecionado, qtd);
            tabelaItens.getItems().add(novoItem);

            // Limpa a caixinha e a quantidade para ele adicionar o próximo item do combo
            cbProduto.getSelectionModel().clearSelection();
            txtQuantidade.clear();

        } catch (NumberFormatException e) {
            mostrarAlerta("Erro", "A quantidade deve ser um número inteiro (Ex: 1, 2, 5).", Alert.AlertType.ERROR);
        }
    }

    @FXML
    public void salvarCombo(ActionEvent event) {
        String nome = txtNomeCombo.getText();
        String precoStr = txtPrecoCombo.getText();

        // Pega tudo que você adicionou na tabelinha de baixo
        List<ItemCombo> itensReceita = tabelaItens.getItems();

        // Validação de segurança
        if (nome.isEmpty() || precoStr.isEmpty() || itensReceita.isEmpty()) {
            mostrarAlerta("Atenção", "Preencha o nome, o preço e adicione pelo menos um item na receita!", Alert.AlertType.WARNING);
            return;
        }

        try {
            Produto combo = new Produto();
            combo.setNome(nome);
            // Garante que a vírgula vai virar ponto pro banco de dados não chorar
            combo.setPrecoVenda(Double.parseDouble(precoStr.replace(",", ".")));
            combo.setTipoItem(TipoItem.COMBO);

            // Manda pro banco!
            dao.salvarCombo(combo, itensReceita);

            mostrarAlerta("Sucesso", "Combo cadastrado com sucesso!", Alert.AlertType.INFORMATION);

            // Limpa a tela pro próximo combo
            txtNomeCombo.clear();
            txtPrecoCombo.clear();
            tabelaItens.getItems().clear();

        } catch (NumberFormatException e) {
            mostrarAlerta("Erro", "Digite um valor válido para o preço.", Alert.AlertType.ERROR);
        }
    }

    private void mostrarAlerta(String titulo, String mensagem, Alert.AlertType tipo) {
        Alert alert = new Alert(tipo);
        alert.setTitle(titulo);
        alert.setHeaderText(null);
        alert.setContentText(mensagem);
        alert.showAndWait();
    }
}