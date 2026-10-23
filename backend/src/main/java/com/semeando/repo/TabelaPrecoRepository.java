package com.semeando.repo;

import com.semeando.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TabelaPrecoRepository extends JpaRepository<TabelaPreco, Long> {
    Optional<TabelaPreco> findBySerie(String serie);
}
