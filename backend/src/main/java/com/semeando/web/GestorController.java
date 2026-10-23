package com.semeando.web;

import com.semeando.config.DataSeeder;
import com.semeando.model.*;
import com.semeando.repo.*;
import com.semeando.service.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Perfil Gestor/Secretaria: matrícula, cadastros, financeiro, comunicação e conformidade. */
@RestController
@RequestMapping("/api/gestor")
@Transactional
public class GestorController {
    private final AuthService auth;
    private final AuditoriaService auditoria;
    private final MatriculaService matricula;
    private final CobrancaService cobranca;
    private final AlunoRepository alunos;
    private final TurmaRepository turmas;
    private final UsuarioRepository usuarios;
    private final TabelaPrecoRepository precos;
    private final ContratoRepository contratos;
    private final ParcelaRepository parcelas;
    private final InstituicaoRepository instituicao;
    private final AvisoRepository avisos;
    private final EventoCalendarioRepository eventos;
    private final AuditoriaRepository auditorias;
    private final NotaRepository notas;

    public GestorController(AuthService auth, AuditoriaService auditoria, MatriculaService matricula,
                            CobrancaService cobranca, AlunoRepository alunos, TurmaRepository turmas,
                            UsuarioRepository usuarios, TabelaPrecoRepository precos, ContratoRepository contratos,
                            ParcelaRepository parcelas, InstituicaoRepository instituicao, AvisoRepository avisos,
                            EventoCalendarioRepository eventos, AuditoriaRepository auditorias, NotaRepository notas) {
        this.auth = auth;
        this.auditoria = auditoria;
        this.matricula = matricula;
        this.cobranca = cobranca;
        this.alunos = alunos;
        this.turmas = turmas;
        this.usuarios = usuarios;
        this.precos = precos;
        this.contratos = contratos;
        this.parcelas = parcelas;
        this.instituicao = instituicao;
        this.avisos = avisos;
        this.eventos = eventos;
        this.auditorias = auditorias;
        this.notas = notas;
    }

    private Usuario gestor(HttpServletRequest req) {
        return auth.exigir(req, Perfil.GESTOR);
    }

