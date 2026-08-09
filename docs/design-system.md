# NexLab — Design System

> Identidade visual do sistema NexLab (ERP do GRS Lab). Este arquivo é a fonte única de verdade sobre cor, tipografia, espaçamento e tom de voz. Qualquer tela nova deve reutilizar estes tokens — não criar cor/estilo "solto" no componente.

## 1. Posicionamento da marca

NexLab precisa parecer **profissional o suficiente para inspirar confiança financeira** (é onde o dono do GRS Lab vai acompanhar dinheiro a receber), mas **acolhedor e simples o suficiente para alguém que nunca usou um sistema**. Isso guia todas as escolhas abaixo:

- Paleta clínica (teal) transmite o universo odontológico/laboratorial sem parecer um sistema hospitalar frio.
- Um acento quente (âmbar) é usado com moderação só em ações principais — dá calor humano e guia o olho para "o que fazer agora".
- Nunca mais de 2 cores fortes na mesma tela além dos neutros. Poucas cores = menos carga cognitiva para o usuário leigo.
- Cantos arredondados (`rounded-xl`/`rounded-2xl`) e sombras suaves — nada de bordas ásperas ou visual "planilha".

## 2. Cor

### 2.1 Primária — `brand` (teal profissional)

Usada em: navegação ativa, links, ícones de destaque, gráficos primários do dashboard.

| Token | Hex | Uso |
|---|---|---|
| `brand-50` | `#EEFBFA` | fundo de destaque suave, hover sutil |
| `brand-100` | `#D3F3F1` | fundo de badge/chip |
| `brand-200` | `#A7E7E3` | bordas suaves |
| `brand-300` | `#71D3CE` | ícones secundários |
| `brand-400` | `#3FB8B3` | hover de elementos brand |
| `brand-500` | `#189A96` | **cor base da marca** |
| `brand-600` | `#0E7C79` | botão primário (padrão) |
| `brand-700` | `#0B6360` | botão primário hover/active |
| `brand-800` | `#0A4F4D` | texto sobre fundo claro em alto contraste |
| `brand-900` | `#0A403F` | títulos de alto impacto, sidebar escura |

### 2.2 Acento — `amber` (calor humano / ação)

Usado **só** para a ação mais importante da tela (ex.: botão "+ Nova Demanda", destaque de valor pendente em Contas a Receber). Nunca em navegação ou textos longos.

| Token | Hex | Uso |
|---|---|---|
| `amber-50` | `#FFF7EB` | fundo de alerta leve |
| `amber-100` | `#FFEBC7` | fundo de badge "pendente" |
| `amber-400` | `#F5A93F` | hover de acento |
| `amber-500` | `#EE9524` | **acento base** |
| `amber-600` | `#D97D0D` | acento hover/active |

### 2.3 Semânticas (status)

| Papel | Token | Hex | Uso |
|---|---|---|---|
| Sucesso / Em dia / Pago | `success-500` | `#1E9E6B` | badge verde no Kanban, "pago" em Contas a Receber |
| Sucesso fundo | `success-100` | `#DCF5E9` | fundo de badge |
| Atenção / Próximo do prazo | `warning-500` | `#E0A317` | badge amarelo no Kanban |
| Atenção fundo | `warning-100` | `#FCF0CE` | fundo de badge |
| Erro / Atrasado / Cancelado | `danger-500` | `#D64545` | badge vermelho, ações destrutivas |
| Erro fundo | `danger-100` | `#FBE1E1` | fundo de badge |
| Info | `info-500` | `#3B82C4` | mensagens neutras informativas |

### 2.4 Neutros

Usar a escala `slate` padrão do Tailwind para texto e fundos neutros (já vem embutida no Tailwind v4, não precisa redefinir):
- Fundo de página: `slate-50`
- Fundo de card: `white`
- Borda padrão: `slate-200`
- Texto secundário: `slate-500`
- Texto principal: `slate-800`
- Texto de título: `slate-900`

### 2.5 Regra de contraste

Todo texto sobre cor precisa atingir contraste mínimo AA (4.5:1 para texto normal, 3:1 para texto grande/ícone). Botão primário usa `brand-600` com texto branco (contraste ≈ 5.4:1 ✅). Botão de acento usa `amber-500` com texto **slate-900** (não branco — âmbar claro não tem contraste suficiente com branco).

## 3. Tipografia

