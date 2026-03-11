# 🍻 Depósito do Neneu - Sistema de Gestão e PDV

![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![JavaFX](https://img.shields.io/badge/JavaFX-FF0000?style=for-the-badge&logo=java&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

## 📋 Sobre o Projeto
O **Depósito do Neneu** é um sistema desktop de gestão e frente de caixa (PDV) desenvolvido sob medida para administrar uma distribuidora de bebidas. O projeto foi construído do zero utilizando **Java puro e JavaFX** para a criação da interface gráfica.

O foco do sistema é a praticidade. Ele foi projetado para ser de uso exclusivo do proprietário (Single-User), eliminando complexidades desnecessárias e garantindo agilidade no dia a dia do depósito. Para zerar os custos de infraestrutura e hospedagem para o cliente, a persistência de dados foi implementada de forma 100% local utilizando **SQLite**.

## 🚀 Funcionalidades Principais
* **Controle de Estoque:** Cadastro completo de bebidas, registro rápido de entradas (compras) e acompanhamento do inventário.
* **Frente de Caixa (PDV):** Interface otimizada para o registro ágil de vendas diretas ao cliente.
* **FRelatório Finaceiro:** Levantamento de Lucro líquido e bruto, demonstração em gráfico e exportação em PDF.
* **Gestão Centralizada (Admin Único):** O sistema não possui burocracia de níveis de acesso. O proprietário tem controle total e imediato sobre preços de custo, preços de venda, lucros e movimentações físicas em uma única tela.

## 🛠️ Tecnologias Utilizadas
* **Back-end:** Java (Lógica de negócios e POO pura)
* **Front-end / UI:** JavaFX (Arquivos FXML e Controllers)
* **Banco de Dados:** SQLite (Armazenamento local via JDBC)
* **Arquitetura:** Padrão MVC (Model-View-Controller) adaptado para desktop

## 💻 Como Executar o Projeto Localmente

### Pré-requisitos
* JDK 17 (ou superior) instalado.
* IDE com suporte a JavaFX (IntelliJ IDEA recomendado).

### Passos
1. Clone este repositório:
   ```bash
   git clone https://github.com/Deyvidy-Alves/deposito-bebidas.git
   ´´´
2. Abra a pasta do projeto na sua IDE.

3. Certifique-se de que o driver JDBC do SQLite está adicionado às bibliotecas do projeto.

4. O arquivo do banco de dados local (.db ou .sqlite) será criado automaticamente na raiz do projeto na primeira execução (ou já está incluso no repositório).

5. Execute a classe principal (ex: Main.java) para iniciar a aplicação.