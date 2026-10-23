package com.semeando.config;

import com.semeando.model.*;
import com.semeando.repo.*;
import com.semeando.service.AuditoriaService;
import com.semeando.service.AuthService;
import com.semeando.service.CobrancaService;
import com.semeando.service.MatriculaService;
import com.semeando.service.PedagogicoService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/** Massa de dados 100% fictícia (RN07 - proibido usar dados reais em desenvolvimento). */
@Component
public class DataSeeder implements CommandLineRunner {
    public static final String SENHA_PADRAO = "123456";

    private static final String[] NOMES = {"Ana", "Bruno", "Clara", "Davi", "Elisa", "Felipe", "Giovana", "Heitor",
            "Isabela", "Joaquim", "Laura", "Miguel", "Nina", "Otávio", "Pietra", "Rafael", "Sara", "Theo", "Valentina",
            "Arthur", "Beatriz", "Caio", "Helena", "Enzo", "Lívia", "Gabriel", "Manuela", "Samuel", "Alice", "Benício",
            "Cecília", "Lorenzo", "Marina", "Noah", "Yasmin", "Bernardo"};
    private static final String[] SOBRENOMES = {"Almeida", "Barbosa", "Cardoso", "Dias", "Esteves", "Farias",
            "Gomes", "Lima", "Moraes", "Nogueira", "Ribeiro", "Teixeira"};
    private static final String[] NOMES_RESP = {"Patrícia", "Ricardo", "Fernanda", "Marcos", "Juliana", "Paulo",
            "Cristina", "André", "Luciana", "Rodrigo", "Simone", "Fábio"};

    private final UsuarioRepository usuarios;
    private final InstituicaoRepository instituicoes;
    private final TurmaRepository turmas;
    private final TabelaPrecoRepository precos;
    private final AlunoRepository alunos;
    private final ContratoRepository contratos;
    private final ParcelaRepository parcelas;
    private final NotaRepository notas;
    private final FrequenciaRepository frequencias;
    private final RegistroAulaRepository registros;
    private final PlanoAulaRepository planos;
    private final AvisoRepository avisos;
    private final EventoCalendarioRepository eventos;
    private final AuthService auth;
    private final MatriculaService matricula;
    private final CobrancaService cobranca;
    private final PedagogicoService pedagogico;
    private final AuditoriaService auditoria;
    private final Random rnd = new Random(42);
    private String senha;
    private int seqResp = 1;

