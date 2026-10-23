package com.semeando.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Getter @Setter @NoArgsConstructor
public class Parcela {
    @Id @GeneratedValue
    private Long id;
    @JsonIgnore
    @ManyToOne
    private Contrato contrato;
    private int numero;
    private LocalDate vencimento;
    private BigDecimal valor;
    private boolean pago;
    private LocalDate dataPagamento;
    private BigDecimal valorPago;
    /** Código simulado do boleto na plataforma CORA. */
    private String codigoBoleto;
}
