package com.semeando.web;

import com.semeando.model.*;
import com.semeando.repo.*;
import com.semeando.service.AuthService;
import com.semeando.service.PedagogicoService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

/** Recursos disponíveis a todos os perfis autenticados. */
@RestController
@RequestMapping("/api")
public class ComumController {
    private final AuthService auth;
    private final AvisoRepository avisos;
    private final EventoCalendarioRepository eventos;
    private final InstituicaoRepository instituicao;
    private final AlunoRepository alunos;
    private final TurmaRepository turmas;
    private final PedagogicoService pedagogico;

    public ComumController(AuthService auth, AvisoRepository avisos, EventoCalendarioRepository eventos,
                           InstituicaoRepository instituicao, AlunoRepository alunos, TurmaRepository turmas,
                           PedagogicoService pedagogico) {
        this.auth = auth;
        this.avisos = avisos;
        this.eventos = eventos;
        this.instituicao = instituicao;
        this.alunos = alunos;
        this.turmas = turmas;
        this.pedagogico = pedagogico;
    }

    @GetMapping("/avisos")
    public List<Aviso> avisos(HttpServletRequest req) {
        Usuario u = auth.usuario(req);
        Set<Long> visiveis = new HashSet<>();
        switch (u.getPerfil()) {
            case GESTOR -> { return avisos.findAllByOrderByDataHoraDesc(); }
            case PROFESSOR -> turmas.findByProfessorOrderByNome(u).forEach(t -> visiveis.add(t.getId()));
            case ALUNO -> alunos.findByUsuario(u).ifPresent(a -> visiveis.add(a.getTurma().getId()));
            case RESPONSAVEL -> alunos.findByResponsaveisContainingOrderByNome(u)
                    .forEach(a -> visiveis.add(a.getTurma().getId()));
        }
        return avisos.findAllByOrderByDataHoraDesc().stream()
                .filter(a -> a.getTurma() == null || visiveis.contains(a.getTurma().getId())).toList();
    }

    @GetMapping("/calendario")
    public List<EventoCalendario> calendario(HttpServletRequest req) {
        auth.usuario(req);
        return eventos.findAllByOrderByData();
    }

    @GetMapping("/instituicao")
    public Instituicao instituicao(HttpServletRequest req) {
        auth.usuario(req);
        return instituicao.findById(1L).orElseThrow();
    }

    /** RF05 e RF31 */
    @GetMapping("/materiais")
    public Map<String, List<String>> materiais(HttpServletRequest req) {
        auth.usuario(req);
        return pedagogico.todosMateriais();
    }
}
