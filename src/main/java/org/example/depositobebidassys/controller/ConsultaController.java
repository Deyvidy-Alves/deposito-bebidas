package org.example.depositobebidassys.controller;

import javafx.animation.FadeTransition;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.collections.transformation.FilteredList;
import javafx.collections.transformation.SortedList;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.layout.GridPane;
import javafx.util.Duration;
import org.example.depositobebidassys.dao.ProdutoDAO;
import org.example.depositobebidassys.model.Produto;
import org.example.depositobebidassys.model.TipoItem;

public class ConsultaController {

    @FXML private TableView<Produto> tabelaProdutos;
    @FXML private TableColumn<Produto, Integer> colID;
    @FXML private TableColumn<Produto, String> colNome;
    @FXML private TableColumn<Produto, String> colCategoria;
    @FXML private TableColumn<Produto, Integer> colEstoque;
    @FXML private TableColumn<Produto, Double> colVenda;
    @FXML private TextField txtFiltro;
    @FXML private Label lblStatus;
    @FXML private TableColumn<Produto, Double> colCusto;

    private ProdutoDAO dao = new ProdutoDAO();
    private ObservableList<Produto> listaMaster = FXCollections.observableArrayList();

    @FXML
    public void initialize() {
        // Binda as colunas da tabela
        colID.setCellValueFactory(new PropertyValueFactory<>("id"));
        colNome.setCellValueFactory(new PropertyValueFactory<>("nome"));
        colCategoria.setCellValueFactory(new PropertyValueFactory<>("categoria"));
        colEstoque.setCellValueFactory(new PropertyValueFactory<>("estoqueAtual"));
        colVenda.setCellValueFactory(new PropertyValueFactory<>("precoVenda"));
        colCusto.setCellValueFactory(new PropertyValueFactory<>("precoCusto"));

        tabelaProdutos.getSelectionModel().setSelectionMode(SelectionMode.MULTIPLE);

        // Pinta a linha de vermelho se o estoque tiver baixo (menos q 10)
        tabelaProdutos.setRowFactory(tv -> new TableRow<Produto>() {
            @Override
            protected void updateItem(Produto item, boolean empty) {
                super.updateItem(item, empty);
                if (item == null || empty) {
                    setStyle("");
                } else if (item.getTipoItem() != TipoItem.COMBO && item.getEstoqueAtual() < 10) {
                    setStyle("-fx-background-color: rgba(207, 102, 121, 0.15); -fx-border-color: #cf6679;");
                } else {
                    setStyle("");
                }
            }
        });

        atualizarTabela();
    }

    @FXML
    public void atualizarTabela() {
        listaMaster.setAll(dao.listarTodos());
        FilteredList<Produto> dadosFiltrados = new FilteredList<>(listaMaster, p -> true);

        txtFiltro.textProperty().addListener((observable, valorAntigo, valorNovo) -> {
            dadosFiltrados.setPredicate(produto -> {
                if (valorNovo == null || valorNovo.isEmpty()) return true;
                String filtro = valorNovo.toLowerCase();
                return produto.getNome().toLowerCase().contains(filtro) ||
                        produto.getCategoria().toLowerCase().contains(filtro);
            });
        });

        SortedList<Produto> dadosOrdenados = new SortedList<>(dadosFiltrados);
        dadosOrdenados.comparatorProperty().bind(tabelaProdutos.comparatorProperty());
        tabelaProdutos.setItems(dadosOrdenados);
    }

    @FXML
    public void deletarEmLote(ActionEvent event) {
        ObservableList<Produto> selecionados = tabelaProdutos.getSelectionModel().getSelectedItems();
        if (selecionados.isEmpty()) {
            mostrarToast("⚠️ Selecione os itens primeiro!");
            return;
        }

        Alert confirma = new Alert(Alert.AlertType.CONFIRMATION);
        confirma.setTitle("Excluir em Lote");
        confirma.setHeaderText("Apagar " + selecionados.size() + " itens selecionados?");

        // Injeta o CSS pra não quebrar o layout no modo dark
        confirma.getDialogPane().getStylesheets().add(getClass().getResource("/org/example/depositobebidassys/style.css").toExternalForm());

        if (confirma.showAndWait().get() == ButtonType.OK) {
            for (Produto p : selecionados) {
                dao.excluir(p.getId());
            }
            atualizarTabela();
            mostrarToast("✅ " + selecionados.size() + " itens removidos!");
        }
    }

    private void mostrarToast(String mensagem) {
        lblStatus.setText(mensagem);
        lblStatus.setOpacity(1.0);
        FadeTransition fade = new FadeTransition(Duration.seconds(2), lblStatus);
        fade.setFromValue(1.0);
        fade.setToValue(0.0);
        fade.setDelay(Duration.seconds(1));
        fade.play();
    }

    @FXML
    public void prepararEdicao(ActionEvent event) {
        Produto selecionado = tabelaProdutos.getSelectionModel().getSelectedItem();

        if (selecionado == null) {
            mostrarToast("⚠️ Selecione um item para editar!");
            return;
        }

        Dialog<ButtonType> dialog = new Dialog<>();
        dialog.setTitle("Ajuste de Produto");
        dialog.setHeaderText("Editando: " + selecionado.getNome());

        dialog.getDialogPane().getStylesheets().add(getClass().getResource("/org/example/depositobebidassys/style.css").toExternalForm());

        ButtonType botaoSalvar = new ButtonType("Salvar", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(botaoSalvar, ButtonType.CANCEL);

        GridPane grid = new GridPane();
        grid.setHgap(10); grid.setVgap(10);
        grid.setPadding(new javafx.geometry.Insets(20, 150, 10, 10));

        TextField txtNome = new TextField(selecionado.getNome());
        TextField txtCusto = new TextField(String.valueOf(selecionado.getPrecoCusto()));
        TextField txtPreco = new TextField(String.valueOf(selecionado.getPrecoVenda()));
        TextField txtEstoque = new TextField(String.valueOf(selecionado.getEstoqueAtual()));

        grid.add(new Label("Nome:"), 0, 0); grid.add(txtNome, 1, 0);
        grid.add(new Label("Custo R$:"), 0, 1); grid.add(txtCusto, 1, 1);
        grid.add(new Label("Venda R$:"), 0, 2); grid.add(txtPreco, 1, 2);
        grid.add(new Label("Estoque:"), 0, 3); grid.add(txtEstoque, 1, 3);

        dialog.getDialogPane().setContent(grid);

        dialog.showAndWait().ifPresent(response -> {
            if (response == botaoSalvar) {
                try {
                    selecionado.setNome(txtNome.getText());
                    selecionado.setPrecoCusto(Double.parseDouble(txtCusto.getText().replace(",", ".")));
                    selecionado.setPrecoVenda(Double.parseDouble(txtPreco.getText().replace(",", ".")));
                    selecionado.setEstoqueAtual(Integer.parseInt(txtEstoque.getText()));

                    dao.atualizar(selecionado);
                    atualizarTabela();
                    mostrarToast("✅ Produto atualizado!");
                } catch (NumberFormatException e) {
                    mostrarToast("❌ Valores inválidos!");
                }
            }
        });
    }

    private void mostrarAlerta(String titulo, String mensagem, Alert.AlertType tipo) {
        Alert alert = new Alert(tipo);
        alert.setTitle(titulo);
        alert.setHeaderText(null);
        alert.setContentText(mensagem);
        alert.getDialogPane().getStylesheets().add(getClass().getResource("/org/example/depositobebidassys/style.css").toExternalForm());
        alert.showAndWait();
    }
}