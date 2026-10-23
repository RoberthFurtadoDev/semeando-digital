package com.semeando.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor
public class Aviso {
    @Id @GeneratedValue
    private Long id;
    private String titulo;
    @Column(length = 2000)
    private String mensagem;
    private LocalDateTime dataHora;
    private String autor;
    /** null = aviso geral para toda a escola. */
    @ManyToOne
    private Turma turma;
}
