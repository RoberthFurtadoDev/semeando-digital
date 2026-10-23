package com.semeando.service;

import com.semeando.model.*;
import com.semeando.repo.FrequenciaRepository;
import com.semeando.repo.NotaRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class PedagogicoService {
    public static final List<String> DISCIPLINAS_INFANTIL =
            List.of("Linguagem", "Matemática", "Natureza e Sociedade", "Artes e Movimento");
    public static final List<String> DISCIPLINAS_FUNDAMENTAL =
            List.of("Português", "Matemática", "Ciências", "História", "Geografia", "Artes", "Educação Física");

    private static final Map<String, List<String>> MATERIAIS = new LinkedHashMap<>();
    static {
        List<String> infantil = List.of("1 caixa de lápis de cor (12 cores)", "2 tubos de cola branca 90g",
                "1 pacote de massinha de modelar", "1 tesoura sem ponta", "1 pasta com elástico",
                "1 caderno de desenho grande", "1 estojo de giz de cera", "1 avental de pintura");
        List<String> fundamental = List.of("4 cadernos de 96 folhas", "2 lápis grafite nº 2", "2 borrachas",
                "1 apontador com depósito", "1 caixa de lápis de cor (12 cores)", "1 régua de 30 cm",
                "1 tubo de cola branca 90g", "1 tesoura sem ponta", "1 dicionário de língua portuguesa");
        for (String t : List.of("Maternal I", "Maternal II", "Infantil I", "Infantil II")) MATERIAIS.put(t, infantil);
        for (String t : List.of("1º ano", "2º ano", "3º ano", "4º ano", "5º ano")) MATERIAIS.put(t, fundamental);
    }

    private final NotaRepository notas;
    private final FrequenciaRepository frequencias;

    public PedagogicoService(NotaRepository notas, FrequenciaRepository frequencias) {
        this.notas = notas;
        this.frequencias = frequencias;
    }

    public List<String> disciplinas(Segmento s) {
        return s == Segmento.INFANTIL ? DISCIPLINAS_INFANTIL : DISCIPLINAS_FUNDAMENTAL;
    }

    public List<String> materiais(String turma) {
        return MATERIAIS.getOrDefault(turma, List.of());
    }

    public Map<String, List<String>> todosMateriais() {
        return MATERIAIS;
    }

    public List<Map<String, Object>> boletim(Aluno aluno) {
        List<Nota> ns = notas.findByAluno(aluno);
        List<Map<String, Object>> linhas = new ArrayList<>();
        for (String d : disciplinas(aluno.getTurma().getSegmento())) {
            Map<String, Object> l = new LinkedHashMap<>();
            l.put("disciplina", d);
            double soma = 0;
            int qtd = 0;
            for (int b = 1; b <= 4; b++) {
                final int bim = b;
                Optional<Nota> n = ns.stream().filter(x -> x.getDisciplina().equals(d) && x.getBimestre() == bim).findFirst();
                l.put("b" + b, n.map(Nota::getValor).orElse(null));
                if (n.isPresent()) { soma += n.get().getValor(); qtd++; }
            }
            Double media = qtd == 0 ? null : Math.round(soma / qtd * 10) / 10.0;
            l.put("media", media);
            l.put("situacao", media == null ? "Sem notas" : qtd < 4 ? (media >= 6 ? "Em andamento" : "Atenção")
                    : (media >= 6 ? "Aprovado" : "Recuperação"));
            linhas.add(l);
        }
        return linhas;
    }

    public Map<String, Object> frequencia(Aluno aluno) {
        List<Frequencia> fs = frequencias.findByAluno(aluno);
        long presencas = fs.stream().filter(Frequencia::isPresente).count();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("aulas", fs.size());
        m.put("presencas", presencas);
        m.put("faltas", fs.size() - presencas);
        m.put("percentual", fs.isEmpty() ? 100.0 : Math.round(presencas * 1000.0 / fs.size()) / 10.0);
        return m;
    }
}
