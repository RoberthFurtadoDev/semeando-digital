package com.semeando.web;

import com.semeando.model.*;
import com.semeando.repo.*;
import com.semeando.service.AuditoriaService;
import com.semeando.service.AuthService;
import com.semeando.service.PedagogicoService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/** Perfil Professor: diário de classe, planos de aula e avisos para as próprias turmas. */
@RestController
@RequestMapping("/api/professor")
@Transactional
public class ProfessorController {
    private final AuthService auth;
    private final AuditoriaService auditoria;
    private final PedagogicoService pedagogico;
    private final TurmaRepository turmas;
    private final AlunoRepository alunos;
    private final NotaRepository notas;
    private final FrequenciaRepository frequencias;
    private final RegistroAulaRepository registros;
    private final PlanoAulaRepository planos;
    private final AvisoRepository avisos;

    public ProfessorController(AuthService auth, AuditoriaService auditoria, PedagogicoService pedagogico,
                               TurmaRepository turmas, AlunoRepository alunos, NotaRepository notas,
                               FrequenciaRepository frequencias, RegistroAulaRepository registros,
                               PlanoAulaRepository planos, AvisoRepository avisos) {
        this.auth = auth;
        this.auditoria = auditoria;
        this.pedagogico = pedagogico;
        this.turmas = turmas;
        this.alunos = alunos;
        this.notas = notas;
        this.frequencias = frequencias;
        this.registros = registros;
        this.planos = planos;
        this.avisos = avisos;
    }

    private Usuario professor(HttpServletRequest req) {
        return auth.exigir(req, Perfil.PROFESSOR);
    }

