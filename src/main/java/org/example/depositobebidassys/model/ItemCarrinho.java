package org.example.depositobebidassys.model;

// Classe simples pra segurar oq tá no carrinho antes de bater a venda
public class ItemCarrinho {
    private Produto produto;
    private int quantidade;

    public ItemCarrinho(Produto produto, int quantidade) {
        this.produto = produto;
        this.quantidade = quantidade;
    }

    public Produto getProduto() { return produto; }
    public int getQuantidade() { return quantidade; }

    // Atalhos pro JavaFX conseguir puxar direto pra grid da tabela
    public String getNomeProduto() { return produto.getNome(); }
    public double getPrecoUnitario() { return produto.getPrecoVenda(); }

    // Já devolve a conta feita daquele item especifico
    public double getSubtotal() { return produto.getPrecoVenda() * quantidade; }
}