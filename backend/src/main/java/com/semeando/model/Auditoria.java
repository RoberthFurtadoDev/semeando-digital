package com.semeando.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** RF39 / RNF03 */
@Entity
@Getter @Setter @NoArgsConstructor
public class Auditoria {
    @Id @GeneratedValue
    private Long id;
    private LocalDateTime dataHora;
    private String usuario;
    private String acao;
    @Column(length = 1000)
    private String detalhe;
}
