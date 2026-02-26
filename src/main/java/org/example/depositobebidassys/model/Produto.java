package org.example.depositobebidassys.model;

public class Produto {
    private int id;
    private String nome;
    private String categoria;
    private TipoItem tipoItem;
    private String codigoBarras;
    private double precoCusto;
    private double precoVenda;
    private int estoqueAtual;

    public Produto() {}

    public Produto(String nome, String categoria, TipoItem tipoItem, String codigoBarras, double precoCusto, double precoVenda, int estoqueAtual) {
        this.nome = nome;
        this.categoria = categoria;
        this.tipoItem = tipoItem;
        this.codigoBarras = codigoBarras;
        this.precoCusto = precoCusto;
        this.precoVenda = precoVenda;
        this.estoqueAtual = estoqueAtual;
    }

    // Getters e Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public TipoItem getTipoItem() { return tipoItem; }
    public void setTipoItem(TipoItem tipoItem) { this.tipoItem = tipoItem; }
    public String getCodigoBarras() { return codigoBarras; }
    public void setCodigoBarras(String codigoBarras) { this.codigoBarras = codigoBarras; }
    public double getPrecoCusto() { return precoCusto; }
    public void setPrecoCusto(double precoCusto) { this.precoCusto = precoCusto; }
    public double getPrecoVenda() { return precoVenda; }
    public void setPrecoVenda(double precoVenda) { this.precoVenda = precoVenda; }
    public int getEstoqueAtual() { return estoqueAtual; }
    public void setEstoqueAtual(int estoqueAtual) { this.estoqueAtual = estoqueAtual; }

    @Override
    public String toString() {
        // Separação visual para facilitar a leitura no balcão
        String prefixo = (tipoItem == TipoItem.COMBO) ? "[COMBO] " : "[" + categoria + "] ";
        return prefixo + nome + " - R$ " + String.format("%.2f", precoVenda);
    }
}