    /** Garante que o professor só acesse as turmas atribuídas a ele. */
    private Turma minhaTurma(Long id, Usuario prof) {
        Turma t = turmas.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Turma não encontrada"));
        if (t.getProfessor() == null || !t.getProfessor().getId().equals(prof.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta turma não está atribuída a você");
        return t;
    }

    private List<Aluno> alunosDa(Turma t) {
        return alunos.findByTurmaAndStatusOrderByNome(t, StatusMatricula.MATRICULADO);
    }

    @GetMapping("/turmas")
    public List<Map<String, Object>> turmas(HttpServletRequest req) {
        Usuario p = professor(req);
        return turmas.findByProfessorOrderByNome(p).stream().map(t -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("nome", t.getNome());
            m.put("segmento", t.getSegmento());
            m.put("turno", t.getTurno());
            m.put("sala", t.getSala());
            m.put("horario", t.getHorario());
            m.put("alunos", alunosDa(t).size());
            m.put("disciplinas", pedagogico.disciplinas(t.getSegmento()));
            return m;
        }).toList();
    }

    @GetMapping("/turmas/{id}/alunos")
    public List<Map<String, Object>> alunos(@PathVariable Long id, HttpServletRequest req) {
        Turma t = minhaTurma(id, professor(req));
        return alunosDa(t).stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("nome", a.getNome());
            m.put("matricula", a.getMatricula());
            m.put("frequencia", pedagogico.frequencia(a).get("percentual"));
            m.put("boletim", pedagogico.boletim(a));
            return m;
        }).toList();
    }

    @GetMapping("/turmas/{id}/notas")
    public List<Map<String, Object>> notas(@PathVariable Long id, @RequestParam String disciplina,
                                           @RequestParam int bimestre, HttpServletRequest req) {
        Turma t = minhaTurma(id, professor(req));
        return alunosDa(t).stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("alunoId", a.getId());
            m.put("nome", a.getNome());
            m.put("valor", notas.findByAlunoAndDisciplinaAndBimestre(a, disciplina, bimestre).map(Nota::getValor).orElse(null));
            return m;
        }).toList();
    }

    public record NotaItem(Long alunoId, Double valor) {}
    public record NotasForm(String disciplina, int bimestre, List<NotaItem> notas) {}

    @PostMapping("/turmas/{id}/notas")
    public Map<String, String> salvarNotas(@PathVariable Long id, @RequestBody NotasForm f, HttpServletRequest req) {
        Usuario p = professor(req);
        Turma t = minhaTurma(id, p);
        if (f.bimestre() < 1 || f.bimestre() > 4) throw new IllegalArgumentException("Bimestre inválido");
        Map<Long, Aluno> daTurma = new HashMap<>();
        alunosDa(t).forEach(a -> daTurma.put(a.getId(), a));
        int salvas = 0;
        for (NotaItem item : f.notas()) {
            Aluno a = daTurma.get(item.alunoId());
            if (a == null || item.valor() == null) continue;
            if (item.valor() < 0 || item.valor() > 10) throw new IllegalArgumentException("Notas devem estar entre 0 e 10");
            Nota n = notas.findByAlunoAndDisciplinaAndBimestre(a, f.disciplina(), f.bimestre()).orElseGet(Nota::new);
            n.setAluno(a);
            n.setDisciplina(f.disciplina());
            n.setBimestre(f.bimestre());
            n.setValor(item.valor());
            notas.save(n);
            salvas++;
        }
        auditoria.registrar(p, "LANCAMENTO_NOTAS", salvas + " notas de " + f.disciplina() + " (" + f.bimestre()
                + "º bim.) - " + t.getNome());
        return Map.of("mensagem", salvas + " notas salvas");
    }

    @GetMapping("/turmas/{id}/frequencia")
    public List<Map<String, Object>> frequencia(@PathVariable Long id, @RequestParam LocalDate data, HttpServletRequest req) {
        Turma t = minhaTurma(id, professor(req));
        return alunosDa(t).stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("alunoId", a.getId());
            m.put("nome", a.getNome());
            Optional<Frequencia> f = frequencias.findByAlunoAndData(a, data);
            m.put("presente", f.map(Frequencia::isPresente).orElse(true));
            m.put("registrado", f.isPresent());
            return m;
        }).toList();
    }

    public record PresencaItem(Long alunoId, boolean presente) {}
    public record FrequenciaForm(LocalDate data, List<PresencaItem> presencas) {}

    @PostMapping("/turmas/{id}/frequencia")
    public Map<String, String> salvarFrequencia(@PathVariable Long id, @RequestBody FrequenciaForm f, HttpServletRequest req) {
        Usuario p = professor(req);
        Turma t = minhaTurma(id, p);
        if (f.data() == null || f.data().isAfter(LocalDate.now())) throw new IllegalArgumentException("Data inválida");
        Map<Long, Aluno> daTurma = new HashMap<>();
        alunosDa(t).forEach(a -> daTurma.put(a.getId(), a));
        for (PresencaItem item : f.presencas()) {
            Aluno a = daTurma.get(item.alunoId());
            if (a == null) continue;
            Frequencia fr = frequencias.findByAlunoAndData(a, f.data()).orElseGet(Frequencia::new);
            fr.setAluno(a);
            fr.setData(f.data());
            fr.setPresente(item.presente());
            frequencias.save(fr);
        }
        return Map.of("mensagem", "Frequência registrada");
    }

    @GetMapping("/turmas/{id}/aulas")
    public List<RegistroAula> aulas(@PathVariable Long id, HttpServletRequest req) {
        return registros.findByTurmaOrderByDataDesc(minhaTurma(id, professor(req)));
    }

    @PostMapping("/turmas/{id}/aulas")
    public RegistroAula novaAula(@PathVariable Long id, @RequestBody RegistroAula f, HttpServletRequest req) {
        Turma t = minhaTurma(id, professor(req));
        if (f.getData() == null || f.getConteudo() == null || f.getConteudo().isBlank())
            throw new IllegalArgumentException("Informe data e conteúdo");
        f.setId(null);
        f.setTurma(t);
        return registros.save(f);
    }

    @GetMapping("/planos")
    public List<PlanoAula> planos(HttpServletRequest req) {
        return planos.findByProfessorOrderByDataDesc(professor(req));
    }

    public record PlanoForm(Long turmaId, String disciplina, LocalDate data, String titulo, String objetivos, String atividades) {}

    @PostMapping("/planos")
    public PlanoAula novoPlano(@RequestBody PlanoForm f, HttpServletRequest req) {
        Usuario p = professor(req);
        if (f.turmaId() == null || f.titulo() == null || f.titulo().isBlank())
            throw new IllegalArgumentException("Informe turma e título");
        PlanoAula pl = new PlanoAula();
        pl.setProfessor(p);
        pl.setTurma(minhaTurma(f.turmaId(), p));
        pl.setDisciplina(f.disciplina());
        pl.setData(f.data());
        pl.setTitulo(f.titulo());
        pl.setObjetivos(f.objetivos());
        pl.setAtividades(f.atividades());
        return planos.save(pl);
    }

    @DeleteMapping("/planos/{id}")
    public void excluirPlano(@PathVariable Long id, HttpServletRequest req) {
        Usuario p = professor(req);
        planos.findById(id).filter(pl -> pl.getProfessor().getId().equals(p.getId())).ifPresent(planos::delete);
    }

    public record AvisoForm(String titulo, String mensagem, Long turmaId) {}

    @PostMapping("/avisos")
    public Aviso novoAviso(@RequestBody AvisoForm f, HttpServletRequest req) {
        Usuario p = professor(req);
        if (f.titulo() == null || f.titulo().isBlank() || f.mensagem() == null || f.mensagem().isBlank())
            throw new IllegalArgumentException("Informe título e mensagem");
        Aviso a = new Aviso();
        a.setTitulo(f.titulo());
        a.setMensagem(f.mensagem());
        a.setAutor(p.getNome());
        a.setDataHora(LocalDateTime.now());
        a.setTurma(minhaTurma(f.turmaId(), p));
        return avisos.save(a);
    }
}
