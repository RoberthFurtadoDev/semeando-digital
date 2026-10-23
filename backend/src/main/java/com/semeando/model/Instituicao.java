package com.semeando.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** RN05: identidade institucional única, reutilizada em todos os documentos. */
@Entity
@Getter @Setter @NoArgsConstructor
public class Instituicao {
    @Id
    private Long id = 1L;
    private String razaoSocial;
    private String nomeFantasia;
    private String cnpj;
    private String endereco;
    private String telefone;
    /** RN03 */
    private double multaPercentual = 2.0;
    private double jurosMensalPercentual = 1.0;
}
