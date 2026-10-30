package com.semeando.service;

import com.semeando.model.Perfil;
import com.semeando.model.Usuario;
import com.semeando.repo.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Autenticação simples por token em memória (ambiente local de demonstração). */
@Service
public class AuthService {
    private final UsuarioRepository usuarios;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final Map<String, Long> tokens = new ConcurrentHashMap<>();

    public AuthService(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    public String hash(String senha) {
        return encoder.encode(senha);
    }

    public String login(String email, String senha) {
        Usuario u = usuarios.findByEmailIgnoreCase(email == null ? "" : email.trim())
                .filter(x -> senha != null && encoder.matches(senha, x.getSenha()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos"));
        return emitirToken(u);
    }

    public String emitirToken(Usuario u) {
        String token = UUID.randomUUID().toString();
        tokens.put(token, u.getId());
        return token;
    }

    public void logout(HttpServletRequest req) {
        String t = token(req);
        if (t != null) tokens.remove(t);
    }

    public Usuario usuario(HttpServletRequest req) {
        String t = token(req);
        Long id = t == null ? null : tokens.get(t);
        if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão expirada, faça login novamente");
        return usuarios.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não encontrado"));
    }

    public Usuario usuarioPorToken(String token) {
        return usuarios.findById(tokens.get(token)).orElseThrow();
    }

    /** RF36 / RNF01 - controle de acesso por perfil. */
    public Usuario exigir(HttpServletRequest req, Perfil... perfis) {
        Usuario u = usuario(req);
        if (Arrays.stream(perfis).noneMatch(p -> p == u.getPerfil()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso não permitido para o seu perfil");
        return u;
    }

    private String token(HttpServletRequest req) {
        String h = req.getHeader("Authorization");
        return h != null && h.startsWith("Bearer ") ? h.substring(7) : null;
    }
}
