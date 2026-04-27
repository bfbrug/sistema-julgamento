# Visão do Produto — Sistema de Julgamento de Eventos

> Documento de referência para entendimento do produto. Não substitui especificações técnicas detalhadas (essas vivem nos prompts de implementação P00-P19) nem o `PROJECT_STANDARDS.md` (regras de arquitetura e código).

---

## 1. O que o sistema faz

O sistema gerencia o ciclo completo de eventos avaliados por jurados — competições escolares, festivais artísticos, concursos culturais e similares. Cobre desde a configuração do evento até a emissão dos relatórios e certificados finais.

O fluxo central tem três momentos:

1. **Antes do evento.** Um gestor cadastra o evento, define as categorias de avaliação, vincula jurados a categorias específicas e cadastra os participantes na ordem de apresentação.
2. **Durante o evento.** O gestor controla a fila de participantes. Cada participante ativado aparece automaticamente nas telas dos jurados, que registram suas notas. Quando todos os jurados confirmam suas avaliações, o participante é finalizado e o sistema aguarda o gestor ativar o próximo.
3. **Depois do evento.** O sistema calcula a classificação final aplicando a regra escolhida (média de médias ou média aparada), resolve empates pela cascata configurada, e emite relatórios em PDF (top-N, geral, por jurado). Certificados de participação podem ser emitidos a qualquer momento — inclusive antes do evento, quando o organizador prefere imprimi-los antecipadamente.

---

## 2. Quem usa

**Gestor.** Pessoa responsável pelo evento. Cadastra tudo, controla a fila durante o julgamento, gera relatórios e certificados. Tem visão completa de todos os dados.

**Jurado.** Pessoa que avalia os participantes nas categorias que lhe foram atribuídas. Sua tela é simples: aguarda o participante ser liberado, vê preview com nome e foto, abre formulário de notas (apenas das suas categorias), confirma, revisa e finaliza. Não vê notas de outros jurados.

Outros papéis (administrador da plataforma, operador de palco, jurado-presidente) **não fazem parte do escopo da v1**.

---

## 3. Decisões-chave do produto

### 3.1 Sobre o evento

- **Escala de notas configurável por evento.** Mínimo e máximo definidos no cadastro (ex.: 5 a 10). Uma casa decimal apenas.
- **Categorias variáveis por evento.** Cada evento define suas próprias categorias (ex.: técnica, postura, harmonia).
- **Sem pesos por categoria na v1.** Todas as categorias contribuem igualmente. Pesos podem ser adicionados em versão futura.

### 3.2 Sobre os jurados

- **Vínculo jurado-categoria via matriz.** A UI mostra jurados nas linhas e categorias nas colunas. O gestor marca quais categorias cada jurado avalia. Um jurado pode avaliar uma única categoria ou todas — é flexível.
- **Validações no cadastro:** categoria sem jurado bloqueia; jurado sem categoria bloqueia; categoria com menos de 3 jurados sob regra R2 dispara aviso (mas permite seguir).
- **Sem substituição durante o evento na v1.** Jurado cadastrado é jurado fixo até o fim.
- **Sem jurado-presidente na v1.** Todos os jurados têm o mesmo peso.

### 3.3 Sobre as notas

- **Campo de nota não vem preenchido.** A tela do jurado mostra apenas o aviso "nota mínima X, máxima Y". Sem default — evita viés de ancoragem.
- **Notas confirmadas são imutáveis.** Após o jurado clicar em "Confirmar e Finalizar", a nota não pode mais ser alterada. Antes disso (na tela de revisão), ele pode voltar e ajustar.
- **Participante ausente é desclassificado.** Não recebe zero, sai do ranking. Aparece em seção separada do relatório ("Desclassificados por ausência") para transparência.

### 3.4 Sobre o cálculo

Duas regras suportadas, escolhidas no cadastro do evento:

**R1 — Média de médias por jurado** (default e mais simples).
Para cada jurado, calcula-se a média aritmética das categorias que ele avaliou. Depois faz-se a média dessas médias. Funciona naturalmente quando jurados avaliam números diferentes de categorias.

