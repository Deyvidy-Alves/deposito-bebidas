package org.example.depositobebidassys.controller;

import javafx.fxml.FXML;
import javafx.scene.control.Alert;
import javafx.scene.control.ComboBox;
import javafx.scene.control.TextField;
import org.example.depositobebidassys.dao.ProdutoDAO;
import org.example.depositobebidassys.model.Produto;
import org.example.depositobebidassys.model.TipoItem;

public class ProdutoController {

    // O @FXML "linka" a variável do Java com o campo de texto lá na tela
    @FXML private TextField txtNome;
    @FXML private ComboBox<String> cbCategoria;
    @FXML private TextField txtCodigoBarras;
    @FXML private TextField txtPrecoCusto;
    @FXML private TextField txtPrecoVenda;
    @FXML private TextField txtEstoque;
    @FXML private ComboBox<String> cbVolume;


    @FXML
    public void initialize() {

        // Categorias padronizadas
        cbCategoria.getItems().addAll(
                "Cerveja",
                "Refrigerante",
                "Água",
                "Gelo",
                "Whisky",
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

        // Litragens e Embalagens 100% separadas
        cbVolume.getItems().addAll(
                "Lata 269ml",
                "Lata 350ml",
                "Lata 473ml",
                "Long Neck 330ml",
                "Long Neck 355ml",
                "Garrafa 300ml",
                "Garrafa 600ml",
                "Litrão 1L",
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
            // Pega a embalagem e coloca um tracinho antes. Se estiver vazio, não põe nada.
            String embalagem = cbVolume.getValue() != null ? " - " + cbVolume.getValue() : "";

            // 1. Pega os textos que o usuário digitou na tela e monta o objeto
            Produto p = new Produto();
            p.setNome(txtNome.getText() + embalagem);
            p.setCategoria(cbCategoria.getValue());
            String codigo = txtCodigoBarras.getText().trim();
            p.setCodigoBarras(codigo.isEmpty() ? null : codigo);
            p.setTipoItem(TipoItem.PRODUTO);

            // O replace(",", ".") garante que não vai dar erro se digitar R$ 7,50 com vírgula
            p.setPrecoCusto(Double.parseDouble(txtPrecoCusto.getText().replace(",", ".")));
            p.setPrecoVenda(Double.parseDouble(txtPrecoVenda.getText().replace(",", ".")));
            p.setEstoqueAtual(Integer.parseInt(txtEstoque.getText()));

            // 2. Chama o nosso DAO para gravar no SQLite
            ProdutoDAO dao = new ProdutoDAO();
            dao.salvar(p);

            // 3. Mostra um aviso na tela e limpa os campos para o próximo cadastro
            mostrarAlerta("Sucesso", "Produto cadastrado com sucesso!", Alert.AlertType.INFORMATION);
            limparCampos();

        } catch (NumberFormatException e) {
            // Se ele digitar "abc" no preço, o Try/Catch segura o erro e avisa sem o sistema "crashar"
            mostrarAlerta("Erro de Digitação", "Verifique se digitou os preços e o estoque apenas com números.", Alert.AlertType.ERROR);
        }
    }

    private void limparCampos() {
        txtNome.clear();

        // Limpeza dos ComboBoxes
        cbCategoria.getSelectionModel().clearSelection();
        cbCategoria.setPromptText("Selecione a Categoria");

        cbVolume.getSelectionModel().clearSelection();
        cbVolume.setPromptText("Selecione...");

        txtCodigoBarras.clear();
        txtPrecoCusto.clear();
        txtPrecoVenda.clear();
        txtEstoque.clear();

        // Coloca o cursor de volta no início para o próximo cadastro
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