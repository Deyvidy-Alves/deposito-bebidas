package org.example.depositobebidassys.controller;

import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.chart.*;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.util.Duration;
import org.example.depositobebidassys.dao.RelatorioDAO;
import org.example.depositobebidassys.dao.VendaDAO;
import org.example.depositobebidassys.service.PDFService;

import java.time.LocalDate;
import java.util.Map;
import java.util.List;
import java.util.stream.Collectors;

public class RelatorioController {

    @FXML private DatePicker dpInicio, dpFim;
    @FXML private Label lblFaturamento, lblLucro, lblQtdVendas, lblTicketMedio, lblTotalFiltrado;
    @FXML private ComboBox<String> cbFiltroMetodo;
    @FXML private AreaChart<String, Number> graficoEvolucao;
    @FXML private PieChart graficoTopProdutos;

    @FXML private TableView<VendaHistorico> tabelaHistorico;
    @FXML private TableColumn<VendaHistorico, String> colDataHora, colMetodo, colDescricao;
    @FXML private TableColumn<VendaHistorico, Integer> colIdVenda;
    @FXML private TableColumn<VendaHistorico, Double> colValorTotal, colLucro;

    private RelatorioDAO dao = new RelatorioDAO();
    private List<VendaHistorico> listaOriginal;
    private Timeline autoUpdater;

    @FXML
    public void initialize() {
        dpFim.setValue(LocalDate.now());
        dpInicio.setValue(LocalDate.now().minusDays(7));

        cbFiltroMetodo.setItems(FXCollections.observableArrayList("Todos", "Dinheiro", "PIX", "Cartão Débito", "Cartão Crédito"));
        cbFiltroMetodo.setValue("Todos");

        // Binding das colunas
        colDataHora.setCellValueFactory(new PropertyValueFactory<>("dataHora"));
        colIdVenda.setCellValueFactory(new PropertyValueFactory<>("idVenda"));
        colMetodo.setCellValueFactory(new PropertyValueFactory<>("metodoPagamento"));
        colDescricao.setCellValueFactory(new PropertyValueFactory<>("descricao"));
        colValorTotal.setCellValueFactory(new PropertyValueFactory<>("valorTotal"));
        colLucro.setCellValueFactory(new PropertyValueFactory<>("lucro"));

        filtrarDados();

        // Polling basico a cada 5s
        autoUpdater = new Timeline(new KeyFrame(Duration.seconds(5), e -> filtrarDados()));
        autoUpdater.setCycleCount(Timeline.INDEFINITE);
        autoUpdater.play();
    }

    @FXML
    public void aplicarFiltroMetodo(ActionEvent event) {
        if (listaOriginal == null) return;
        String selecionado = cbFiltroMetodo.getValue();
        List<VendaHistorico> filtrada = (selecionado == null || selecionado.equals("Todos")) ? listaOriginal :
                listaOriginal.stream().filter(v -> v.getMetodoPagamento().equals(selecionado)).collect(Collectors.toList());

        tabelaHistorico.setItems(FXCollections.observableArrayList(filtrada));
        double soma = filtrada.stream().mapToDouble(VendaHistorico::getValorTotal).sum();
        lblTotalFiltrado.setText(String.format("Total: R$ %.2f", soma));
    }

    @FXML
    public void realizarEstorno(ActionEvent event) {
        VendaHistorico selecionada = tabelaHistorico.getSelectionModel().getSelectedItem();
        if (selecionada == null) return;

        Alert confirm = new Alert(Alert.AlertType.CONFIRMATION, "Deseja estornar a venda " + selecionada.getIdVenda() + "?");
        confirm.getDialogPane().getStylesheets().add(getClass().getResource("/org/example/depositobebidassys/style.css").toExternalForm());

        if (confirm.showAndWait().get() == ButtonType.OK) {
            if (new VendaDAO().estornarVenda(selecionada.getIdVenda())) {
                filtrarDados();
            }
        }
    }

    @FXML
    public void exportarRelatorioPDF(ActionEvent event) {
        new PDFService().gerarRelatorioVendas(
                tabelaHistorico.getItems(),
                lblFaturamento.getText(),
                lblLucro.getText()
        );

        Alert info = new Alert(Alert.AlertType.INFORMATION, "PDF gerado com sucesso em Documentos/PDFsDeposito!");
        info.getDialogPane().getStylesheets().add(getClass().getResource("/org/example/depositobebidassys/style.css").toExternalForm());
        info.show();
    }

    @FXML public void filtrarDadosForcado(ActionEvent event) { filtrarDados(); }

    private void filtrarDados() {
        LocalDate inicio = dpInicio.getValue();
        LocalDate fim = dpFim.getValue();
        if (inicio == null || fim == null) return;

        double[] kpis = dao.buscarKpis(inicio, fim);
        double ticketMedio = (kpis[2] > 0) ? (kpis[0] / kpis[2]) : 0.0;

        lblFaturamento.setText(String.format("R$ %.2f", kpis[0]));
        lblLucro.setText(String.format("R$ %.2f", kpis[1]));
        lblQtdVendas.setText(String.valueOf((int) kpis[2]));
        lblTicketMedio.setText(String.format("R$ %.2f", ticketMedio));

        atualizarGraficoLinha(inicio, fim);
        atualizarGraficoPizza(inicio, fim);

        listaOriginal = dao.buscarHistoricoVendas(inicio, fim);
        aplicarFiltroMetodo(null);
    }

    private void atualizarGraficoLinha(LocalDate inicio, LocalDate fim) {
        graficoEvolucao.getData().clear();
        XYChart.Series<String, Number> serie = new XYChart.Series<>();
        Map<String, Double> dados = dao.buscarEvolucaoVendas(inicio, fim);
        for (Map.Entry<String, Double> entry : dados.entrySet()) {
            serie.getData().add(new XYChart.Data<>(entry.getKey(), entry.getValue()));
        }
        graficoEvolucao.getData().add(serie);
    }

    private void atualizarGraficoPizza(LocalDate inicio, LocalDate fim) {
        graficoTopProdutos.getData().clear();
        ObservableList<PieChart.Data> dadosPizza = FXCollections.observableArrayList();
        Map<String, Integer> top = dao.buscarTopProdutos(inicio, fim);

        for (Map.Entry<String, Integer> entry : top.entrySet()) {
            dadosPizza.add(new PieChart.Data(entry.getKey() + " (" + entry.getValue() + ")", entry.getValue()));
        }

        graficoTopProdutos.setData(dadosPizza);
    }

    public static class VendaHistorico {
        private String dataHora, metodoPagamento, descricao;
        private int idVenda;
        private double valorTotal, lucro;

        public VendaHistorico(String dataHora, int idVenda, double valorTotal, double lucro, String metodo, String descricao) {
            this.dataHora = dataHora; this.idVenda = idVenda; this.valorTotal = valorTotal;
            this.lucro = lucro; this.metodoPagamento = metodo; this.descricao = descricao;
        }
        public String getDataHora() { return dataHora; }
        public int getIdVenda() { return idVenda; }
        public double getValorTotal() { return valorTotal; }
        public double getLucro() { return lucro; }
        public String getMetodoPagamento() { return metodoPagamento; }
        public String getDescricao() { return descricao; }
    }
}