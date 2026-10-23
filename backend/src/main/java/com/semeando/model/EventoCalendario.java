package com.semeando.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter @Setter @NoArgsConstructor
public class EventoCalendario {
    @Id @GeneratedValue
    private Long id;
    private LocalDate data;
    private String titulo;
    /** LETIVO, FERIADO, REUNIAO, AVALIACAO */
    private String tipo;

    public EventoCalendario(LocalDate data, String titulo, String tipo) {
        this.data = data;
        this.titulo = titulo;
        this.tipo = tipo;
    }
}
