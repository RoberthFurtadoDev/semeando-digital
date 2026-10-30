package com.semeando.web;

import com.semeando.model.Usuario;
import com.semeando.service.AuthService;
import com.semeando.service.GoogleAuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final GoogleAuthService google;

    public AuthController(AuthService auth, GoogleAuthService google) {
        this.auth = auth;
        this.google = google;
    }

    public record LoginForm(String email, String senha) {}

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginForm form, HttpServletRequest req) {
        String token = auth.login(form.email(), form.senha());
        return Map.of("token", token, "usuario", usuarioSemSenha(auth.usuarioPorToken(token)));
    }

    public record GoogleForm(String credential) {}

    @PostMapping("/google")
    public Map<String, Object> loginGoogle(@RequestBody GoogleForm form) {
        String token = google.login(form.credential());
        return Map.of("token", token, "usuario", usuarioSemSenha(auth.usuarioPorToken(token)));
    }

    /** Configuração pública usada pela tela de login. */
    @GetMapping("/config")
    public Map<String, Object> config() {
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("googleClientId", google.clientId());
        return m;
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
