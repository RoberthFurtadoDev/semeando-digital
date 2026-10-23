package com.semeando.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter @Setter @NoArgsConstructor
public class Nota {
    @Id @GeneratedValue
    private Long id;
    @ManyToOne
    private Aluno aluno;
    private String disciplina;
    private int bimestre;
    private double valor;
}