    public DataSeeder(UsuarioRepository usuarios, InstituicaoRepository instituicoes, TurmaRepository turmas,
                      TabelaPrecoRepository precos, AlunoRepository alunos, ContratoRepository contratos,
                      ParcelaRepository parcelas, NotaRepository notas, FrequenciaRepository frequencias,
                      RegistroAulaRepository registros, PlanoAulaRepository planos, AvisoRepository avisos,
                      EventoCalendarioRepository eventos, AuthService auth, MatriculaService matricula,
                      CobrancaService cobranca, PedagogicoService pedagogico, AuditoriaService auditoria) {
        this.usuarios = usuarios;
        this.instituicoes = instituicoes;
        this.turmas = turmas;
        this.precos = precos;
        this.alunos = alunos;
        this.contratos = contratos;
        this.parcelas = parcelas;
        this.notas = notas;
        this.frequencias = frequencias;
        this.registros = registros;
        this.planos = planos;
        this.avisos = avisos;
        this.eventos = eventos;
        this.auth = auth;
        this.matricula = matricula;
        this.cobranca = cobranca;
        this.pedagogico = pedagogico;
        this.auditoria = auditoria;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (usuarios.count() > 0) return;
        senha = auth.hash(SENHA_PADRAO);
        int ano = LocalDate.now().getYear();

        Instituicao inst = new Instituicao();
        inst.setRazaoSocial("Instituto Educacional Semeando");
        inst.setNomeFantasia("Centro Educacional Semeando");
        inst.setCnpj("00.000.000/0001-00");
        inst.setEndereco("Rua Exemplo, 100 - Pontal da Ilha, São Luís/MA");
        inst.setTelefone("(98) 0000-0000");
        instituicoes.save(inst);

        Usuario gestor = usuario("Coordenação Semeando", "gestor@exemplo.com", Perfil.GESTOR);
        Usuario ana = usuario("Ana Beatriz Souza", "professor@exemplo.com", Perfil.PROFESSOR);
        ana.setDisciplinas("Polivalente - Ensino Fundamental");
        Usuario carlos = usuario("Carlos Mendes", "professor2@exemplo.com", Perfil.PROFESSOR);
        carlos.setDisciplinas("Polivalente - Educação Infantil");
        Usuario juliana = usuario("Juliana Costa", "professor3@exemplo.com", Perfil.PROFESSOR);
        juliana.setDisciplinas("Polivalente - Ensino Fundamental");

        Object[][] defs = {
                {"Maternal I", Segmento.INFANTIL, "Manhã", "Sala 1", "07:30 - 11:30", carlos, "150.00"},
                {"Maternal II", Segmento.INFANTIL, "Manhã", "Sala 2", "07:30 - 11:30", carlos, "150.00"},
                {"Infantil I", Segmento.INFANTIL, "Tarde", "Sala 1", "13:30 - 17:30", carlos, "180.00"},
                {"Infantil II", Segmento.INFANTIL, "Tarde", "Sala 2", "13:30 - 17:30", carlos, "180.00"},
                {"1º ano", Segmento.FUNDAMENTAL, "Manhã", "Sala 3", "07:00 - 11:30", juliana, "375.00"},
                {"2º ano", Segmento.FUNDAMENTAL, "Manhã", "Sala 4", "07:00 - 11:30", juliana, "375.00"},
                {"3º ano", Segmento.FUNDAMENTAL, "Manhã", "Sala 5", "07:00 - 11:30", ana, "375.00"},
                {"4º ano", Segmento.FUNDAMENTAL, "Tarde", "Sala 3", "13:00 - 17:30", juliana, "375.00"},
                {"5º ano", Segmento.FUNDAMENTAL, "Tarde", "Sala 5", "13:00 - 17:30", ana, "375.00"},
        };
        Map<String, Turma> t = new LinkedHashMap<>();
        for (Object[] d : defs) {
            Turma tu = new Turma((String) d[0], (Segmento) d[1], (String) d[2], (String) d[3], (String) d[4]);
            tu.setProfessor((Usuario) d[5]);
            t.put(tu.getNome(), turmas.save(tu));
            precos.save(new TabelaPreco(tu.getNome(), new BigDecimal((String) d[6])));
        }

        // Família de demonstração: um filho no Fundamental e outra na Educação Infantil (modelo dual RN01)
        Usuario maria = usuario("Maria Pereira", "responsavel@exemplo.com", Perfil.RESPONSAVEL);
        maria.setTelefone("(98) 90000-0001");
        Aluno lucas = matriculado("Lucas Pereira", t.get("3º ano"), maria, LocalDate.of(ano - 8, 4, 12));
        Usuario uLucas = usuario("Lucas Pereira", "aluno@exemplo.com", Perfil.ALUNO);
        lucas.setUsuario(uLucas);
        matriculado("Sofia Pereira", t.get("Infantil II"), maria, LocalDate.of(ano - 5, 9, 3));

        int i = 0;
        for (Turma tu : t.values()) {
            for (int k = 0; k < 5; k++, i++) {
                String nome = NOMES[i % NOMES.length] + " " + SOBRENOMES[(i * 7) % SOBRENOMES.length];
                Usuario resp = responsavel(SOBRENOMES[(i * 7) % SOBRENOMES.length]);
                matriculado(nome, tu, resp, LocalDate.of(ano - idade(tu), 1 + rnd.nextInt(12), 1 + rnd.nextInt(28)));
            }
        }

        // Contratos e parcelas
        LocalDate hoje = LocalDate.now();
        boolean divergenteCriado = false, bolsaCriada = false;
        for (Aluno a : alunos.findAll()) {
            Contrato c = contratos.save(matricula.novoContrato(a, ano));
            if (!divergenteCriado && a != lucas && a.getTurma().getNome().equals("3º ano")) {
                divergenteCriado = true;
                // Caso real encontrado na análise: contrato com valor divergente da tabela oficial (RN04)
                c.setValorParcela(new BigDecimal("310.00"));
                c.setObservacao("Contrato migrado do arquivo Word - valor a conferir");
                continue;
            }
            if (!bolsaCriada && a.getTurma().getNome().equals("5º ano")) { // bolsa de 50% (RF21)
                bolsaCriada = true;
                c.setDescontoPercentual(50);
                c.setObservacao("Bolsa social de 50%");
            }
            if (c.getDescontoPercentual() > 0) c.setValorParcela(cobranca.valorOficial(c));
            cobranca.gerarParcelas(c, false);
            boolean inadimplente = a == lucas || rnd.nextInt(5) == 0;
            for (Parcela p : parcelas.findByContratoOrderByNumero(c)) {
                boolean venceu = p.getVencimento().isBefore(hoje);
                boolean recente = p.getVencimento().isAfter(hoje.minusDays(50));
                if (venceu && !(inadimplente && recente)) {
                    p.setPago(true);
                    p.setDataPagamento(p.getVencimento().minusDays(rnd.nextInt(5)));
                    p.setValorPago(p.getValor());
                }
            }
        }

        // Pré-matrículas em andamento (RF01, RF02, RF06)
        Aluno pre1 = preMatricula("Pedro Henrique Dias", t.get("1º ano"), StatusMatricula.PRE_MATRICULA);
        pre1.setDocCertidaoNascimento(true);
        pre1.setDocFoto(true);
        Aluno pre2 = preMatricula("Luna Farias", t.get("Maternal I"), StatusMatricula.PRE_MATRICULA);
        pre2.setDocCertidaoNascimento(true);
        pre2.setDocComprovanteResidencia(true);
        pre2.setConsentimentoLgpd(true);
        Aluno pre3 = preMatricula("Matheus Lima", t.get("4º ano"), StatusMatricula.APROVADA);
        completarDocumentos(pre3);
        pre3.setFardamento("2 camisas (P), 1 bermuda (P)");
        pre3.setHospitalReferencia("Hospital Municipal (exemplo)");
        pre3.setContatoEmergencia(pre3.getResponsaveis().get(0).getNome() + " - (98) 90000-0999");
        pre3.setAutorizadosRetirada(pre3.getResponsaveis().get(0).getNome());
        Aluno pre4 = preMatricula("Antônio Ribeiro", t.get("5º ano"), StatusMatricula.REJEITADA);
        pre4.setMotivoRejeicao("Família optou por outra escola após visita.");

        // Diário de classe: notas, frequência e conteúdos
        List<LocalDate> dias = new ArrayList<>();
        for (LocalDate d = hoje.minusDays(1); dias.size() < 20; d = d.minusDays(1))
            if (d.getDayOfWeek() != DayOfWeek.SATURDAY && d.getDayOfWeek() != DayOfWeek.SUNDAY) dias.add(d);
        for (Aluno a : alunos.findAll()) {
            if (a.getStatus() != StatusMatricula.MATRICULADO) continue;
            double base = 5.5 + rnd.nextDouble() * 4;
            for (String disc : pedagogico.disciplinas(a.getTurma().getSegmento())) {
                for (int b = 1; b <= 3; b++) {
                    Nota n = new Nota();
                    n.setAluno(a);
                    n.setDisciplina(disc);
                    n.setBimestre(b);
                    n.setValor(Math.max(0, Math.min(10, Math.round((base + rnd.nextGaussian()) * 2) / 2.0)));
                    notas.save(n);
                }
            }
            for (LocalDate d : dias) {
                Frequencia f = new Frequencia();
                f.setAluno(a);
                f.setData(d);
                f.setPresente(rnd.nextInt(100) < 92);
                frequencias.save(f);
            }
        }
        String[][] conteudos = {
                {"Português", "Leitura compartilhada e interpretação de texto: fábulas."},
                {"Matemática", "Multiplicação com reagrupamento - exercícios no caderno."},
                {"Ciências", "Ciclo da água: experimento com evaporação."},
                {"História", "A formação da cidade de São Luís."},
        };
        for (int k = 0; k < conteudos.length; k++) {
            RegistroAula r = new RegistroAula();
            r.setTurma(t.get("3º ano"));
            r.setData(dias.get(k));
            r.setDisciplina(conteudos[k][0]);
            r.setConteudo(conteudos[k][1]);
            registros.save(r);
        }
        plano(ana, t.get("3º ano"), "Matemática", hoje.plusDays(2), "Divisão exata",
                "Compreender a divisão como repartição em partes iguais.",
                "Uso de material concreto (tampinhas), resolução de problemas em dupla.");
        plano(ana, t.get("5º ano"), "Ciências", hoje.plusDays(3), "Sistema solar",
                "Identificar os planetas e suas características.",
                "Vídeo curto, construção de maquete em grupo e roda de conversa.");

        aviso("Reunião de pais e mestres", "Convidamos todas as famílias para a reunião do 4º bimestre no sábado, às 9h, no pátio da escola.", gestor, null, 1);
        aviso("Campanha de vacinação", "Lembramos que o cartão de vacina atualizado é documento obrigatório para a rematrícula.", gestor, null, 3);
        aviso("Feira de Ciências", "O 3º ano apresentará os experimentos sobre o ciclo da água na próxima sexta-feira. Tragam garrafa PET.", ana, t.get("3º ano"), 2);
        aviso("Rematrícula " + (ano + 1), "As rematrículas para o próximo ano letivo começam em novembro. Fique atento aos documentos obrigatórios.", gestor, null, 5);

        evento(LocalDate.of(ano, 2, 2), "Início do ano letivo", "LETIVO");
        evento(LocalDate.of(ano, 4, 21), "Tiradentes", "FERIADO");
        evento(LocalDate.of(ano, 4, 30), "Fim do 1º bimestre", "AVALIACAO");
        evento(LocalDate.of(ano, 7, 3), "Fim do 2º bimestre", "AVALIACAO");
        evento(LocalDate.of(ano, 7, 6), "Início do recesso escolar", "FERIADO");
        evento(LocalDate.of(ano, 7, 27), "Retorno das aulas", "LETIVO");
        evento(LocalDate.of(ano, 9, 7), "Independência do Brasil", "FERIADO");
        evento(LocalDate.of(ano, 9, 30), "Fim do 3º bimestre", "AVALIACAO");
        evento(hoje.plusDays(7), "Feira de Ciências", "LETIVO");
        evento(hoje.plusDays(15), "Reunião de pais e mestres", "REUNIAO");
        evento(LocalDate.of(ano, 12, 11), "Fim do 4º bimestre", "AVALIACAO");
        evento(LocalDate.of(ano, 12, 18), "Encerramento do ano letivo", "LETIVO");

        auditoria.registrar(null, "CARGA_INICIAL", "Massa de dados fictícia criada para demonstração (RN07).");
    }

