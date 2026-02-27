package org.example.depositobebidassys.model;

// Representa a "receita" doq vai dentro de um kit/combo
public class ItemCombo {
    private Produto produto;
    private int quantidade;

    public ItemCombo(Produto produto, int quantidade) {
        this.produto = produto;
        this.quantidade = quantidade;
    }

    public Produto getProduto() {
        return produto;
    }

    public int getQuantidade() {
        return quantidade;
    }

    // O JavaFX (PropertyValueFactory) procura exatemente por esse nome pra preencher a coluna
    public String getNomeProduto() {
        return produto.getNome();
    }
}