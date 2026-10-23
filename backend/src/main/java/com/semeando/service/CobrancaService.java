package com.semeando.service;

import com.semeando.model.*;
import com.semeando.repo.InstituicaoRepository;
import com.semeando.repo.ParcelaRepository;
import com.semeando.repo.TabelaPrecoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/** Regras de cobrança isoladas em um único ponto do sistema (RN01, RN03, RN04). */
@Service
public class CobrancaService {
    private final TabelaPrecoRepository tabela;
    private final ParcelaRepository parcelas;
    private final InstituicaoRepository instituicao;

    public CobrancaService(TabelaPrecoRepository tabela, ParcelaRepository parcelas, InstituicaoRepository instituicao) {
        this.tabela = tabela;
        this.parcelas = parcelas;
        this.instituicao = instituicao;
    }

    public BigDecimal valorTabela(String serie) {
        return tabela.findBySerie(serie).map(TabelaPreco::getValor)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "Série sem valor na tabela oficial: " + serie));
    }

    /** Valor oficial da parcela considerando bolsa/desconto do contrato. */
    public BigDecimal valorOficial(Contrato c) {
        BigDecimal base = valorTabela(c.getAluno().getTurma().getNome());
        BigDecimal fator = BigDecimal.valueOf(100 - c.getDescontoPercentual()).divide(BigDecimal.valueOf(100));
        return base.multiply(fator).setScale(2, RoundingMode.HALF_UP);
    }

    public boolean divergente(Contrato c) {
        return c.getValorParcela().compareTo(valorOficial(c)) != 0;
    }

    public int gerarParcelas(Contrato c) {
        return gerarParcelas(c, true);
    }

    /** @param apenasAVencer ignora parcelas com vencimento já passado (matrícula no meio do ano). */
    public int gerarParcelas(Contrato c, boolean apenasAVencer) {
        if (c.isParcelasGeradas())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "As parcelas deste contrato já foram geradas");
        if (divergente(c))
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Valor da parcela (R$ " + c.getValorParcela() + ") diverge da tabela oficial (R$ "
                            + valorOficial(c) + "). Corrija o contrato antes de emitir a cobrança.");
        int geradas = 0;
        for (int i = 1; i <= c.getNumeroParcelas(); i++) {
            LocalDate vencimento = LocalDate.of(c.getAnoLetivo(), 1, 10).plusMonths(i);
            if (apenasAVencer && vencimento.isBefore(LocalDate.now())) continue;
            Parcela p = new Parcela();
            p.setContrato(c);
            p.setNumero(i);
            p.setVencimento(vencimento);
            p.setValor(c.getValorParcela());
            p.setCodigoBoleto("CORA-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            parcelas.save(p);
            geradas++;
        }
        c.setParcelasGeradas(true);
        return geradas;
    }

    public long diasAtraso(Parcela p) {
        LocalDate ref = p.isPago() ? p.getDataPagamento() : LocalDate.now();
        return Math.max(0, ChronoUnit.DAYS.between(p.getVencimento(), ref));
    }

    public BigDecimal multa(Parcela p) {
        if (diasAtraso(p) == 0) return BigDecimal.ZERO.setScale(2);
        double perc = instituicao.findById(1L).map(Instituicao::getMultaPercentual).orElse(2.0);
        return p.getValor().multiply(BigDecimal.valueOf(perc / 100)).setScale(2, RoundingMode.HALF_UP);
    }

    /** Juros de mora pro rata die sobre o saldo devedor. */
    public BigDecimal juros(Parcela p) {
        long dias = diasAtraso(p);
        double mensal = instituicao.findById(1L).map(Instituicao::getJurosMensalPercentual).orElse(1.0);
        return p.getValor().multiply(BigDecimal.valueOf(mensal / 100 / 30 * dias)).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal total(Parcela p) {
        return p.getValor().add(multa(p)).add(juros(p));
    }

    public String situacao(Parcela p) {
        if (p.isPago()) return "PAGA";
        return p.getVencimento().isBefore(LocalDate.now()) ? "ATRASADA" : "ABERTA";
    }

    public void pagar(Parcela p) {
        if (p.isPago()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Parcela já está paga");
        p.setValorPago(total(p));
        p.setDataPagamento(LocalDate.now());
        p.setPago(true);
    }

    public Map<String, Object> view(Parcela p) {
        Map<String, Object> m = new LinkedHashMap<>();
        Aluno a = p.getContrato().getAluno();
        m.put("id", p.getId());
        m.put("aluno", a.getNome());
        m.put("alunoId", a.getId());
        m.put("turma", a.getTurma().getNome());
        m.put("tipo", a.getTurma().getSegmento().tipoCobranca());
        m.put("numero", p.getNumero());
        m.put("totalParcelas", p.getContrato().getNumeroParcelas());
        m.put("vencimento", p.getVencimento());
        m.put("valor", p.getValor());
        m.put("diasAtraso", p.isPago() ? 0 : diasAtraso(p));
        m.put("multa", p.isPago() ? BigDecimal.ZERO : multa(p));
        m.put("juros", p.isPago() ? BigDecimal.ZERO : juros(p));
        m.put("total", p.isPago() ? p.getValorPago() : total(p));
        m.put("situacao", situacao(p));
        m.put("dataPagamento", p.getDataPagamento());
        m.put("codigoBoleto", p.getCodigoBoleto());
        return m;
    }
}
