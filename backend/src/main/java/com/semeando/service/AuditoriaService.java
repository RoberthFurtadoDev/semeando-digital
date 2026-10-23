package com.semeando.service;

import com.semeando.model.Auditoria;
import com.semeando.model.Usuario;
import com.semeando.repo.AuditoriaRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuditoriaService {
    private final AuditoriaRepository repo;

    public AuditoriaService(AuditoriaRepository repo) {
        this.repo = repo;
    }

    public void registrar(Usuario usuario, String acao, String detalhe) {
        Auditoria a = new Auditoria();
        a.setDataHora(LocalDateTime.now());
        a.setUsuario(usuario == null ? "sistema" : usuario.getNome() + " <" + usuario.getEmail() + ">");
        a.setAcao(acao);
        a.setDetalhe(detalhe);
        repo.save(a);
    }
}
