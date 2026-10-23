# UML — Semeando Digital

## 1. Casos de uso
```mermaid
flowchart LR
    G([Gestão / Secretaria])
    P([Professor])
    A([Aluno])
    R([Responsável])

    subgraph Sistema Semeando Digital
        UC1(Registrar pré-matrícula)
        UC2(Aprovar / rejeitar matrícula)
        UC3(Efetivar matrícula)
        UC4(Emitir boletos)
        UC5(Dar baixa em pagamento)
        UC6(Gerenciar turmas e professores)
        UC7(Publicar avisos)
        UC8(Exportar Censo / SMTT e backup)
        UC9(Registrar chamada)
        UC10(Lançar notas)
        UC11(Cadastrar plano de aula)
        UC12(Consultar boletim e frequência)
        UC13(Consultar cobranças e boletos)
        UC14(Atualizar dados de emergência)
        UC15(Consultar avisos e calendário)
    end

    G --- UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8
    P --- UC9 & UC10 & UC11 & UC7
    A --- UC12 & UC15
    R --- UC12 & UC13 & UC14 & UC15
```

## 2. Diagrama de classes (domínio)
```mermaid
classDiagram
    direction TB
    class Perfil {
        <<enumeration>>
        GESTOR
        PROFESSOR
        ALUNO
        RESPONSAVEL
    }
    class Segmento {
        <<enumeration>>
        INFANTIL
        FUNDAMENTAL
        +tipoCobranca() String
        +tipoDocumento() String
    }
    class StatusMatricula {
        <<enumeration>>
        PRE_MATRICULA
        APROVADA
        MATRICULADO
        REJEITADA
    }
    class Usuario {
        -Long id
        -String nome
        -String email
        -String senha
        -Perfil perfil
        -String telefone
        -String disciplinas
    }
    class Instituicao {
        -String razaoSocial
        -String nomeFantasia
        -String cnpj
        -String endereco
        -double multaPercentual
        -double jurosMensalPercentual
    }
    class Turma {
        +int CAPACIDADE_MAXIMA = 30
        -String nome
        -Segmento segmento
        -String turno
        -String sala
        -String horario
    }
    class TabelaPreco {
        -String serie
        -BigDecimal valor
    }
    class Aluno {
        -String nome
        -LocalDate dataNascimento
        -String matricula
        -StatusMatricula status
        -String motivoRejeicao
        -boolean docCertidaoNascimento
        -boolean docComprovanteResidencia
        -boolean docCartaoVacina
        -boolean taxaMatriculaPaga
        -boolean consentimentoLgpd
        -String hospitalReferencia
        -String contatoEmergencia
        -String autorizadosRetirada
        +getPendencias() List~String~
    }
    class Contrato {
        -String tipo
        -int anoLetivo
        -int numeroParcelas
        -BigDecimal valorParcela
        -double descontoPercentual
        -boolean parcelasGeradas
    }
    class Parcela {
        -int numero
        -LocalDate vencimento
        -BigDecimal valor
        -boolean pago
        -LocalDate dataPagamento
        -String codigoBoleto
    }
    class Nota {
        -String disciplina
        -int bimestre
        -double valor
    }
    class Frequencia {
        -LocalDate data
        -boolean presente
    }
    class RegistroAula {
        -LocalDate data
        -String disciplina
        -String conteudo
    }
    class PlanoAula {
        -String disciplina
        -LocalDate data
        -String titulo
        -String objetivos
    }
    class Aviso {
        -String titulo
        -String mensagem
        -LocalDateTime dataHora
    }
    class Auditoria {
        -LocalDateTime dataHora
        -String usuario
        -String acao
        -String detalhe
    }

    Usuario --> Perfil
    Turma --> Segmento
    Aluno --> StatusMatricula
    Usuario "0..1" <-- "*" Turma : professor
    Turma "1" <-- "*" Aluno : turma
    Aluno "*" --> "1..*" Usuario : responsáveis
    Aluno "0..1" --> "0..1" Usuario : login do aluno
    Contrato "*" --> "1" Aluno
    Parcela "*" --* "1" Contrato
    Nota "*" --> "1" Aluno
    Frequencia "*" --> "1" Aluno
    RegistroAula "*" --> "1" Turma
    PlanoAula "*" --> "1" Turma
    PlanoAula "*" --> "1" Usuario : professor
    Aviso "*" --> "0..1" Turma : null = toda a escola
```

## 3. Camada de serviços (regras de negócio)
```mermaid
classDiagram
    direction LR
    class CobrancaService {
        +valorTabela(serie) BigDecimal
        +valorOficial(Contrato) BigDecimal
        +divergente(Contrato) boolean
        +gerarParcelas(Contrato) int
        +multa(Parcela) BigDecimal
        +juros(Parcela) BigDecimal
        +pagar(Parcela)
    }
    class MatriculaService {
        +vagas(Turma) long
        +efetivar(Aluno) Contrato
        +novoContrato(Aluno, ano) Contrato
    }
    class PedagogicoService {
        +disciplinas(Segmento) List
        +boletim(Aluno) List
        +frequencia(Aluno) Map
        +materiais(turma) List
    }
    class AuthService {
        +login(email, senha) String
        +exigir(request, perfis) Usuario
    }
    class AuditoriaService {
        +registrar(Usuario, acao, detalhe)
    }
    class GestorController
    class ProfessorController
    class FamiliaController

    MatriculaService --> CobrancaService
    GestorController --> MatriculaService
    GestorController --> CobrancaService
    GestorController --> AuditoriaService
    ProfessorController --> PedagogicoService
    FamiliaController --> PedagogicoService
    FamiliaController --> CobrancaService
    GestorController ..> AuthService
    ProfessorController ..> AuthService
    FamiliaController ..> AuthService
```

## 4. Sequência — emissão de boletos com validação (RN04)
```mermaid
sequenceDiagram
    actor G as Gestor
    participant UI as Frontend (React)
    participant API as GestorController
    participant C as CobrancaService
    participant DB as Banco (H2)

    G->>UI: Clica em "Emitir boletos"
    UI->>API: POST /api/gestor/contratos/{id}/gerar
    API->>C: gerarParcelas(contrato)
    C->>DB: busca valor da tabela oficial
    alt valor do contrato diverge da tabela
        C-->>API: erro 422 "valor diverge da tabela oficial"
        API-->>UI: 422 + mensagem
        UI-->>G: alerta e botão "Corrigir valor"
    else valor conforme
        C->>DB: salva parcelas a vencer (boletos CORA)
        API->>DB: registra auditoria
        API-->>UI: 200 + quantidade emitida
        UI-->>G: "N boleto(s) emitido(s)"
    end
```

## 5. Estados da matrícula
```mermaid
stateDiagram-v2
    [*] --> PRE_MATRICULA : registrar
    PRE_MATRICULA --> APROVADA : aprovar
    PRE_MATRICULA --> REJEITADA : rejeitar (motivo)
    APROVADA --> REJEITADA : rejeitar (motivo)
    APROVADA --> MATRICULADO : efetivar [sem pendências e com vaga]
    MATRICULADO --> [*]
    REJEITADA --> [*]
```
