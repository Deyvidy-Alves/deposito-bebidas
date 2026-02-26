package org.example.depositobebidassys.model;

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

    // A tabela vai procurar por esse método para preencher a coluna de "Produto"
    public String getNomeProduto() {
        return produto.getNome();
    }
}