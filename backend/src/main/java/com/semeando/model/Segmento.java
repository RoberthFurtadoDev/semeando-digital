package com.semeando.model;

/** RN01: Educação Infantil paga taxa de associado; Ensino Fundamental paga mensalidade. */
public enum Segmento {
    INFANTIL, FUNDAMENTAL;

    public String tipoCobranca() {
        return this == INFANTIL ? "Taxa de associado" : "Mensalidade (boleto)";
    }

    public String tipoDocumento() {
        return this == INFANTIL ? "Ficha de sócio" : "Contrato de prestação de serviços";
    }
}
