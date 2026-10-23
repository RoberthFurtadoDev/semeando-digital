package com.semeando.web;

import com.semeando.model.Usuario;
import com.semeando.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    public record LoginForm(String email, String senha) {}

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginForm form, HttpServletRequest req) {
        String token = auth.login(form.email(), form.senha());
        return Map.of("token", token, "usuario", usuarioSemSenha(auth.usuarioPorToken(token)));
    }

    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest req) {
        return usuarioSemSenha(auth.usuario(req));
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest req) {
        auth.logout(req);
    }

    private Map<String, Object> usuarioSemSenha(Usuario u) {
        return Map.of("id", u.getId(), "nome", u.getNome(), "email", u.getEmail(), "perfil", u.getPerfil());
    }
}
