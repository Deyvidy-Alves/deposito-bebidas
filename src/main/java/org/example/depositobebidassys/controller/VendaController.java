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

public class VendaController {

    @FXML private ComboBox<Produto> cbProdutoVenda;
    @FXML private TextField txtQtdVenda;

    @FXML private TableView<ItemCarrinho> tabelaCarrinho;
    @FXML private TableColumn<ItemCarrinho, String> colNomeCarrinho;
    @FXML private TableColumn<ItemCarrinho, Integer> colQtdCarrinho;
    @FXML private TableColumn<ItemCarrinho, Double> colPrecoCarrinho;
    @FXML private TableColumn<ItemCarrinho, Double> colSubtotalCarrinho;
    @FXML private Label lblTotalVenda;
    private double descontoTotal = 0.0;

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

        if (produtoSelecionado == null || qtdTexto.isEmpty()) {
            mostrarAlerta("Atenção", "Selecione um produto!", Alert.AlertType.WARNING);
            return;
        }

        try {
            int qtdPedida = Integer.parseInt(qtdTexto);

            if (produtoSelecionado.getTipoItem() == TipoItem.PRODUTO) {
                if (produtoSelecionado.getEstoqueAtual() < qtdPedida) {
                    mostrarAlerta("Estoque Insuficiente",
                            "Você só tem " + produtoSelecionado.getEstoqueAtual() + " unidades de " + produtoSelecionado.getNome(),
                            Alert.AlertType.ERROR);
                    return;
                }
            }

            ItemCarrinho item = new ItemCarrinho(produtoSelecionado, qtdPedida);
            listaCarrinho.add(item);

            totalCompra += item.getSubtotal();
            lblTotalVenda.setText(String.format("R$ %.2f", totalCompra));

            txtQtdVenda.clear();
        } catch (NumberFormatException e) {
            mostrarAlerta("Erro", "Quantidade inválida!", Alert.AlertType.ERROR);
        }
    }

    @FXML
    public void finalizarVenda(ActionEvent event) {
        if (listaCarrinho.isEmpty()) {
            mostrarAlerta("Atenção", "O carrinho está vazio!", Alert.AlertType.WARNING);
            return;
        }

        // --- NOVO: Lógica Matemática do Lucro ---
        double lucroLiquidoTotal = 0.0;
        for (ItemCarrinho item : listaCarrinho) {
            double custoUnidade = item.getProduto().getPrecoCusto();
            double vendaUnidade = item.getProduto().getPrecoVenda();

            // Subtrai custo da venda e multiplica pela qtd de itens levados
            lucroLiquidoTotal += (vendaUnidade - custoUnidade) * item.getQuantidade();
        }

        VendaDAO vendaDAO = new VendaDAO();
        // --- NOVO: Passando o lucroLiquidoTotal para o DAO ---
        boolean sucesso = vendaDAO.registrarVenda(listaCarrinho, totalCompra, lucroLiquidoTotal);

        if (sucesso) {
            mostrarAlerta("Sucesso", "Venda finalizada! O estoque foi atualizado automaticamente.", Alert.AlertType.INFORMATION);
            listaCarrinho.clear();
            totalCompra = 0.0;
            lblTotalVenda.setText("R$ 0,00");
        } else {
            mostrarAlerta("Erro", "Ocorreu um erro ao registrar a venda. Veja o terminal.", Alert.AlertType.ERROR);
        }
    }

    @FXML
    public void removerDoCarrinho(ActionEvent event) {
        ItemCarrinho itemSelecionado = tabelaCarrinho.getSelectionModel().getSelectedItem();

        if (itemSelecionado == null) {
            mostrarAlerta("Atenção", "Selecione um item na tabela para remover!", Alert.AlertType.WARNING);
            return;
        }

        listaCarrinho.remove(itemSelecionado);
        totalCompra -= itemSelecionado.getSubtotal();
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

    @FXML
    public void aplicarDesconto(ActionEvent event) {
        if (listaCarrinho.isEmpty()) {
            mostrarAlerta("Atenção", "Adicione itens antes de dar desconto!", Alert.AlertType.WARNING);
            return;
        }

        TextInputDialog dialog = new TextInputDialog("0.00");
        dialog.setTitle("Aplicar Desconto");
        dialog.setHeaderText("Valor do desconto (R$):");
        dialog.getDialogPane().getStylesheets().add(getClass().getResource("/org/example/depositobebidassys/style.css").toExternalForm());

        dialog.showAndWait().ifPresent(valor -> {
            try {
                double desc = Double.parseDouble(valor.replace(",", "."));
                if (desc > totalCompra) {
                    mostrarAlerta("Erro", "Desconto não pode ser maior que a compra!", Alert.AlertType.ERROR);
                    return;
                }
                descontoTotal = desc;
                atualizarTotalFinal();
            } catch (NumberFormatException e) {
                mostrarAlerta("Erro", "Valor inválido!", Alert.AlertType.ERROR);
            }
        });
    }

    // metodo auxiliar para recalcular a tela
    private void atualizarTotalFinal() {
        double totalComDesconto = totalCompra - descontoTotal;
        lblTotalVenda.setText(String.format("R$ %.2f", totalComDesconto));
    }

}