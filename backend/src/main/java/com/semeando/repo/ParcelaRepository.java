package com.semeando.repo;

import com.semeando.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ParcelaRepository extends JpaRepository<Parcela, Long> {
    List<Parcela> findByContratoOrderByNumero(Contrato contrato);
    List<Parcela> findByContratoAlunoOrderByVencimento(Aluno aluno);
}
