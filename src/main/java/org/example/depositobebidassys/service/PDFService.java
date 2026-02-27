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
            // Cria a pasta de relatórios na mesma pasta do .jar, pra não espalhar arquivo no PC do Manel
            File pastaRelatorios = new File("./Relatorios_Gerados");
            if (!pastaRelatorios.exists()) {
                pastaRelatorios.mkdirs();
            }

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String fileName = "Relatorio_Financeiro_" + timestamp + ".pdf";

            // Junta a pasta com o nome do arquivo pra jogar o PDF no lugar certo
            File arquivoFinal = new File(pastaRelatorios, fileName);

            PdfWriter writer = new PdfWriter(arquivoFinal.getAbsolutePath());
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            document.add(new Paragraph("RELATÓRIO FINANCEIRO - DEPÓSITO DO NENEU").setBold().setFontSize(20));
            document.add(new Paragraph("Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"))));
            document.add(new Paragraph("\nResumo do Período Selecionado:"));
            document.add(new Paragraph("Faturamento Bruto: " + faturamento));
            document.add(new Paragraph("Lucro Líquido: " + lucro));
            document.add(new Paragraph("\n"));

            // Ajustando a largura das colunas pra não cortar os textos grandes
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
                // Evita tomar NullPointerException se a descrição vier vazia
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