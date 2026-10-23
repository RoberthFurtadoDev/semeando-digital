package com.semeando.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/** Conteúdo ministrado no diário de classe (RF25). */
@Entity
@Getter @Setter @NoArgsConstructor
public class RegistroAula {
    @Id @GeneratedValue
    private Long id;
    @ManyToOne
    private Turma turma;
    private LocalDate data;
    private String disciplina;
    @Column(length = 2000)
    private String conteudo;
}
