package org.example.depositobebidassys.controller;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.collections.transformation.FilteredList;
import javafx.collections.transformation.SortedList;
import javafx.event.ActionEvent; // Corrigido para JavaFX
import javafx.fxml.FXML;
import javafx.scene.control.*;
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
    @FXML private TextField txtFiltro;

    private ProdutoDAO dao = new ProdutoDAO();
    private ObservableList<Produto> listaMaster = FXCollections.observableArrayList();

    @FXML
    public void initialize() {
        // Mapeamento das colunas da tabela com os atributos da classe Produto
        colID.setCellValueFactory(new PropertyValueFactory<>("id"));
        colNome.setCellValueFactory(new PropertyValueFactory<>("nome"));
        colCategoria.setCellValueFactory(new PropertyValueFactory<>("categoria"));
        colEstoque.setCellValueFactory(new PropertyValueFactory<>("estoqueAtual"));
        colVenda.setCellValueFactory(new PropertyValueFactory<>("precoVenda"));

        atualizarTabela();
    }

    @FXML
    public void atualizarTabela() {
        // Sincroniza a lista master com os dados mais recentes do SQLite
        listaMaster.setAll(dao.listarTodos());

        // Implementação do Predicate para o filtro em tempo real
        FilteredList<Produto> dadosFiltrados = new FilteredList<>(listaMaster, p -> true);

        txtFiltro.textProperty().addListener((observable, valorAntigo, valorNovo) -> {
            dadosFiltrados.setPredicate(produto -> {
                if (valorNovo == null || valorNovo.isEmpty()) {
                    return true;
                }

                String filtroEmMinusculo = valorNovo.toLowerCase();

                // Filtro lógico por nome ou categoria
                if (produto.getNome().toLowerCase().contains(filtroEmMinusculo)) {
                    return true;
                } else if (produto.getCategoria().toLowerCase().contains(filtroEmMinusculo)) {
                    return true;
                }

                return false;
            });
        });

        // Mantém a funcionalidade de ordenação das colunas ativa após o filtro
        SortedList<Produto> dadosOrdenados = new SortedList<>(dadosFiltrados);
        dadosOrdenados.comparatorProperty().bind(tabelaProdutos.comparatorProperty());

        tabelaProdutos.setItems(dadosOrdenados);
    }

    @FXML
    public void deletarProduto(ActionEvent event) {
        Produto selecionado = tabelaProdutos.getSelectionModel().getSelectedItem();

        if (selecionado == null) {
            mostrarAlerta("Atenção", "Selecione um item na tabela para excluir!", Alert.AlertType.WARNING);
            return;
        }

        // Modal de confirmação para evitar deleções acidentais no PDV
        Alert confirma = new Alert(Alert.AlertType.CONFIRMATION);
        confirma.setTitle("Confirmar Exclusão");
        confirma.setHeaderText("Deseja realmente excluir: " + selecionado.getNome() + "?");

        if (confirma.showAndWait().get() == ButtonType.OK) {
            dao.excluir(selecionado.getId());
            atualizarTabela();
        }
    }

    @FXML
    public void prepararEdicao(ActionEvent event) {
        Produto selecionado = tabelaProdutos.getSelectionModel().getSelectedItem();

        if (selecionado == null) {
            mostrarAlerta("Atenção", "Selecione um item para editar!", Alert.AlertType.WARNING);
            return;
        }

        // Dialog para alteração rápida de preço de venda via interface
        TextInputDialog dialog = new TextInputDialog(String.valueOf(selecionado.getPrecoVenda()));
        dialog.setTitle("Editar Preço");
        dialog.setHeaderText("Novo preço para: " + selecionado.getNome());
        dialog.setContentText("Preço R$:");

        dialog.showAndWait().ifPresent(novoPreco -> {
            try {
                selecionado.setPrecoVenda(Double.parseDouble(novoPreco));
                dao.atualizar(selecionado);
                atualizarTabela();
            } catch (NumberFormatException e) {
                mostrarAlerta("Erro", "Digite um valor numérico válido!", Alert.AlertType.ERROR);
            }
        });
    }

    // Mwodo utilitário para centralizar as chamadas de diálogos do sistema
    private void mostrarAlerta(String titulo, String mensagem, Alert.AlertType tipo) {
        Alert alert = new Alert(tipo);
        alert.setTitle(titulo);
        alert.setHeaderText(null);
        alert.setContentText(mensagem);
        alert.showAndWait();
    }
}