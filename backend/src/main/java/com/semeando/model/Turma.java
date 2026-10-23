package com.semeando.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter @Setter @NoArgsConstructor
public class Turma {
    public static final int CAPACIDADE_MAXIMA = 30; // RN02

    @Id @GeneratedValue
    private Long id;
    private String nome;
    @Enumerated(EnumType.STRING)
    private Segmento segmento;
    private String turno;
    private String sala;
    private String horario;
    @ManyToOne
    private Usuario professor;

    public Turma(String nome, Segmento segmento, String turno, String sala, String horario) {
        this.nome = nome;
        this.segmento = segmento;
        this.turno = turno;
        this.sala = sala;
        this.horario = horario;
    }

    public int getCapacidade() {
        return CAPACIDADE_MAXIMA;
    }
}
