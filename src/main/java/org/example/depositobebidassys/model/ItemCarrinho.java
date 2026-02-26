package org.example.depositobebidassys.model;

public class ItemCarrinho {
    private Produto produto;
    private int quantidade;

    public ItemCarrinho(Produto produto, int quantidade) {
        this.produto = produto;
        this.quantidade = quantidade;
    }

    public Produto getProduto() { return produto; }
    public int getQuantidade() { return quantidade; }
    public String getNomeProduto() { return produto.getNome(); }
    public double getPrecoUnitario() { return produto.getPrecoVenda(); }
    public double getSubtotal() { return produto.getPrecoVenda() * quantidade; }
}