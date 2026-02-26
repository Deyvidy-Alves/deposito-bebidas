package org.example.depositobebidassys.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.UnitValue;
import org.example.depositobebidassys.controller.RelatorioController.VendaHistorico;

import java.io.File;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

public class PDFService {
    public void gerarRelatorioVendas(List<VendaHistorico> vendas, String faturamento, String lucro) {
        try {
            // Pasta Documents/PDFsDeposito do Windows
            File pastaRaiz = new File(System.getProperty("user.home"), "Documents/PDFsDeposito");
            if (!pastaRaiz.exists()) pastaRaiz.mkdirs();

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String fileName = "Relatorio_Financeiro_" + timestamp + ".pdf";
            File arquivoFinal = new File(pastaRaiz, fileName);

            PdfWriter writer = new PdfWriter(arquivoFinal.getAbsolutePath());
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            document.add(new Paragraph("RELATÓRIO FINANCEIRO - DEPÓSITO DO NENEU").setBold().setFontSize(20));
            document.add(new Paragraph("Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"))));
            document.add(new Paragraph("\nResumo do Período Selecionado:"));
            document.add(new Paragraph("Faturamento Bruto: " + faturamento));
            document.add(new Paragraph("Lucro Líquido: " + lucro));
            document.add(new Paragraph("\n"));

            // 6 Colunas: Aumentei o array para caber a "Descrição"
            float[] columnWidths = {100, 50, 80, 200, 70, 70};
            Table table = new Table(UnitValue.createPointArray(columnWidths));
            table.setWidth(UnitValue.createPercentValue(100));

            table.addHeaderCell("Data/Hora");
            table.addHeaderCell("Nº");
            table.addHeaderCell("Pagamento");
            table.addHeaderCell("Itens Vendidos (Detalhado)");
            table.addHeaderCell("Total (R$)");
            table.addHeaderCell("Lucro (R$)");

            for (VendaHistorico v : vendas) {
                table.addCell(v.getDataHora());
                table.addCell(String.valueOf(v.getIdVenda()));
                table.addCell(v.getMetodoPagamento());
                // Insere a descrição ou vazio se for nulo
                table.addCell(v.getDescricao() != null ? v.getDescricao() : "");
                table.addCell(String.format("%.2f", v.getValorTotal()));
                table.addCell(String.format("%.2f", v.getLucro()));
            }

            document.add(table);
            document.close();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}