package com.semeando.service;

import com.semeando.model.*;
import com.semeando.repo.AlunoRepository;
import com.semeando.repo.ContratoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;

@Service
public class MatriculaService {
    private final AlunoRepository alunos;
    private final ContratoRepository contratos;
    private final CobrancaService cobranca;

    public MatriculaService(AlunoRepository alunos, ContratoRepository contratos, CobrancaService cobranca) {
        this.alunos = alunos;
        this.contratos = contratos;
        this.cobranca = cobranca;
    }

    public long vagas(Turma t) {
        return Turma.CAPACIDADE_MAXIMA - alunos.countByTurmaAndStatus(t, StatusMatricula.MATRICULADO);
    }

    /** RN02 + RN06: efetiva a matrícula e emite contrato ou ficha de sócio (RN01). */
    public Contrato efetivar(Aluno a) {
        if (a.getStatus() != StatusMatricula.APROVADA)
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "A pré-matrícula precisa ser aprovada antes");
        if (!a.getPendencias().isEmpty())
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Matrícula com pendências: " + String.join(", ", a.getPendencias()));
        if (a.getTurma() == null)
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Selecione uma turma");
        if (vagas(a.getTurma()) <= 0)
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Turma " + a.getTurma().getNome() + " atingiu o limite de " + Turma.CAPACIDADE_MAXIMA + " alunos");
        a.setStatus(StatusMatricula.MATRICULADO);
        if (a.getMatricula() == null) a.setMatricula(LocalDate.now().getYear() + String.format("%04d", a.getId()));
        return contratos.save(novoContrato(a, LocalDate.now().getYear()));
    }

    public Contrato novoContrato(Aluno a, int ano) {
        Contrato c = new Contrato();
        c.setAluno(a);
        c.setTipo(a.getTurma().getSegmento().tipoDocumento());
        c.setAnoLetivo(ano);
        c.setNumeroParcelas(11);
        c.setValorParcela(cobranca.valorTabela(a.getTurma().getNome()));
        c.setDataEmissao(LocalDate.now());
        return c;
    }
}
