package org.example.depositobebidassys.controller;

import javafx.fxml.FXML;
import javafx.scene.control.Alert;
import javafx.scene.control.ComboBox;
import javafx.scene.control.TextField;
import org.example.depositobebidassys.dao.ProdutoDAO;
import org.example.depositobebidassys.model.Produto;
import org.example.depositobebidassys.model.TipoItem;

public class ProdutoController {

    // Refs da tela
    @FXML private TextField txtNome;
    @FXML private ComboBox<String> cbCategoria;
    @FXML private TextField txtCodigoBarras;
    @FXML private TextField txtPrecoCusto;
    @FXML private TextField txtPrecoVenda;
    @FXML private TextField txtEstoque;
    @FXML private ComboBox<String> cbVolume;


    @FXML
    public void initialize() {

        // Populando categorias base
        cbCategoria.getItems().addAll(
                "Cerveja",
                "Refrigerante",
                "Água",
                "Gelo",
                "Gelo saboriazado",
                "Whisky",
                "Bourbon",
                "Licor",
                "Vodka",
                "Cachaça",
                "Gin",
                "Vinho e Espumante",
                "Energético",
                "Isotônico",
                "Suco",
                "Outros"
        );
        cbCategoria.setPromptText("Selecione a Categoria");

        // Setando os volumes pra concatenar dps
        cbVolume.getItems().addAll(
                "Lata 269ml",
                "Lata 350ml",
                "Lata 473ml",
                "Long Neck 330ml",
                "Long Neck 355ml",
                "Garrafa 300ml",
                "Garrafa 600ml",
                "Garrafa 750ml",
                "Garrafa 1L",
                "Garrafa 1.5L",
                "Garrafa 2L",
                "Pet 200ml",
                "Pet 250ml",
                "Pet 500ml",
                "Pet 600ml",
                "Gelo pequeno",
                "Gelo médio",
                "Gelo grande",
                "Unidade",
                "Caixa",
                "Fardo"
        );
        cbVolume.setPromptText("Selecione...");
    }

    @FXML
    public void onSalvar() {
        try {
            // Formata a string de volume
            String embalagem = cbVolume.getValue() != null ? " - " + cbVolume.getValue() : "";

            Produto p = new Produto();
            p.setNome(txtNome.getText() + embalagem);
            p.setCategoria(cbCategoria.getValue());

            String codigo = txtCodigoBarras.getText().trim();
            p.setCodigoBarras(codigo.isEmpty() ? null : codigo);
            p.setTipoItem(TipoItem.PRODUTO);

            // Replace esperto pra n crashar com double
            p.setPrecoCusto(Double.parseDouble(txtPrecoCusto.getText().replace(",", ".")));
            p.setPrecoVenda(Double.parseDouble(txtPrecoVenda.getText().replace(",", ".")));
            p.setEstoqueAtual(Integer.parseInt(txtEstoque.getText()));

            ProdutoDAO dao = new ProdutoDAO();
            boolean sucesso = dao.salvar(p);

            // UX silenciosa: limpa direto se der bom, avisa se der BO
            if (sucesso) {
                limparCampos();
            } else {
                mostrarAlerta("Erro ao Salvar", "Não foi possível cadastrar o produto no banco. Verifique se o código de barras já existe.", Alert.AlertType.ERROR);
            }

        } catch (NumberFormatException e) {
            mostrarAlerta("Erro de Digitação", "Verifique se digitou os preços e o estoque apenas com números.", Alert.AlertType.ERROR);
        }
    }

    private void limparCampos() {
        txtNome.clear();

        cbCategoria.getSelectionModel().clearSelection();
        cbCategoria.setPromptText("Selecione a Categoria");

        cbVolume.getSelectionModel().clearSelection();
        cbVolume.setPromptText("Selecione...");

        txtCodigoBarras.clear();
        txtPrecoCusto.clear();
        txtPrecoVenda.clear();
        txtEstoque.clear();

        // Volta o foco pro nome pra agilizar os próximos
        txtNome.requestFocus();
    }

    private void mostrarAlerta(String titulo, String mensagem, Alert.AlertType tipo) {
        Alert alert = new Alert(tipo);
        alert.setTitle(titulo);
        alert.setHeaderText(null);
        alert.setContentText(mensagem);
        alert.showAndWait();
    }
}