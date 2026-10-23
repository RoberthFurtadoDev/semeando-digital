package com.semeando.repo;

import com.semeando.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FrequenciaRepository extends JpaRepository<Frequencia, Long> {
    List<Frequencia> findByAluno(Aluno aluno);
    Optional<Frequencia> findByAlunoAndData(Aluno aluno, LocalDate data);
}