    private int idade(Turma t) {
        return switch (t.getNome()) {
            case "Maternal I" -> 2;
            case "Maternal II" -> 3;
            case "Infantil I" -> 4;
            case "Infantil II" -> 5;
            default -> 5 + Integer.parseInt(t.getNome().substring(0, 1));
        };
    }

    private Usuario usuario(String nome, String email, Perfil perfil) {
        return usuarios.save(new Usuario(nome, email, senha, perfil));
    }

    private Usuario responsavel(String sobrenome) {
        int n = seqResp++;
        Usuario u = usuario(NOMES_RESP[n % NOMES_RESP.length] + " " + sobrenome, "resp" + n + "@exemplo.com", Perfil.RESPONSAVEL);
        u.setTelefone(String.format("(98) 90000-%04d", 100 + n));
        return u;
    }

    private void completarDocumentos(Aluno a) {
        a.setDocCertidaoNascimento(true);
        a.setDocComprovanteResidencia(true);
        a.setDocCartaoVacina(true);
        a.setDocFoto(true);
        a.setDocDocumentoResponsavel(true);
        a.setTaxaMatriculaPaga(true);
        a.setComprovanteTaxa("REC-" + (1000 + rnd.nextInt(9000)));
        a.setConsentimentoLgpd(true);
    }