    private static <T> T achar(Optional<T> o, String oque) {
        return o.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, oque + " não encontrado(a)"));
    }

    // ---------- Painel ----------

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(HttpServletRequest req) {
        gestor(req);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("alunosMatriculados", alunos.countByStatus(StatusMatricula.MATRICULADO));
        m.put("preMatriculas", alunos.countByStatus(StatusMatricula.PRE_MATRICULA) + alunos.countByStatus(StatusMatricula.APROVADA));
        m.put("professores", usuarios.findByPerfilOrderByNome(Perfil.PROFESSOR).size());
        m.put("ocupacao", turmas.findAll().stream().map(t -> Map.of("turma", t.getNome(),
                "matriculados", Turma.CAPACIDADE_MAXIMA - matricula.vagas(t), "capacidade", Turma.CAPACIDADE_MAXIMA)).toList());
        BigDecimal recebidoMes = BigDecimal.ZERO, emAtraso = BigDecimal.ZERO, previsto = BigDecimal.ZERO;
        Set<Long> inadimplentes = new HashSet<>();
        YearMonth mes = YearMonth.now();
        for (Parcela p : parcelas.findAll()) {
            if (p.isPago() && YearMonth.from(p.getDataPagamento()).equals(mes)) recebidoMes = recebidoMes.add(p.getValorPago());
            if (YearMonth.from(p.getVencimento()).equals(mes)) previsto = previsto.add(p.getValor());
            if ("ATRASADA".equals(cobranca.situacao(p))) {
                emAtraso = emAtraso.add(cobranca.total(p));
                inadimplentes.add(p.getContrato().getAluno().getId());
            }
        }
        m.put("recebidoMes", recebidoMes);
        m.put("previstoMes", previsto);
        m.put("emAtraso", emAtraso);
        m.put("alunosInadimplentes", inadimplentes.size());
        m.put("contratosDivergentes", contratos.findAll().stream().filter(cobranca::divergente).count());
        m.put("obrigacoes", obrigacoes(req));
        return m;
    }

    // ---------- Matrícula (RF01-RF09, RF13) ----------

    @GetMapping("/alunos")
    public List<Aluno> alunos(HttpServletRequest req) {
        gestor(req);
        return alunos.findAll(org.springframework.data.domain.Sort.by("nome"));
    }

    public record PreMatriculaForm(String nome, LocalDate dataNascimento, Long turmaId,
                                   String responsavelNome, String responsavelEmail, String responsavelTelefone) {}

    @PostMapping("/alunos")
    public Aluno preMatricula(@RequestBody PreMatriculaForm f, HttpServletRequest req) {
        Usuario g = gestor(req);
        if (blank(f.nome()) || blank(f.responsavelNome()) || blank(f.responsavelEmail()) || f.turmaId() == null)
            throw new IllegalArgumentException("Preencha nome do aluno, turma e dados do responsável");
        Usuario resp = usuarios.findByEmailIgnoreCase(f.responsavelEmail().trim()).orElseGet(() -> {
            Usuario u = new Usuario(f.responsavelNome().trim(), f.responsavelEmail().trim().toLowerCase(),
                    auth.hash(DataSeeder.SENHA_PADRAO), Perfil.RESPONSAVEL);
            u.setTelefone(f.responsavelTelefone());
            return usuarios.save(u);
        });
        if (resp.getPerfil() != Perfil.RESPONSAVEL)
            throw new IllegalArgumentException("Este e-mail já pertence a um usuário que não é responsável");
        Aluno a = new Aluno();
        a.setNome(f.nome().trim());
        a.setDataNascimento(f.dataNascimento());
        a.setTurma(achar(turmas.findById(f.turmaId()), "Turma"));
        a.getResponsaveis().add(resp);
        a = alunos.save(a);
        auditoria.registrar(g, "PRE_MATRICULA", "Pré-matrícula de " + a.getNome() + " (" + a.getTurma().getNome() + ")");
        return a;
    }

    public record AlunoForm(String nome, LocalDate dataNascimento, Long turmaId,
                            boolean docCertidaoNascimento, boolean docComprovanteResidencia, boolean docCartaoVacina,
                            boolean docFoto, boolean docDocumentoResponsavel, boolean taxaMatriculaPaga,
                            String comprovanteTaxa, String fardamento, String hospitalReferencia,
                            String contatoEmergencia, String autorizadosRetirada, boolean consentimentoLgpd) {}

    @PutMapping("/alunos/{id}")
    public Aluno atualizarAluno(@PathVariable Long id, @RequestBody AlunoForm f, HttpServletRequest req) {
        Usuario g = gestor(req);
        Aluno a = achar(alunos.findById(id), "Aluno");
        if (f.turmaId() != null && !f.turmaId().equals(a.getTurma().getId())) {
            Turma nova = achar(turmas.findById(f.turmaId()), "Turma");
            if (a.getStatus() == StatusMatricula.MATRICULADO) {
                if (nova.getSegmento() != a.getTurma().getSegmento())
                    throw new IllegalArgumentException("Troca entre Educação Infantil e Fundamental exige nova matrícula (modelo de cobrança diferente)");
                if (matricula.vagas(nova) <= 0)
                    throw new IllegalArgumentException("Turma " + nova.getNome() + " sem vagas (máx. 30)");
            }
            a.setTurma(nova);
        }
        if (!blank(f.nome())) a.setNome(f.nome().trim());
        a.setDataNascimento(f.dataNascimento());
        a.setDocCertidaoNascimento(f.docCertidaoNascimento());
        a.setDocComprovanteResidencia(f.docComprovanteResidencia());
        a.setDocCartaoVacina(f.docCartaoVacina());
        a.setDocFoto(f.docFoto());
        a.setDocDocumentoResponsavel(f.docDocumentoResponsavel());
        a.setTaxaMatriculaPaga(f.taxaMatriculaPaga());
        a.setComprovanteTaxa(f.comprovanteTaxa());
        a.setFardamento(f.fardamento());
        a.setHospitalReferencia(f.hospitalReferencia());
        a.setContatoEmergencia(f.contatoEmergencia());
        a.setAutorizadosRetirada(f.autorizadosRetirada());
        a.setConsentimentoLgpd(f.consentimentoLgpd());
        auditoria.registrar(g, "ALTERACAO_ALUNO", "Dados de " + a.getNome() + " atualizados. Pendências: "
                + (a.getPendencias().isEmpty() ? "nenhuma" : String.join(", ", a.getPendencias())));
        return a;
    }

    @PostMapping("/alunos/{id}/aprovar")
    public Aluno aprovar(@PathVariable Long id, HttpServletRequest req) {
        Usuario g = gestor(req);
        Aluno a = achar(alunos.findById(id), "Aluno");
        if (a.getStatus() != StatusMatricula.PRE_MATRICULA)
            throw new IllegalArgumentException("Somente pré-matrículas podem ser aprovadas");
        a.setStatus(StatusMatricula.APROVADA);
        auditoria.registrar(g, "APROVACAO", "Pré-matrícula aprovada: " + a.getNome());
        return a;
    }

    public record MotivoForm(String motivo) {}

    @PostMapping("/alunos/{id}/rejeitar")
    public Aluno rejeitar(@PathVariable Long id, @RequestBody MotivoForm f, HttpServletRequest req) {
        Usuario g = gestor(req);
        Aluno a = achar(alunos.findById(id), "Aluno");
        if (a.getStatus() == StatusMatricula.MATRICULADO)
            throw new IllegalArgumentException("Aluno já matriculado");
        if (blank(f.motivo())) throw new IllegalArgumentException("Informe o motivo da rejeição");
        a.setStatus(StatusMatricula.REJEITADA);
        a.setMotivoRejeicao(f.motivo());
        auditoria.registrar(g, "REJEICAO", "Pré-matrícula rejeitada: " + a.getNome() + ". Motivo: " + f.motivo());
        return a;
    }

    @PostMapping("/alunos/{id}/efetivar")
    public Aluno efetivar(@PathVariable Long id, HttpServletRequest req) {
        Usuario g = gestor(req);
        Aluno a = achar(alunos.findById(id), "Aluno");
        Contrato c = matricula.efetivar(a);
        auditoria.registrar(g, "MATRICULA_EFETIVADA", a.getNome() + " matriculado(a) em " + a.getTurma().getNome()
                + ". " + c.getTipo() + " emitido(a) com parcela de R$ " + c.getValorParcela());
        return a;
    }

    // ---------- Turmas e professores (RF10, RF30) ----------

    @GetMapping("/turmas")
    public List<Map<String, Object>> turmas(HttpServletRequest req) {
        gestor(req);
        return turmas.findAll().stream().map(t -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("nome", t.getNome());
            m.put("segmento", t.getSegmento());
            m.put("turno", t.getTurno());
            m.put("sala", t.getSala());
            m.put("horario", t.getHorario());
            m.put("professorId", t.getProfessor() == null ? null : t.getProfessor().getId());
            m.put("professor", t.getProfessor() == null ? "—" : t.getProfessor().getNome());
            m.put("matriculados", Turma.CAPACIDADE_MAXIMA - matricula.vagas(t));
            m.put("capacidade", Turma.CAPACIDADE_MAXIMA);
            m.put("valorTabela", cobranca.valorTabela(t.getNome()));
            return m;
        }).toList();
    }

    public record TurmaForm(Long professorId, String sala, String turno, String horario) {}

    @PutMapping("/turmas/{id}")
    public Map<String, String> atualizarTurma(@PathVariable Long id, @RequestBody TurmaForm f, HttpServletRequest req) {
        Usuario g = gestor(req);
        Turma t = achar(turmas.findById(id), "Turma");
        t.setProfessor(f.professorId() == null ? null : achar(usuarios.findById(f.professorId()), "Professor"));
        t.setSala(f.sala());
        t.setTurno(f.turno());
        t.setHorario(f.horario());
        auditoria.registrar(g, "ALTERACAO_TURMA", "Turma " + t.getNome() + " atualizada");
        return Map.of("mensagem", "Turma atualizada");
    }

    @GetMapping("/turmas/{id}/alunos")
    public List<Aluno> alunosDaTurma(@PathVariable Long id, HttpServletRequest req) {
        gestor(req);
        return alunos.findByTurmaAndStatusOrderByNome(achar(turmas.findById(id), "Turma"), StatusMatricula.MATRICULADO);
    }

    @GetMapping("/professores")
    public List<Map<String, Object>> professores(HttpServletRequest req) {
        gestor(req);
        return usuarios.findByPerfilOrderByNome(Perfil.PROFESSOR).stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("nome", p.getNome());
            m.put("email", p.getEmail());
            m.put("telefone", p.getTelefone());
            m.put("disciplinas", p.getDisciplinas());
            m.put("turmas", turmas.findByProfessorOrderByNome(p).stream().map(Turma::getNome).toList());
            return m;
        }).toList();
    }

    public record ProfessorForm(String nome, String email, String telefone, String disciplinas) {}

    @PostMapping("/professores")
    public Map<String, String> novoProfessor(@RequestBody ProfessorForm f, HttpServletRequest req) {
        Usuario g = gestor(req);
        if (blank(f.nome()) || blank(f.email())) throw new IllegalArgumentException("Informe nome e e-mail");
        if (usuarios.findByEmailIgnoreCase(f.email().trim()).isPresent())
            throw new IllegalArgumentException("E-mail já cadastrado");
        Usuario u = new Usuario(f.nome().trim(), f.email().trim().toLowerCase(), auth.hash(DataSeeder.SENHA_PADRAO), Perfil.PROFESSOR);
        u.setTelefone(f.telefone());
        u.setDisciplinas(f.disciplinas());
        usuarios.save(u);
        auditoria.registrar(g, "NOVO_PROFESSOR", "Professor(a) cadastrado(a): " + u.getNome());
        return Map.of("mensagem", "Professor cadastrado. Senha inicial: " + DataSeeder.SENHA_PADRAO);
    }

    // ---------- Financeiro (RF14-RF24) ----------

    @GetMapping("/precos")
    public List<TabelaPreco> precos(HttpServletRequest req) {
        gestor(req);
        return precos.findAll();
    }

    public record PrecoForm(BigDecimal valor) {}

    @PutMapping("/precos/{id}")
    public TabelaPreco atualizarPreco(@PathVariable Long id, @RequestBody PrecoForm f, HttpServletRequest req) {
        Usuario g = gestor(req);
        if (f.valor() == null || f.valor().signum() <= 0) throw new IllegalArgumentException("Valor inválido");
        TabelaPreco p = achar(precos.findById(id), "Preço");
        auditoria.registrar(g, "ALTERACAO_TABELA", p.getSerie() + ": R$ " + p.getValor() + " -> R$ " + f.valor());
        p.setValor(f.valor().setScale(2, java.math.RoundingMode.HALF_UP));
        return p;
    }

    @GetMapping("/contratos")
    public List<Map<String, Object>> contratos(HttpServletRequest req) {
        gestor(req);
        return contratos.findAll().stream()
                .sorted(Comparator.comparing((Contrato c) -> !cobranca.divergente(c)).thenComparing(c -> c.getAluno().getNome()))
                .map(this::contratoView).toList();
    }

    private Map<String, Object> contratoView(Contrato c) {
        Map<String, Object> m = new LinkedHashMap<>();
        Aluno a = c.getAluno();
        m.put("id", c.getId());
        m.put("aluno", a.getNome());
        m.put("matricula", a.getMatricula());
        m.put("dataNascimento", a.getDataNascimento());
        m.put("turma", a.getTurma().getNome());
        m.put("segmento", a.getTurma().getSegmento());
        m.put("tipo", c.getTipo());
        m.put("tipoCobranca", a.getTurma().getSegmento().tipoCobranca());
        m.put("responsavel", String.join(", ", a.getResponsaveisNomes()));
        m.put("anoLetivo", c.getAnoLetivo());
        m.put("numeroParcelas", c.getNumeroParcelas());
        m.put("valorParcela", c.getValorParcela());
        m.put("valorTabela", cobranca.valorTabela(a.getTurma().getNome()));
        m.put("valorOficial", cobranca.valorOficial(c));
        m.put("descontoPercentual", c.getDescontoPercentual());
        m.put("divergente", cobranca.divergente(c));
        m.put("parcelasGeradas", c.isParcelasGeradas());
        m.put("observacao", c.getObservacao());
        m.put("dataEmissao", c.getDataEmissao());
        m.put("hospitalReferencia", a.getHospitalReferencia());
        m.put("contatoEmergencia", a.getContatoEmergencia());
        m.put("autorizadosRetirada", a.getAutorizadosRetirada());
        return m;
    }

    public record ContratoForm(BigDecimal valorParcela, double descontoPercentual, String observacao) {}

    @PutMapping("/contratos/{id}")
    public Map<String, Object> atualizarContrato(@PathVariable Long id, @RequestBody ContratoForm f, HttpServletRequest req) {
        Usuario g = gestor(req);
        Contrato c = achar(contratos.findById(id), "Contrato");
        if (c.isParcelasGeradas()) throw new IllegalArgumentException("Contrato com cobranças já emitidas não pode ser alterado");
        if (f.descontoPercentual() < 0 || f.descontoPercentual() > 100) throw new IllegalArgumentException("Desconto deve estar entre 0 e 100%");
        String antes = "R$ " + c.getValorParcela() + " / desconto " + c.getDescontoPercentual() + "%";
        c.setDescontoPercentual(f.descontoPercentual());
        c.setValorParcela(f.valorParcela() == null ? cobranca.valorOficial(c) : f.valorParcela().setScale(2, java.math.RoundingMode.HALF_UP));
        c.setObservacao(f.observacao());
        auditoria.registrar(g, "ALTERACAO_CONTRATO", c.getAluno().getNome() + ": " + antes + " -> R$ "
                + c.getValorParcela() + " / desconto " + c.getDescontoPercentual() + "%");
        return contratoView(c);
    }

    @PostMapping("/contratos/{id}/corrigir")
    public Map<String, Object> corrigirContrato(@PathVariable Long id, HttpServletRequest req) {
        Contrato c = achar(contratos.findById(id), "Contrato");
        return atualizarContrato(id, new ContratoForm(null, c.getDescontoPercentual(), c.getObservacao()), req);
    }

    /** RF16/RF44 - emissão de boletos (integração CORA simulada) com validação RN04. */
    @PostMapping("/contratos/{id}/gerar")
    public Map<String, Object> gerarParcelas(@PathVariable Long id, HttpServletRequest req) {
        Usuario g = gestor(req);
        Contrato c = achar(contratos.findById(id), "Contrato");
        int geradas = cobranca.gerarParcelas(c);
        auditoria.registrar(g, "COBRANCA_EMITIDA", geradas + " parcelas de R$ " + c.getValorParcela()
                + " emitidas para " + c.getAluno().getNome());
        Map<String, Object> v = contratoView(c);
        v.put("parcelasEmitidas", geradas);
        return v;
    }

    @GetMapping("/parcelas")
    public List<Map<String, Object>> parcelas(HttpServletRequest req) {
        gestor(req);
        return parcelas.findAll().stream()
                .sorted(Comparator.comparing(Parcela::getVencimento).thenComparing(p -> p.getContrato().getAluno().getNome()))
                .map(cobranca::view).toList();
    }

    @PostMapping("/parcelas/{id}/pagar")
    public Map<String, Object> pagar(@PathVariable Long id, HttpServletRequest req) {
        Usuario g = gestor(req);
        Parcela p = achar(parcelas.findById(id), "Parcela");
        cobranca.pagar(p);
        auditoria.registrar(g, "BAIXA_PAGAMENTO", "Parcela " + p.getNumero() + " de " + p.getContrato().getAluno().getNome()
                + " paga: R$ " + p.getValorPago() + " (boleto " + p.getCodigoBoleto() + ")");
        return cobranca.view(p);
    }

    // ---------- Instituição (RF24 / RN05) ----------

    @PutMapping("/instituicao")
    public Instituicao atualizarInstituicao(@RequestBody Instituicao f, HttpServletRequest req) {
        Usuario g = gestor(req);
        Instituicao i = instituicao.findById(1L).orElseThrow();
        i.setRazaoSocial(f.getRazaoSocial());
        i.setNomeFantasia(f.getNomeFantasia());
        i.setCnpj(f.getCnpj());
        i.setEndereco(f.getEndereco());
        i.setTelefone(f.getTelefone());
        i.setMultaPercentual(f.getMultaPercentual());
        i.setJurosMensalPercentual(f.getJurosMensalPercentual());
        auditoria.registrar(g, "ALTERACAO_INSTITUICAO", "Identidade institucional atualizada");
        return i;
    }

    // ---------- Comunicação (RF28, RF33) ----------

    public record AvisoForm(String titulo, String mensagem, Long turmaId) {}

    @PostMapping("/avisos")
    public Aviso novoAviso(@RequestBody AvisoForm f, HttpServletRequest req) {
        Usuario g = gestor(req);
        if (blank(f.titulo()) || blank(f.mensagem())) throw new IllegalArgumentException("Informe título e mensagem");
        Aviso a = new Aviso();
        a.setTitulo(f.titulo());
        a.setMensagem(f.mensagem());
        a.setAutor(g.getNome());
        a.setDataHora(LocalDateTime.now());
        a.setTurma(f.turmaId() == null ? null : achar(turmas.findById(f.turmaId()), "Turma"));
        return avisos.save(a);
    }

    @DeleteMapping("/avisos/{id}")
    public void excluirAviso(@PathVariable Long id, HttpServletRequest req) {
        gestor(req);
        avisos.deleteById(id);
    }

    @PostMapping("/calendario")
    public EventoCalendario novoEvento(@RequestBody EventoCalendario f, HttpServletRequest req) {
        gestor(req);
        if (f.getData() == null || blank(f.getTitulo())) throw new IllegalArgumentException("Informe data e título");
        f.setId(null);
        return eventos.save(f);
    }

    @DeleteMapping("/calendario/{id}")
    public void excluirEvento(@PathVariable Long id, HttpServletRequest req) {
        gestor(req);
        eventos.deleteById(id);
    }

    // ---------- Conformidade (RF38, RF39, RF41-RF43) ----------

    @GetMapping("/auditoria")
    public List<Auditoria> auditoria(HttpServletRequest req) {
        gestor(req);
        return auditorias.findTop200ByOrderByDataHoraDesc();
    }

    /** RN08: SMTT em março, Censo Escolar em junho, Sistema Presença a cada dois meses. */
    @GetMapping("/obrigacoes")
    public List<Map<String, Object>> obrigacoes(HttpServletRequest req) {
        gestor(req);
        LocalDate hoje = LocalDate.now();
        LocalDate smtt = LocalDate.of(hoje.getYear(), 3, 31);
        if (smtt.isBefore(hoje)) smtt = smtt.plusYears(1);
        LocalDate censo = LocalDate.of(hoje.getYear(), 6, 30);
        if (censo.isBefore(hoje)) censo = censo.plusYears(1);
        int mesPar = hoje.getMonthValue() % 2 == 0 ? hoje.getMonthValue() : hoje.getMonthValue() + 1;
        LocalDate presenca = YearMonth.of(hoje.getYear(), 1).plusMonths(mesPar - 1).atEndOfMonth();
        return List.of(
                obrigacao("Sistema Presença", "MEC", presenca, "Atualização bimestral de frequência escolar", hoje),
                obrigacao("Dados SMTT", "SMTT", smtt, "Informações anuais de alunos por turno", hoje),
                obrigacao("Censo Escolar", "INEP", censo, "Matrícula inicial - exportação dos dados dos alunos", hoje));
    }

    private Map<String, Object> obrigacao(String nome, String orgao, LocalDate prazo, String desc, LocalDate hoje) {
        long dias = ChronoUnit.DAYS.between(hoje, prazo);
        return Map.of("nome", nome, "orgao", orgao, "prazo", prazo, "descricao", desc, "diasRestantes", dias,
                "status", dias <= 15 ? "URGENTE" : dias <= 60 ? "PROXIMO" : "NO_PRAZO");
    }

    @GetMapping("/exportar/{tipo}")
    public ResponseEntity<byte[]> exportar(@PathVariable String tipo, HttpServletRequest req) {
        Usuario g = gestor(req);
        StringBuilder csv = new StringBuilder();
        List<Aluno> lista = alunos.findAll().stream().filter(a -> a.getStatus() == StatusMatricula.MATRICULADO)
                .sorted(Comparator.comparing(Aluno::getNome)).toList();
        switch (tipo) {
            case "censo" -> {
                csv.append("matricula;nome;data_nascimento;turma;etapa;turno\n");
                for (Aluno a : lista)
                    csv.append(String.join(";", a.getMatricula(), a.getNome(), String.valueOf(a.getDataNascimento()),
                            a.getTurma().getNome(), a.getTurma().getSegmento().name(), a.getTurma().getTurno())).append('\n');
            }
            case "smtt" -> {
                csv.append("turma;turno;horario;quantidade_alunos\n");
                for (Turma t : turmas.findAll())
                    csv.append(String.join(";", t.getNome(), t.getTurno(), t.getHorario(),
                            String.valueOf(lista.stream().filter(a -> a.getTurma().getId().equals(t.getId())).count()))).append('\n');
            }
            default -> throw new IllegalArgumentException("Tipo de exportação inválido");
        }
        auditoria.registrar(g, "EXPORTACAO", "Exportação " + tipo.toUpperCase() + " gerada");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + tipo + "-" + LocalDate.now() + ".csv")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(("﻿" + csv).getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping("/backup")
    public ResponseEntity<Map<String, Object>> backup(HttpServletRequest req) {
        Usuario g = gestor(req);
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("geradoEm", LocalDateTime.now());
        b.put("instituicao", instituicao.findById(1L).orElseThrow());
        b.put("turmas", turmas(req));
        b.put("alunos", alunos.findAll());
        b.put("contratos", contratos.findAll().stream().map(this::contratoView).toList());
        b.put("parcelas", parcelas.findAll().stream().map(cobranca::view).toList());
        b.put("notas", notas.findAll().stream().map(n -> Map.of("alunoId", n.getAluno().getId(),
                "disciplina", n.getDisciplina(), "bimestre", n.getBimestre(), "valor", n.getValor())).toList());
        auditoria.registrar(g, "BACKUP", "Cópia de segurança gerada");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=backup-semeando-" + LocalDate.now() + ".json")
                .body(b);
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
