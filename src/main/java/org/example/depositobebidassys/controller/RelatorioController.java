package org.example.depositobebidassys.controller;

import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.chart.AreaChart;
import javafx.scene.chart.PieChart;
import javafx.scene.chart.XYChart;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.util.Duration;
import org.example.depositobebidassys.dao.RelatorioDAO;

import java.time.LocalDate;
import java.util.Map;
import java.util.List;

public class RelatorioController {

    @FXML private DatePicker dpInicio;
    @FXML private DatePicker dpFim;
    @FXML private Label lblFaturamento;
    @FXML private Label lblLucro;
    @FXML private Label lblQtdVendas;
    @FXML private Label lblTicketMedio;
    @FXML private AreaChart<String, Number> graficoEvolucao;
    @FXML private PieChart graficoTopProdutos;

    // Novos campos da Tabela
    @FXML private TableView<VendaHistorico> tabelaHistorico;
    @FXML private TableColumn<VendaHistorico, String> colDataHora;
    @FXML private TableColumn<VendaHistorico, Integer> colIdVenda;
    @FXML private TableColumn<VendaHistorico, Double> colValorTotal;
    @FXML private TableColumn<VendaHistorico, Double> colLucro;

    private RelatorioDAO dao = new RelatorioDAO();
    private Timeline autoUpdater;

    @FXML
    public void initialize() {
        dpFim.setValue(LocalDate.now());
        dpInicio.setValue(LocalDate.now().minusDays(7));

        // Configura as colunas da tabela de histórico
        colDataHora.setCellValueFactory(new PropertyValueFactory<>("dataHora"));
        colIdVenda.setCellValueFactory(new PropertyValueFactory<>("idVenda"));
        colValorTotal.setCellValueFactory(new PropertyValueFactory<>("valorTotal"));
        colLucro.setCellValueFactory(new PropertyValueFactory<>("lucro"));

        filtrarDados();

        // A MÁGICA DO TEMPO REAL: Atualiza a tela a cada 5 segundos em background
        autoUpdater = new Timeline(new KeyFrame(Duration.seconds(5), e -> filtrarDados()));
        autoUpdater.setCycleCount(Timeline.INDEFINITE);
        autoUpdater.play();
    }

    @FXML
    public void filtrarDadosForcado(ActionEvent event) {
        filtrarDados(); // Chamado pelo botão manual
    }

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

        // Atualiza a tabela com as vendas recentes
        List<VendaHistorico> historico = dao.buscarHistoricoVendas(inicio, fim);
        tabelaHistorico.setItems(FXCollections.observableArrayList(historico));
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

    // Classe interna (DTO) para popular a tabela facilmente
    public static class VendaHistorico {
        private String dataHora;
        private int idVenda;
        private double valorTotal;
        private double lucro;

        public VendaHistorico(String dataHora, int idVenda, double valorTotal, double lucro) {
            this.dataHora = dataHora;
            this.idVenda = idVenda;
            this.valorTotal = valorTotal;
            this.lucro = lucro;
        }

        public String getDataHora() { return dataHora; }
        public int getIdVenda() { return idVenda; }
        public double getValorTotal() { return valorTotal; }
        public double getLucro() { return lucro; }
    }
}