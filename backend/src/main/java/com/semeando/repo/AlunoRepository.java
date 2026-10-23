package com.semeando.repo;

import com.semeando.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AlunoRepository extends JpaRepository<Aluno, Long> {
    List<Aluno> findByTurmaAndStatusOrderByNome(Turma turma, StatusMatricula status);
    long countByTurmaAndStatus(Turma turma, StatusMatricula status);
    long countByStatus(StatusMatricula status);
    Optional<Aluno> findByUsuario(Usuario usuario);
    List<Aluno> findByResponsaveisContainingOrderByNome(Usuario responsavel);
}
