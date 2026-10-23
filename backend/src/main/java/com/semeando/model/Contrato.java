package com.semeando.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Contrato de serviços (Fundamental) ou ficha de sócio (Infantil). */
@Entity
@Getter @Setter @NoArgsConstructor
public class Contrato {
    @Id @GeneratedValue
    private Long id;
    @ManyToOne
    private Aluno aluno;
    private String tipo;
    private int anoLetivo;
    private int numeroParcelas;
    private BigDecimal valorParcela;
    /** RF21 - bolsa / desconto em %. */
    private double descontoPercentual;
    private String observacao;
    private LocalDate dataEmissao;
    private boolean parcelasGeradas;
}
