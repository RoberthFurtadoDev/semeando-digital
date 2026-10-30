package com.semeando.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.semeando.model.Perfil;
import com.semeando.model.Usuario;
import com.semeando.repo.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Login com conta Google (Google Identity Services).
 * O frontend envia o ID token (JWT) emitido pelo Google; aqui validamos assinatura,
 * emissor, validade e audiência (Client ID) antes de aceitar o e-mail.
 * Só entram contas já cadastradas no sistema (menor privilégio); os e-mails em
 * app.google.gestores são criados como Gestor no primeiro acesso.
 */
@Service
public class GoogleAuthService {
    private final String clientId;
    private final Set<String> gestores;
    private final UsuarioRepository usuarios;
    private final AuthService auth;
    private final AuditoriaService auditoria;
    private final GoogleIdTokenVerifier verifier;

    public GoogleAuthService(@Value("${app.google.client-id:}") String clientId,
                             @Value("${app.google.gestores:}") String gestores,
                             UsuarioRepository usuarios, AuthService auth, AuditoriaService auditoria) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.gestores = Arrays.stream(gestores.split(",")).map(String::trim).map(String::toLowerCase)
                .filter(s -> !s.isEmpty()).collect(Collectors.toSet());
        this.usuarios = usuarios;
        this.auth = auth;
        this.auditoria = auditoria;
        this.verifier = this.clientId.isEmpty() ? null
                : new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                        .setAudience(List.of(this.clientId)).build();
    }

    public String clientId() {
        return clientId.isEmpty() ? null : clientId;
    }

    @Transactional
    public String login(String credential) {
        if (verifier == null)
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Login com Google não configurado (GOOGLE_CLIENT_ID)");
        GoogleIdToken.Payload payload = verificar(credential);
        if (!Boolean.TRUE.equals(payload.getEmailVerified()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail da conta Google não verificado");
        String email = payload.getEmail().toLowerCase();
        Usuario u = usuarios.findByEmailIgnoreCase(email).orElseGet(() -> {
            if (!gestores.contains(email))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "A conta " + email + " não está cadastrada. Peça à secretaria para cadastrar este e-mail.");
            Object nome = payload.get("name");
            // senha aleatória: esta conta só entra pelo Google
            return usuarios.save(new Usuario(nome == null ? email : nome.toString(), email,
                    auth.hash(UUID.randomUUID().toString()), Perfil.GESTOR));
        });
        auditoria.registrar(u, "LOGIN_GOOGLE", "Acesso via conta Google");
        return auth.emitirToken(u);
    }

    private GoogleIdToken.Payload verificar(String credential) {
        try {
            GoogleIdToken token = credential == null ? null : verifier.verify(credential);
            if (token == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token do Google inválido ou expirado");
            return token.getPayload();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Não foi possível validar o login com Google");
        }
    }
}