**R2 — Média aparada por categoria** (descarta a maior e a menor nota).
Para cada categoria, descartam-se a maior e a menor nota dos jurados, e tira-se a média do que sobra. Em seguida, a nota final do participante é a média das médias-de-categoria. **Quando uma categoria tem menos de 3 jurados, R1 é aplicada nela como fallback** — o sistema avisa o gestor sobre essa mistura no momento do cadastro.

### 3.5 Sobre desempate

Cascata configurada por evento, aplicada em ordem:

1. Maior nota na **1ª categoria de desempate** (se marcada no cadastro)
2. Maior nota na **2ª categoria de desempate** (se marcada)
3. Sem mais critérios → **mantêm a mesma colocação** e o top-N expande na fronteira

### 3.6 Sobre relatórios

- **Saída sempre em PDF.** Sem visualização rica em tela; o relatório é o documento.
- **Três tipos:** top-N (N configurável por evento), classificação geral, e detalhado por jurado (com notas individuais).
- **Anonimato controlado:** o relatório por jurado é o único onde notas individuais aparecem; nos demais, só o resultado consolidado.
- **Rodapé padronizado:** identificação do evento, data e hora da geração. Espaço para assinaturas dos jurados quando necessário.
- **Auditoria obrigatória.** Toda nota e toda mudança de estado fica registrada de forma imutável para suporte a contestações.

### 3.7 Sobre certificados

- **Todos os participantes recebem certificado**, independentemente de classificação ou presença. O caso de uso real (eventos escolares com certificados impressos antes do evento) inviabiliza filtros por presença.
- **Geração em lote, em PDF único.** Uma página por participante, ordenadas alfabeticamente pelo nome.
- **Personalização por evento:** texto editável com placeholders (`{{participante}}`, `{{evento}}`, `{{data}}`, `{{local}}`, `{{organizador}}`), imagem de fundo (background), e até 3 assinaturas digitalizadas com nome e cargo.
- **Layout fixo, fonte fixa.** Reduz complexidade e garante consistência. Padrão A4 paisagem.

---

## 4. Decisões técnicas que afetam o produto

Detalhadas no `PROJECT_STANDARDS.md`. Aqui apenas o que afeta a experiência:

- **Tempo real via WebSocket.** A tela do jurado atualiza automaticamente quando o gestor ativa um participante — sem necessidade de refresh.
- **Conexão estável obrigatória.** O sistema é presencial e não funciona offline. Quedas de rede afetam a experiência.
- **Capacidade.** Até 10 jurados simultâneos por evento; 100+ participantes por evento.
- **Operação local recomendada.** Servidor rodando na mesma rede do evento elimina dependência de internet externa.

---

## 5. Fora do escopo da v1

Para evitar ambiguidade sobre o que está e o que não está dentro do escopo:

- ❌ Modo offline com sincronização posterior
- ❌ Pesos por categoria
- ❌ Jurado-presidente ou voto de minerva
- ❌ Substituição de jurado durante o evento
- ❌ Edição de notas após confirmação final
- ❌ Certificados diferenciados para premiados (top-N)
- ❌ QR code de verificação no certificado
- ❌ Layout configurável por drag-and-drop no certificado
- ❌ Relatórios em formatos além de PDF (Excel, HTML, etc.)
- ❌ Z-score, mediana, média aparada com N configurável e demais regras de cálculo avançadas
- ❌ Múltiplos idiomas
- ❌ Aplicativo mobile nativo (apenas navegador)

Esses itens podem entrar em versões futuras se houver demanda real.

---

## 6. Como ler esta documentação

| Documento | Quando consultar |
|---|---|
| **Esta Visão do Produto** | Para entender o "o quê" e o "porquê" do sistema |
| **Diagrama ER (`02-modelo-dominio.png`)** | Para entender as entidades e como se relacionam |
| **Diagrama de Estados (`03-maquina-estados.png`)** | Para entender o fluxo de julgamento de um participante |
| **`PROJECT_STANDARDS.md`** | Para entender como o código é organizado e quais regras seguir |
| **Prompts P00 a P19** | Para implementar cada parte do sistema, na ordem |
