package org.example.depositobebidassys.controller;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.util.StringConverter;
import org.example.depositobebidassys.dao.ProdutoDAO;
import org.example.depositobebidassys.dao.VendaDAO;
import org.example.depositobebidassys.model.ItemCarrinho;
import org.example.depositobebidassys.model.Produto;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

public class VendaController {

    @FXML private TextField txtBuscaProduto;
    @FXML private ComboBox<Produto> cbProdutoVenda;
    @FXML private TextField txtQtdVenda;
    @FXML private ComboBox<String> cbMetodoPagamento;

    @FXML private TableView<ItemCarrinho> tabelaCarrinho;
    @FXML private TableColumn<ItemCarrinho, String> colNomeCarrinho;
    @FXML private TableColumn<ItemCarrinho, Integer> colQtdCarrinho;
    @FXML private TableColumn<ItemCarrinho, Double> colPrecoCarrinho;
    @FXML private TableColumn<ItemCarrinho, Double> colSubtotalCarrinho;

    @FXML private Label lblTotalVenda;

    // Controls e instâncias de BD
    private ProdutoDAO dao = new ProdutoDAO();
    private VendaDAO vendaDao = new VendaDAO();
    private List<Produto> listaTodosProdutos;
    private ObservableList<ItemCarrinho> itensCarrinho = FXCollections.observableArrayList();

    private double valorTotal = 0.0;
    private double valorDesconto = 0.0;
    private double custoTotal = 0.0;

    @FXML
    public void initialize() {
        // Setup da grid
        colNomeCarrinho.setCellValueFactory(new PropertyValueFactory<>("nomeProduto"));
        colQtdCarrinho.setCellValueFactory(new PropertyValueFactory<>("quantidade"));
        colPrecoCarrinho.setCellValueFactory(new PropertyValueFactory<>("precoUnitario"));
        colSubtotalCarrinho.setCellValueFactory(new PropertyValueFactory<>("subtotal"));

        tabelaCarrinho.setItems(itensCarrinho);

        // Opções de PG
        cbMetodoPagamento.setItems(FXCollections.observableArrayList(
                "Dinheiro", "PIX", "Cartão de Crédito", "Cartão de Débito", "Fiado/Marcado"
        ));
        cbMetodoPagamento.getSelectionModel().selectFirst();

        carregarProdutos();

        // Ensina o visual do combobox a extrair o nome e preço do obj
        cbProdutoVenda.setConverter(new StringConverter<Produto>() {
            @Override
            public String toString(Produto p) {
                return p == null ? "" : p.getNome() + " - R$ " + String.format("%.2f", p.getPrecoVenda()) + " (Est: " + p.getEstoqueAtual() + ")";
            }
            @Override
            public Produto fromString(String s) { return null; }
        });

        // Trigger pra filtrar digitando
        txtBuscaProduto.textProperty().addListener((obs, antigo, novo) -> {
            carregarProdutos();
            if (novo == null || novo.isEmpty()) {
                cbProdutoVenda.setItems(FXCollections.observableArrayList(listaTodosProdutos));
            } else {
                String busca = novo.toLowerCase();
                List<Produto> filtrados = listaTodosProdutos.stream()
                        .filter(p -> p.getNome().toLowerCase().contains(busca) ||
                                (p.getCategoria() != null && p.getCategoria().toLowerCase().contains(busca)))
                        .collect(Collectors.toList());
                cbProdutoVenda.setItems(FXCollections.observableArrayList(filtrados));
                if (!filtrados.isEmpty()) cbProdutoVenda.show();
            }
        });
    }

    private void carregarProdutos() {
        listaTodosProdutos = dao.listarTodos();
    }

    @FXML
    private void filtrarPorBotao(ActionEvent event) {
        carregarProdutos(); // Traz att do banco
        Button btn = (Button) event.getSource();
        String categoria = btn.getText();
        txtBuscaProduto.clear();

        if (categoria.equals("TODOS")) {
            cbProdutoVenda.setItems(FXCollections.observableArrayList(listaTodosProdutos));
        } else if (categoria.equals("COMBO")) {
            cbProdutoVenda.setItems(FXCollections.observableArrayList(
                    listaTodosProdutos.stream()
                            .filter(p -> p.getTipoItem() != null && p.getTipoItem().toString().equals("COMBO"))
                            .collect(Collectors.toList())
            ));
        } else {
            cbProdutoVenda.setItems(FXCollections.observableArrayList(
                    listaTodosProdutos.stream()
                            .filter(p -> p.getCategoria() != null && p.getCategoria().equalsIgnoreCase(categoria))
                            .collect(Collectors.toList())
            ));
        }
        cbProdutoVenda.show();
    }

