package com.semeando.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter @Setter @NoArgsConstructor
public class Usuario {
    @Id @GeneratedValue
    private Long id;
    private String nome;
    @Column(unique = true)
    private String email;
    @JsonIgnore
    private String senha;
    @Enumerated(EnumType.STRING)
    private Perfil perfil;
    private String telefone;
    /** Professor: disciplinas de atuação. */
    private String disciplinas;

    public Usuario(String nome, String email, String senha, Perfil perfil) {
        this.nome = nome;
        this.email = email;
        this.senha = senha;
        this.perfil = perfil;
    }
}
