package com.semeando.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter @Setter @NoArgsConstructor
public class Frequencia {
    @Id @GeneratedValue
    private Long id;
    @ManyToOne
    private Aluno aluno;
    private LocalDate data;
    private boolean presente;
}