**Família única:** [Inter](https://fonts.google.com/specimen/Inter) (variável, auto-hospedada via `@fontsource-variable/inter` — sem dependência de CDN externo, funciona offline e no GitHub Pages sem risco de bloqueio). Fallback: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`.

Uma família só, variando peso — evita inconsistência visual e é mais previsível para quem nunca usou um sistema.

| Estilo | Tamanho | Peso | Uso |
|---|---|---|---|
| Display | 30px / `text-3xl` | 700 | Título de página (ex.: "Demandas") |
| H1 | 24px / `text-2xl` | 600 | Título de seção/card grande |
| H2 | 20px / `text-xl` | 600 | Título de card/modal |
| H3 | 16px / `text-base` | 600 | Subtítulo, label de grupo |
| Body | 14px / `text-sm` | 400 | Texto padrão de UI (tabelas, formulários) |
| Body destaque | 14px / `text-sm` | 500 | Valores monetários, nomes em listas |
| Caption | 12px / `text-xs` | 400 | Legendas, timestamps, texto auxiliar |

Números monetários sempre com `font-variant-numeric: tabular-nums` (alinhamento em colunas de valores).

## 4. Espaçamento, raio e sombra

- Grid de espaçamento: múltiplos de 4px (padrão Tailwind, não alterar).
- Raio padrão de componentes: `rounded-xl` (12px). Cards de destaque/modais: `rounded-2xl` (16px). Badges/chips: `rounded-full`.
- Sombra: usar só `shadow-sm` (cards em repouso) e `shadow-md` (elementos flutuantes: modal, dropdown, card sendo arrastado no Kanban). Nunca sombras pesadas — mantém visual leve.
- Densidade: preferir espaçamento confortável (`p-4`/`p-6` em cards, `gap-3`/`gap-4` entre campos) — usuário leigo erra menos clique em alvos maiores.

## 5. Componentes (convenções)

- Base de componentes: primitivas [Radix UI](https://www.radix-ui.com/) sem estilo, estilizadas manualmente no padrão **shadcn/ui** (componentes vivem em `src/components/ui/`, código copiado no repo — não é dependência de runtime, dá controle total da identidade visual).
- **Botões**: `primary` (fundo `brand-600`, texto branco) para ação principal da tela; `accent` (fundo `amber-500`, texto `slate-900`) só para a ação mais importante de todas (ex.: "+ Nova Demanda"); `secondary` (borda `slate-200`, fundo branco) para ações alternativas; `ghost` (sem fundo) para ações terciárias; `destructive` (`danger-500`) para excluir/cancelar. Altura mínima de alvo de toque: 40px (`h-10`).
- **Badges de status** (Kanban/Contas a Receber): pílula (`rounded-full`) com fundo `-100` e texto `-700` da cor semântica correspondente (nunca cor sólida forte de fundo — mais legível, menos "gritante").
- **Cards**: fundo branco, borda `slate-200`, `rounded-xl`, `shadow-sm`, padding `p-4` ou `p-6`.
- **Inputs**: altura 40px, borda `slate-200`, foco com anel `brand-500` (`ring-2 ring-brand-500/40`), label sempre visível acima do campo (nunca só placeholder — usuário leigo perde o contexto quando o placeholder some ao digitar).
- **Ícones**: [lucide-react](https://lucide.dev/), `stroke-width={1.75}`, tamanho padrão 18–20px em UI densa, 24px em destaques.

## 6. Tom de voz da interface

- Idioma: português do Brasil, direto, sem jargão técnico ("Salvar" e não "Submit"; "Não encontramos nada com esse nome" e não "Nenhum resultado").
- Botões com verbo de ação claro: "Criar Demanda", "Marcar como Entregue", "Gerar Relatório" — nunca só "OK" ou "Enviar".
- Mensagens de erro sempre explicam o que fazer a seguir (ex.: "Escolha um cliente ou parceiro antes de salvar" em vez de "Campo obrigatório").
- Estados vazios (nenhuma demanda ainda, nenhum cliente cadastrado) sempre com uma frase amigável + botão de ação, nunca uma tela em branco.
- Confirmações de ações destrutivas (excluir cliente, cancelar demanda) sempre em modal explícito, nunca ação de um clique só.

## 7. Logo / wordmark (v1)

Ainda não há um designer dedicado ao projeto. Para a Fase 1, o "logo" é um **wordmark tipográfico**: texto "**Nex**Lab" em Inter 700, onde "Nex" usa `brand-600` e "Lab" usa `slate-800`, acompanhado (opcional) de um ícone simples de losango/hexágono estilizado em `brand-600` (representando "elo entre laboratórios"). Está implementado em `src/components/shared/Logo.tsx`. Quando houver um logo definitivo do GRS Lab/NexLab, substituir apenas esse componente — o resto do sistema não deve depender de um arquivo de imagem fixo.

## 8. Tokens no código

Os tokens de cor acima são declarados como variáveis CSS em `src/index.css` (bloco `@theme`, sintaxe Tailwind v4 "CSS-first config") e ficam disponíveis como classes utilitárias (`bg-brand-600`, `text-danger-500` etc.). Não redeclarar cores soltas (hex direto) em componentes — sempre usar a classe utilitária correspondente a um token desta tabela.
