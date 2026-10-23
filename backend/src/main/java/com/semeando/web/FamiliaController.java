package com.semeando.web;

import com.semeando.model.*;
import com.semeando.repo.AlunoRepository;
import com.semeando.repo.ParcelaRepository;
import com.semeando.service.AuditoriaService;
import com.semeando.service.AuthService;
import com.semeando.service.CobrancaService;
import com.semeando.service.PedagogicoService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/** Portal do aluno e do responsável (RF31, RF32, RF40). */
@RestController
@RequestMapping("/api")
@Transactional
public class FamiliaController {
    private final AuthService auth;
    private final AuditoriaService auditoria;
    private final PedagogicoService pedagogico;
    private final CobrancaService cobranca;
    private final AlunoRepository alunos;
    private final ParcelaRepository parcelas;

    public FamiliaController(AuthService auth, AuditoriaService auditoria, PedagogicoService pedagogico,
                             CobrancaService cobranca, AlunoRepository alunos, ParcelaRepository parcelas) {
        this.auth = auth;
        this.auditoria = auditoria;
        this.pedagogico = pedagogico;
        this.cobranca = cobranca;
        this.alunos = alunos;
        this.parcelas = parcelas;
    }

    private Map<String, Object> painel(Aluno a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("nome", a.getNome());
        m.put("matricula", a.getMatricula());
        m.put("dataNascimento", a.getDataNascimento());
        m.put("turma", a.getTurma().getNome());
        m.put("segmento", a.getTurma().getSegmento());
        m.put("turno", a.getTurma().getTurno());
        m.put("sala", a.getTurma().getSala());
        m.put("horario", a.getTurma().getHorario());
        m.put("professor", a.getTurma().getProfessor() == null ? "—" : a.getTurma().getProfessor().getNome());
        m.put("status", a.getStatus());
        m.put("boletim", pedagogico.boletim(a));
        m.put("frequencia", pedagogico.frequencia(a));
        m.put("materiais", pedagogico.materiais(a.getTurma().getNome()));
        m.put("hospitalReferencia", a.getHospitalReferencia());
        m.put("contatoEmergencia", a.getContatoEmergencia());
        m.put("autorizadosRetirada", a.getAutorizadosRetirada());
        return m;
    }

    @GetMapping("/aluno/painel")
    public Map<String, Object> painelAluno(HttpServletRequest req) {
        Usuario u = auth.exigir(req, Perfil.ALUNO);
        Aluno a = alunos.findByUsuario(u)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cadastro de aluno não vinculado"));
        return painel(a);
    }

    private List<Aluno> filhos(Usuario u) {
        return alunos.findByResponsaveisContainingOrderByNome(u).stream()
                .filter(a -> a.getStatus() == StatusMatricula.MATRICULADO).toList();
    }

    @GetMapping("/responsavel/filhos")
    public List<Map<String, Object>> filhos(HttpServletRequest req) {
        return filhos(auth.exigir(req, Perfil.RESPONSAVEL)).stream().map(this::painel).toList();
    }

    @GetMapping("/responsavel/parcelas")
    public List<Map<String, Object>> parcelas(HttpServletRequest req) {
        Usuario u = auth.exigir(req, Perfil.RESPONSAVEL);
        List<Map<String, Object>> r = new ArrayList<>();
        for (Aluno a : filhos(u)) parcelas.findByContratoAlunoOrderByVencimento(a).forEach(p -> r.add(cobranca.view(p)));
        r.sort(Comparator.comparing(m -> (java.time.LocalDate) m.get("vencimento")));
        return r;
    }

    public record EmergenciaForm(String hospitalReferencia, String contatoEmergencia, String autorizadosRetirada) {}

    @PutMapping("/responsavel/filhos/{id}/emergencia")
    public Map<String, Object> emergencia(@PathVariable Long id, @RequestBody EmergenciaForm f, HttpServletRequest req) {
        Usuario u = auth.exigir(req, Perfil.RESPONSAVEL);
        Aluno a = filhos(u).stream().filter(x -> x.getId().equals(id)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Aluno não vinculado a você"));
        a.setHospitalReferencia(f.hospitalReferencia());
        a.setContatoEmergencia(f.contatoEmergencia());
        a.setAutorizadosRetirada(f.autorizadosRetirada());
        auditoria.registrar(u, "DADOS_EMERGENCIA", "Responsável atualizou dados de emergência de " + a.getNome());
        return painel(a);
    }
}
