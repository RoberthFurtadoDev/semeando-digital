package com.semeando.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Em produção o frontend (React) é servido pelo próprio Spring Boot a partir de /static.
 * Rotas da interface (/gestor, /aluno...) devolvem o index.html para o React Router.
 */
@Controller
public class SpaController {
    @GetMapping({"/login", "/gestor/**", "/professor/**", "/aluno/**", "/responsavel/**"})
    public String app() {
        return "forward:/index.html";
    }
}