    @FXML
    public void adicionarAoCarrinho(ActionEvent event) {
        Produto produtoSelecionado = cbProdutoVenda.getValue();
        String qtdTexto = txtQtdVenda.getText();

        if (produtoSelecionado == null || qtdTexto.isEmpty()) {
            mostrarAlerta("Atenção", "Selecione um produto e informe a quantidade!", Alert.AlertType.WARNING);
            return;
        }

        try {
            int qtd = Integer.parseInt(qtdTexto);
            if (qtd <= 0) throw new NumberFormatException();

            // Seta no carrinho usando o construtor do model
            ItemCarrinho item = new ItemCarrinho(produtoSelecionado, qtd);
            itensCarrinho.add(item);

            atualizarTotais();

            // Prepara a tela pro próximo bip
            cbProdutoVenda.getSelectionModel().clearSelection();
            txtQtdVenda.setText("1");
            txtBuscaProduto.clear();

        } catch (NumberFormatException e) {
            mostrarAlerta("Erro", "A quantidade deve ser um número inteiro válido!", Alert.AlertType.ERROR);
        }
    }

    @FXML
    public void removerDoCarrinho(ActionEvent event) {
        ItemCarrinho selecionado = tabelaCarrinho.getSelectionModel().getSelectedItem();
        if (selecionado != null) {
            itensCarrinho.remove(selecionado);
            atualizarTotais();
        } else {
            mostrarAlerta("Atenção", "Selecione um item na tabela para remover.", Alert.AlertType.WARNING);
        }
    }

    @FXML
    public void aplicarDesconto(ActionEvent event) {
        TextInputDialog dialog = new TextInputDialog("0.00");
        dialog.setTitle("Aplicar Desconto");
        dialog.setHeaderText("Desconto na Venda");
        dialog.setContentText("Informe o valor do desconto em R$:");

        dialog.getDialogPane().getStylesheets().add(getClass().getResource("/org/example/depositobebidassys/style.css").toExternalForm());

        Optional<String> result = dialog.showAndWait();
        result.ifPresent(valor -> {
            try {
                valorDesconto = Double.parseDouble(valor.replace(",", "."));
                atualizarTotais();
            } catch (NumberFormatException e) {
                mostrarAlerta("Erro", "Valor de desconto inválido!", Alert.AlertType.ERROR);
            }
        });
    }

    private void atualizarTotais() {
        valorTotal = 0.0;
        custoTotal = 0.0;

        for (ItemCarrinho item : itensCarrinho) {
            valorTotal += item.getSubtotal();
            custoTotal += (item.getProduto().getPrecoCusto() * item.getQuantidade());
        }

        valorTotal -= valorDesconto;
        if (valorTotal < 0) valorTotal = 0;

        lblTotalVenda.setText(String.format("R$ %.2f", valorTotal));
    }

    @FXML
    public void finalizarVenda(ActionEvent event) {
        if (itensCarrinho.isEmpty()) {
            mostrarAlerta("Atenção", "O carrinho está vazio!", Alert.AlertType.WARNING);
            return;
        }

        String metodoPagamento = cbMetodoPagamento.getValue();
        double lucroLiquido = valorTotal - custoTotal;

        boolean sucesso = vendaDao.registrarVenda(itensCarrinho, valorTotal, lucroLiquido, metodoPagamento);

        if (sucesso) {
            mostrarAlerta("Sucesso", "Venda finalizada com sucesso!", Alert.AlertType.INFORMATION);
            limparCaixa();
        } else {
            mostrarAlerta("Erro", "Ocorreu um erro ao registrar a venda no banco de dados.", Alert.AlertType.ERROR);
        }
    }

    private void limparCaixa() {
        itensCarrinho.clear();
        txtBuscaProduto.clear();
        cbProdutoVenda.getSelectionModel().clearSelection();
        txtQtdVenda.setText("1");
        cbMetodoPagamento.getSelectionModel().selectFirst();
        valorDesconto = 0.0;
        atualizarTotais();
        carregarProdutos(); // Garante q a view do estoque bate com o banco post-venda
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