    private Aluno matriculado(String nome, Turma turma, Usuario resp, LocalDate nascimento) {
        Aluno a = new Aluno();
        a.setNome(nome);
        a.setTurma(turma);
        a.setDataNascimento(nascimento);
        a.setStatus(StatusMatricula.MATRICULADO);
        completarDocumentos(a);
        a.setHospitalReferencia("Hospital Municipal (exemplo)");
        a.setContatoEmergencia(resp.getNome() + " - " + resp.getTelefone());
        a.setAutorizadosRetirada(resp.getNome());
        a.getResponsaveis().add(resp);
        a = alunos.save(a);
        a.setMatricula(LocalDate.now().getYear() + String.format("%04d", a.getId()));
        return a;
    }

    private Aluno preMatricula(String nome, Turma turma, StatusMatricula status) {
        Aluno a = new Aluno();
        a.setNome(nome);
        a.setTurma(turma);
        a.setDataNascimento(LocalDate.now().minusYears(idade(turma)).minusDays(rnd.nextInt(300)));
        a.setStatus(status);
        a.getResponsaveis().add(responsavel(nome.substring(nome.lastIndexOf(' ') + 1)));
        return alunos.save(a);
    }

    private void plano(Usuario prof, Turma turma, String disc, LocalDate data, String titulo, String obj, String ativ) {
        PlanoAula p = new PlanoAula();
        p.setProfessor(prof);
        p.setTurma(turma);
        p.setDisciplina(disc);
        p.setData(data);
        p.setTitulo(titulo);
        p.setObjetivos(obj);
        p.setAtividades(ativ);
        planos.save(p);
    }

    private void aviso(String titulo, String msg, Usuario autor, Turma turma, int diasAtras) {
        Aviso a = new Aviso();
        a.setTitulo(titulo);
        a.setMensagem(msg);
        a.setAutor(autor.getNome());
        a.setTurma(turma);
        a.setDataHora(LocalDateTime.now().minusDays(diasAtras));
        avisos.save(a);
    }

    private void evento(LocalDate d, String titulo, String tipo) {
        eventos.save(new EventoCalendario(d, titulo, tipo));
    }
}
