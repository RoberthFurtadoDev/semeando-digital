package com.semeando.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter @NoArgsConstructor
public class Aluno {
    @Id @GeneratedValue
    private Long id;
    private String nome;
    private LocalDate dataNascimento;
    private String matricula;
    @ManyToOne
    private Turma turma;
    @Enumerated(EnumType.STRING)
    private StatusMatricula status = StatusMatricula.PRE_MATRICULA;
    private String motivoRejeicao;

    // RF06 - checklist de documentos obrigatórios
    private boolean docCertidaoNascimento;
    private boolean docComprovanteResidencia;
    private boolean docCartaoVacina;
    private boolean docFoto;
    private boolean docDocumentoResponsavel;
    // RF03
    private boolean taxaMatriculaPaga;
    private String comprovanteTaxa;
    // RF04
    private String fardamento;
    // RF40
    private String hospitalReferencia;
    private String contatoEmergencia;
    private String autorizadosRetirada;
    // RN07 / LGPD art. 14
    private boolean consentimentoLgpd;

    @JsonIgnore
    @OneToOne
    private Usuario usuario;

    @JsonIgnore
    @ManyToMany(fetch = FetchType.EAGER)
    private List<Usuario> responsaveis = new ArrayList<>();

    public List<String> getPendencias() {
        List<String> p = new ArrayList<>();
        if (!docCertidaoNascimento) p.add("Certidão de nascimento");
        if (!docComprovanteResidencia) p.add("Comprovante de residência");
        if (!docCartaoVacina) p.add("Cartão de vacina");
        if (!docFoto) p.add("Foto 3x4");
        if (!docDocumentoResponsavel) p.add("Documento do responsável");
        if (!taxaMatriculaPaga) p.add("Taxa de matrícula");
        if (!consentimentoLgpd) p.add("Termo de consentimento LGPD");
        if (vazio(hospitalReferencia) || vazio(contatoEmergencia)) p.add("Dados de emergência (Anexo I)");
        return p;
    }

    private static boolean vazio(String s) {
        return s == null || s.isBlank();
    }

    public List<String> getResponsaveisNomes() {
        return responsaveis.stream().map(Usuario::getNome).toList();
    }

    public String getResponsavelEmail() {
        return responsaveis.isEmpty() ? null : responsaveis.get(0).getEmail();
    }

    public String getResponsavelTelefone() {
        return responsaveis.isEmpty() ? null : responsaveis.get(0).getTelefone();
    }
}
