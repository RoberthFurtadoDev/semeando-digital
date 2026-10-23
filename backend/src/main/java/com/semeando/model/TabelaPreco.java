package com.semeando.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/** Tabela oficial de mensalidades/taxas por série (RN04). */
@Entity
@Getter @Setter @NoArgsConstructor
public class TabelaPreco {
    @Id @GeneratedValue
    private Long id;
    @Column(unique = true)
    private String serie;
    private BigDecimal valor;

    public TabelaPreco(String serie, BigDecimal valor) {
        this.serie = serie;
        this.valor = valor;
    }
}
