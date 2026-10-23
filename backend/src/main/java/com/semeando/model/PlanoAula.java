package com.semeando.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter @Setter @NoArgsConstructor
public class PlanoAula {
    @Id @GeneratedValue
    private Long id;
    @ManyToOne
    private Turma turma;
    @JsonIgnore
    @ManyToOne
    private Usuario professor;
    private String disciplina;
    private LocalDate data;
    private String titulo;
    @Column(length = 2000)
    private String objetivos;
    @Column(length = 2000)
    private String atividades;
}
