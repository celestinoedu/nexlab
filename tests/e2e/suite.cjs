// Suíte E2E do NexLab — roda na conta de demonstração (nenhuma gravação real:
// a empresa demo mantém as alterações só no cache do navegador).
// Uso: npm run dev -- --port 5199  e, em outro terminal,  npm run test:e2e
//      BASE=http://localhost:4173/ npm run test:e2e   (contra `npm run preview`)
//      npm run test:e2e -- precos                       (um bloco só)
// Usa o Google Chrome instalado (channel: 'chrome'); ver tests/README.md.
const { chromium, devices } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:5199/'

const resultados = []
function ok(nome, cond, detalhe = '') {
  resultados.push({ nome, ok: Boolean(cond), detalhe })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${nome}${detalhe ? '  — ' + detalhe : ''}`)
}

async function novaPagina(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts })
  const page = await ctx.newPage()
  const dados = { tabelas: {}, servicos: [], entidades: [], erros: [] }
  page.on('pageerror', (e) => dados.erros.push(e.message))
  page.on('console', (m) => m.type() === 'error' && dados.erros.push('console: ' + m.text()))
  page.on('response', async (r) => {
    const u = r.url()
    try {
      if (u.includes('/rest/v1/tabela_precos')) {
        const id = new URL(u).searchParams.get('entidade_id')?.replace('eq.', '')
        dados.tabelas[id] = await r.json()
      } else if (u.includes('/rest/v1/servicos?')) dados.servicos = await r.json()
      else if (u.includes('/rest/v1/entidades?') && u.includes('ativo=eq.true')) dados.entidades = await r.json()
    } catch {}
  })
  await page.goto(BASE + '#/login')
  await page.fill('#email', 'teste@teste.com')
  await page.fill('#password', 'teste123')
  await page.click('button[type=submit]')
  await page.waitForURL(/#\/(?!login)/, { timeout: 30000 })
  await page.goto(BASE + '#/ordens-servico')
  for (let i = 0; i < 75 && !(dados.entidades.length && dados.servicos.length); i++) await page.waitForTimeout(200)
  // avisos de assinatura não fazem parte do teste
  await page.keyboard.press('Escape').catch(() => {})
  return { ctx, page, dados }
}

async function abrirNovaOS(page) {
  await page.getByRole('button', { name: 'Nova OS' }).first().click()
  const dlg = page.getByRole('dialog', { name: 'Nova Ordem de Serviço' })
  await dlg.waitFor()
  await page.waitForTimeout(300)
  return dlg
}

const foco = (page) =>
  page.evaluate(() => {
    const el = document.activeElement
    return { tag: el?.tagName, name: el?.getAttribute('name'), aria: el?.getAttribute('aria-label'), id: el?.id, ph: el?.getAttribute('placeholder'), texto: (el?.textContent || '').trim() }
  })

/** Botões de serviço de cada linha (o de entidade tem id e não entra). */
const servicoDaLinha = (dlg) => dlg.locator('button[role=combobox][aria-label="Selecione o serviço"]')
const totalLinhas = (dlg) => dlg.locator('input[name$=".cor"]').count()
const linhasVazias = (dlg) =>
  servicoDaLinha(dlg).evaluateAll((els) => els.filter((e) => e.textContent.trim() === 'Selecione o serviço').length)
const textoLinha = async (dlg, i) => (await servicoDaLinha(dlg).nth(i).textContent()).trim()
const valores = (dlg) =>
  dlg.locator('input[type=number]').evaluateAll((els) => Object.fromEntries(els.map((e) => [e.name, e.value])))

async function escolherEntidade(page, nome) {
  await page.locator('#entidade_id').click()
  await page.locator('[cmdk-item]').first().waitFor({ timeout: 15000 })
  await page.keyboard.type(nome)
  await page.waitForTimeout(150)
  await page.keyboard.press('Enter')
}

async function escolherServico(page, dlg, indice, nome) {
  await servicoDaLinha(dlg).nth(indice).click()
  await page.keyboard.type(nome)
  await page.waitForTimeout(150)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(150)
}

async function esperarTabela(page, dados, id) {
  for (let i = 0; i < 50 && !dados.tabelas[id]; i++) await page.waitForTimeout(200)
  await page.waitForTimeout(400)
  return dados.tabelas[id] || []
}

async function teclado(browser) {
  const { ctx, page, dados } = await novaPagina(browser)
  const dlg = await abrirNovaOS(page)
  const servico = dados.servicos[0]

  await dlg.getByRole('button', { name: /Informações financeiras/ }).focus()
  await page.keyboard.press('Tab')
  let f = await foco(page)
  ok('Tab chega no campo de serviço', f.aria === 'Selecione o serviço', JSON.stringify(f))

  await page.keyboard.type(servico.nome.slice(0, 6))
  await page.waitForTimeout(200)
  const busca = await page.locator('[cmdk-input]').inputValue().catch(() => null)
  ok('Digitar no campo de serviço abre a busca já filtrando', busca === servico.nome.slice(0, 6), `busca="${busca}"`)

  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)
  f = await foco(page)
  const escolhido = await textoLinha(dlg, 0)
  ok('Tab na busca escolhe o serviço destacado', escolhido === servico.nome, `linha="${escolhido}"`)
  ok('Tab na busca segue para o campo Cor', f.ph === 'Ex.: A2', JSON.stringify(f))

  await page.keyboard.press('Shift+Tab')
  f = await foco(page)
  ok('Shift+Tab volta para o serviço', f.tag === 'BUTTON' && f.texto === escolhido, JSON.stringify(f))

  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)
  await page.keyboard.press('Shift+Tab')
  await page.waitForTimeout(300)
  f = await foco(page)
  ok('Shift+Tab na busca volta ao campo anterior', /Informações financeiras/.test(f.texto), JSON.stringify(f))
  ok('Serviço mantido ao sair da busca sem digitar', (await textoLinha(dlg, 0)) === escolhido)

  await servicoDaLinha(dlg).first().focus()
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(200)
  ok('Seta para baixo abre a lista', (await page.locator('[cmdk-input]').count()) === 1)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  f = await foco(page)
  ok('Esc fecha só a lista e volta ao campo', (await dlg.isVisible()) && f.aria === 'Selecione o serviço', JSON.stringify(f))

  const parceiro = dados.entidades.find((e) => e.tipo === 'parceiro')
  await page.locator('#entidade_id').focus()
  await page.keyboard.type(parceiro.nome.slice(0, 5))
  await page.waitForTimeout(150)
  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)
  f = await foco(page)
  const textoEnt = (await page.locator('#entidade_id').textContent()).trim()
  ok('Entidade: digitar + Tab escolhe e segue para Nº OS', textoEnt.startsWith(parceiro.nome.slice(0, 5)) && f.id === 'numero_os_cliente', `${textoEnt} / ${JSON.stringify(f)}`)

  const btnAdd = dlg.getByRole('button', { name: 'Adicionar serviço' })
  await btnAdd.click()
  await page.waitForTimeout(200)
  f = await foco(page)
  ok('Adicionar serviço cria exatamente 1 linha', (await totalLinhas(dlg)) === 2, `linhas=${await totalLinhas(dlg)}`)
  ok('Foco vai para o serviço da linha nova (não pula para Cor)', f.aria === 'Selecione o serviço' && f.texto === 'Selecione o serviço', JSON.stringify(f))

  await btnAdd.dblclick()
  await page.waitForTimeout(200)
  ok('Duplo clique não cria linhas extras', (await totalLinhas(dlg)) === 2, `linhas=${await totalLinhas(dlg)}`)

  await btnAdd.focus()
  for (let i = 0; i < 5; i++) await page.keyboard.down('Enter')
  await page.keyboard.up('Enter')
  await page.waitForTimeout(200)
  ok('Enter segurado no botão não cria linhas extras', (await totalLinhas(dlg)) === 2, `linhas=${await totalLinhas(dlg)}`)

  for (let i = 0; i < 3; i++) await btnAdd.click()
  ok('Cliques repetidos não criam linhas extras', (await totalLinhas(dlg)) === 2, `linhas=${await totalLinhas(dlg)}`)

  // Enter num campo não deve salvar a OS sem querer
  await dlg.locator('#nome_paciente').fill('Paciente Teste')
  await dlg.locator('#nome_paciente').press('Enter')
  await page.waitForTimeout(500)
  f = await foco(page)
  ok('Enter no campo de texto não salva a OS', await dlg.isVisible())
  ok('Enter no campo de texto avança para o próximo campo', f.id === 'data_recebimento', JSON.stringify(f))

  // Tab percorre todos os campos de uma linha na ordem visual
  await servicoDaLinha(dlg).nth(1).focus()
  const ordem = []
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    const x = await foco(page)
    ordem.push(x.name || x.aria || x.id || x.texto)
  }
  ok('Ordem do Tab numa linha: serviço → remover → cor → arco → qtd → preço → comissão', ordem.join(',') === 'Remover serviço,itens.1.cor,itens.1.arco,itens.1.quantidade,itens.1.valor_unitario,itens.1.valor_comissao', ordem.join(','))

  ok('Sem erros de JS (teclado)', dados.erros.length === 0, dados.erros.slice(0, 3).join(' | '))
  await ctx.close()
}

async function precos(browser) {
  const { ctx, page, dados } = await novaPagina(browser)
  const parceiro = dados.entidades.find((e) => e.tipo === 'parceiro')
  const cliente = dados.entidades.find((e) => e.tipo === 'cliente')

  let dlg = await abrirNovaOS(page)
  await escolherEntidade(page, parceiro.nome)
  const tabela = await esperarTabela(page, dados, parceiro.id)
  const [l1, l2] = tabela.filter((t) => t.preco_parceiro != null && Number(t.preco_parceiro) !== Number(t.preco))
  const s1 = dados.servicos.find((s) => s.id === l1.servico_id)
  const s2 = dados.servicos.find((s) => s.id === l2.servico_id)

  await escolherServico(page, dlg, 0, s1.nome)
  await page.waitForTimeout(300)
  let v = await valores(dlg)
  ok('Parceiro: preço do parceiro vem da tabela', Number(v['itens.0.valor_unitario']) === Number(l1.preco_parceiro), `${v['itens.0.valor_unitario']} vs tabela ${l1.preco_parceiro} (catálogo ${s1.preco_padrao})`)
  ok('Parceiro: comissão vem da tabela', Number(v['itens.0.valor_comissao']) === Number(l1.preco), `${v['itens.0.valor_comissao']} vs ${l1.preco}`)
  const total = await dlg.getByText('Total da OS', { exact: true }).locator('xpath=../..').textContent()
  ok('Total da OS usa a comissão', total.replace(/\s/g, '').includes(Number(l1.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })), total)

  await dlg.locator('input[name="itens.0.valor_comissao"]').fill('99')
  await dlg.getByRole('button', { name: 'Adicionar serviço' }).click()
  await escolherServico(page, dlg, 1, s2.nome)
  await page.waitForTimeout(300)
  v = await valores(dlg)
  ok('Comissão ajustada à mão é mantida ao adicionar outro serviço', v['itens.0.valor_comissao'] === '99', `item0=${v['itens.0.valor_comissao']}`)
  ok('Segundo serviço do parceiro também vem da tabela', Number(v['itens.1.valor_unitario']) === Number(l2.preco_parceiro) && Number(v['itens.1.valor_comissao']) === Number(l2.preco), JSON.stringify(v))

  await escolherEntidade(page, cliente.nome)
  const tabCli = await esperarTabela(page, dados, cliente.id)
  v = await valores(dlg)
  const pc1 = tabCli.find((t) => t.servico_id === s1.id)?.preco ?? s1.preco_padrao
  ok('Trocar para Cliente recalcula pelo preço do cliente', Number(v['itens.0.valor_unitario']) === Number(pc1) && v['itens.0.valor_comissao'] === undefined, `${v['itens.0.valor_unitario']} vs ${pc1}`)

  await dlg.getByRole('button', { name: 'Adicionar serviço' }).click()
  ok('Linha em branco extra criada', (await linhasVazias(dlg)) === 1)
  await dlg.getByRole('button', { name: 'Salvar' }).click()
  await page.waitForTimeout(1200)
  ok('Salva ignorando a linha em branco', !(await dlg.isVisible()), (await page.getByRole('alert').allTextContents()).join(' | '))

  dlg = await abrirNovaOS(page)
  await escolherServico(page, dlg, 0, s1.nome)
  await page.waitForTimeout(200)
  v = await valores(dlg)
  ok('Sem entidade: usa preço padrão do catálogo', Number(v['itens.0.valor_unitario']) === Number(s1.preco_padrao), JSON.stringify(v))
  await escolherEntidade(page, parceiro.nome)
  await page.waitForTimeout(800)
  v = await valores(dlg)
  ok('Serviço antes do parceiro: aplica tabela do parceiro', Number(v['itens.0.valor_unitario']) === Number(l1.preco_parceiro) && Number(v['itens.0.valor_comissao']) === Number(l1.preco), JSON.stringify(v))
  await dlg.getByRole('button', { name: 'Cancelar' }).click()

  dlg = await abrirNovaOS(page)
  await escolherEntidade(page, parceiro.nome)
  await dlg.getByRole('button', { name: 'Salvar' }).click()
  await page.waitForTimeout(400)
  const alerta = (await dlg.getByRole('alert').allTextContents()).join(' ')
  ok('Salvar sem serviço avisa "Escolha um serviço"', /Escolha um serviço/.test(alerta), alerta)
  const f = await foco(page)
  ok('Erro leva o foco ao campo de serviço', f.aria === 'Selecione o serviço', JSON.stringify(f))
  await dlg.getByRole('button', { name: 'Cancelar' }).click()

  ok('Sem erros de JS (preços)', dados.erros.length === 0, dados.erros.slice(0, 3).join(' | '))
  await ctx.close()
}

async function salvamentoSeguido(browser) {
  const { ctx, page, dados } = await novaPagina(browser)
  const cliente = dados.entidades.find((e) => e.tipo === 'cliente')
  const parceiro = dados.entidades.find((e) => e.tipo === 'parceiro')
  for (const [rodada, entidade] of [[1, cliente], [2, parceiro], [3, cliente]]) {
    const dlg = await abrirNovaOS(page)
    const iniciais = await totalLinhas(dlg)
    ok(`Rodada ${rodada}: Nova OS abre com 1 linha`, iniciais === 1, `linhas=${iniciais}`)
    await escolherEntidade(page, entidade.nome)
    await page.waitForTimeout(600)
    await escolherServico(page, dlg, 0, dados.servicos[rodada].nome)
    for (let i = 1; i < 3; i++) {
      await dlg.getByRole('button', { name: 'Adicionar serviço' }).click()
      await page.waitForTimeout(150)
      const vazia = await servicoDaLinha(dlg).evaluateAll((els) => els.findIndex((e) => e.textContent.trim() === 'Selecione o serviço'))
      await escolherServico(page, dlg, vazia, dados.servicos[i + rodada].nome)
    }
    const n = await totalLinhas(dlg)
    ok(`Rodada ${rodada}: 3 serviços = 3 linhas (sem linhas fantasmas)`, n === 3, `linhas=${n}`)
    await dlg.getByRole('button', { name: 'Salvar' }).click()
    await page.waitForTimeout(1500)
    const alerta = (await page.getByRole('alert').allTextContents()).join(' | ')
    ok(`Rodada ${rodada}: OS salva sem erro`, !(await dlg.isVisible()), alerta)
    if (await dlg.isVisible()) await dlg.getByRole('button', { name: 'Cancelar' }).click()
  }
  ok('Sem erros de JS (salvamento)', dados.erros.length === 0, dados.erros.slice(0, 3).join(' | '))
  await ctx.close()
}

async function edicao(browser) {
  const { ctx, page, dados } = await novaPagina(browser)
  await page.locator('tbody tr').first().waitFor({ timeout: 30000 })
  // abre as 5 primeiras OS da lista: valores gravados não podem mudar ao abrir
  for (let i = 0; i < 5; i++) {
    await page.locator('tbody tr').nth(i).click()
    const dlg = page.getByRole('dialog', { name: /^Editar/ })
    if (!(await dlg.isVisible().catch(() => false))) {
      await page.waitForTimeout(500)
      if (!(await dlg.isVisible().catch(() => false))) continue
    }
    const titulo = (await dlg.getByRole('heading').first().textContent()).trim()
    await page.waitForTimeout(300)
    const antes = await valores(dlg)
    await page.waitForTimeout(2000)
    const depois = await valores(dlg)
    ok(`Edição (${titulo}): valores gravados não são reprecificados ao abrir`, JSON.stringify(antes) === JSON.stringify(depois), `${JSON.stringify(antes)} → ${JSON.stringify(depois)}`)
    if (i === 0) {
      await dlg.getByRole('button', { name: 'Salvar' }).click()
      await page.waitForTimeout(1500)
      ok(`Edição (${titulo}): salva sem alterações`, !(await dlg.isVisible()), (await page.getByRole('alert').allTextContents()).join(' | '))
    } else {
      await dlg.getByRole('button', { name: 'Cancelar' }).click()
      await page.waitForTimeout(300)
    }
  }
  const nova = await abrirNovaOS(page)
  ok('Nova OS depois de editar abre com 1 linha limpa', (await totalLinhas(nova)) === 1 && (await linhasVazias(nova)) === 1, `linhas=${await totalLinhas(nova)}`)
  await nova.getByRole('button', { name: 'Adicionar serviço' }).click()
  ok('Nova OS depois de editar: Adicionar serviço não revela linhas fantasmas', (await totalLinhas(nova)) === 1, `linhas=${await totalLinhas(nova)}`)
  ok('Sem erros de JS (edição)', dados.erros.length === 0, dados.erros.slice(0, 3).join(' | '))
  await ctx.close()
}

async function outrasTelas(browser) {
  const { ctx, page, dados } = await novaPagina(browser)
  const ent = dados.entidades[0]
  await page.goto(BASE + '#/financeiro')
  const filtro = page.getByRole('combobox', { name: 'Todos os clientes/parceiros' })
  await filtro.waitFor({ timeout: 20000 })
  await filtro.click()
  await page.locator('[cmdk-item]').first().waitFor({ timeout: 15000 })
  await page.keyboard.type(ent.nome.slice(0, 6))
  await page.waitForTimeout(150)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  ok('Contas a Receber: filtro por cliente/parceiro funciona', (await filtro.textContent()).trim() === ent.nome, (await filtro.textContent()).trim())

  // Pagamento em lote não paga contas que saíram da tela por um filtro (F13)
  await page.getByPlaceholder('Todos os clientes/parceiros').count()
  await page.reload()
  await page.getByLabel('Selecionar todas as abertas').waitFor({ timeout: 20000 })
  const abertasAntes = await page.locator('tbody tr', { hasText: 'Aberto' }).count()
  await page.getByLabel('Selecionar todas as abertas').check()
  const linhaVisivel = page.locator('tbody tr', { hasText: 'Aberto' }).first()
  const busca = (await linhaVisivel.locator('td').nth(1).textContent()).trim().split(/\s+/)[0]
  await page.getByPlaceholder('Buscar por cliente final, nº OS ou registro...').fill(busca)
  await page.waitForTimeout(300)
  const visiveis = await page.locator('tbody tr', { hasText: 'Aberto' }).count()
  const barra = await page.getByText(/conta[s]? selecionada/).textContent()
  ok('Contas: seleção em lote conta só as contas visíveis', barra.includes(`${visiveis} conta`), `${barra.trim()} | visíveis=${visiveis} de ${abertasAntes}`)
  await page.getByRole('button', { name: 'Marcar como pago' }).first().click()
  await page.getByRole('dialog', { name: 'Marcar como pago em massa' }).getByRole('button', { name: /^Marcar \d+ como paga/ }).click()
  await page.waitForTimeout(800)
  await page.getByPlaceholder('Buscar por cliente final, nº OS ou registro...').fill('')
  await page.waitForTimeout(300)
  const abertasDepois = await page.locator('tbody tr', { hasText: 'Aberto' }).count()
  ok('Contas: pagamento em lote preserva as contas escondidas pelo filtro', abertasDepois === abertasAntes - visiveis, `antes=${abertasAntes} pagas=${visiveis} depois=${abertasDepois}`)

  await page.goto(BASE + '#/relatorios/personalizados')
  const combos = page.locator('button[role=combobox]')
  await combos.first().waitFor({ timeout: 20000 })
  await combos.first().focus()
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  ok('Relatórios personalizados: escolher opção pelo teclado', (await page.locator('[cmdk-input]').count()) === 0)
  ok('Sem erros de JS (outras telas)', dados.erros.length === 0, dados.erros.slice(0, 3).join(' | '))
  await ctx.close()
}

async function despesas(browser) {
  const { ctx, page, dados } = await novaPagina(browser)
  await page.goto(BASE + '#/despesas')
  await page.getByRole('heading', { name: 'Despesas' }).waitFor()
  const mesInput = page.locator('input[type=month]')
  if (!(await mesInput.waitFor({ timeout: 5000 }).then(() => true).catch(() => false))) {
    console.log('SKIP  Despesas por mês: tela nova ainda não está nesta versão')
    await ctx.close()
    return
  }
  const agora = new Date()
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  ok('Despesas: abre no mês atual', (await mesInput.inputValue()) === mesAtual, await mesInput.inputValue())

  await mesInput.fill('')
  await page.waitForTimeout(300)
  ok('Despesas: limpar o mês não derruba a tela', await page.getByRole('heading', { name: 'Despesas' }).isVisible())

  // lança uma despesa fixa pendente no mês anterior
  await page.getByRole('button', { name: 'Mês anterior' }).click()
  const mesPassado = await mesInput.inputValue()
  ok('Despesas: navegar para o mês anterior', mesPassado < mesAtual, mesPassado)
  await page.getByRole('button', { name: 'Nova despesa' }).click()
  let dlg = page.getByRole('dialog', { name: 'Nova despesa' })
  await dlg.waitFor()
  ok('Despesas: nova despesa sugere data no mês aberto', (await dlg.locator('#data_despesa').inputValue()).startsWith(mesPassado))
  await dlg.locator('#descricao').fill('Aluguel E2E')
  await dlg.getByRole('radio', { name: 'Fixa' }).click()
  await dlg.getByRole('radio', { name: 'Pendente' }).click()
  ok('Despesas: pendente esconde "Pago em"', (await dlg.locator('#data_pagamento').count()) === 0)
  await dlg.locator('#valor').fill('1500')
  await dlg.getByRole('button', { name: 'Salvar' }).click()
  await page.waitForTimeout(800)
  ok('Despesas: salva despesa fixa pendente', !(await dlg.isVisible()))
  const linha = page.locator('tr', { hasText: 'Aluguel E2E' })
  ok('Despesas: aparece com categoria Fixa e status Pendente', (await linha.count()) === 1 && /Fixa/.test(await linha.textContent()) && /Pendente/.test(await linha.textContent()), await linha.textContent().catch(() => ''))

  // valor zero não é aceito
  await page.getByRole('button', { name: 'Nova despesa' }).click()
  dlg = page.getByRole('dialog', { name: 'Nova despesa' })
  await dlg.locator('#descricao').fill('Zero')
  await dlg.getByRole('button', { name: 'Salvar' }).click()
  await page.waitForTimeout(300)
  ok('Despesas: recusa valor zero com mensagem clara', /maior que zero/.test(await dlg.textContent()))
  await dlg.getByRole('button', { name: 'Cancelar' }).click()

  // no mês atual, oferece lançar as fixas do mês anterior
  await page.getByRole('button', { name: 'Próximo mês' }).click()
  const aviso = page.getByText(/despesas? fixas? de .* ainda não lançada/)
  ok('Despesas: avisa fixas do mês anterior ainda não lançadas', await aviso.isVisible().catch(() => false))
  await page.getByRole('button', { name: 'Lançar como pendentes' }).click()
  await page.waitForTimeout(800)
  const copia = page.locator('tr', { hasText: 'Aluguel E2E' })
  ok('Despesas: fixa repetida no mês atual como pendente', (await copia.count()) === 1 && /Pendente/.test(await copia.textContent()))
  ok('Despesas: aviso some depois de lançar (sem duplicar)', !(await aviso.isVisible().catch(() => false)))

  const lerTotal = async (rotulo) => {
    const t = await page.getByText(rotulo, { exact: true }).locator('xpath=../..').locator('strong').textContent()
    return Number(t.replace(/[^\d,]/g, '').replace(',', '.'))
  }
  const pendenteAntes = await lerTotal('A pagar')
  const pagoAntes = await lerTotal('Pago')
  await copia.getByRole('button', { name: /Pagar/ }).click()
  await page.waitForTimeout(800)
  ok('Despesas: "Pagar" marca como paga', /Pago/.test(await copia.textContent()))
  ok('Despesas: total "A pagar" diminui após pagar', (await lerTotal('A pagar')) === pendenteAntes - 1500, `${pendenteAntes} → ${await lerTotal('A pagar')}`)

  ok('Despesas: total "Pago" aumenta após pagar', (await lerTotal('Pago')) === pagoAntes + 1500, `${pagoAntes} → ${await lerTotal('Pago')}`)
  await page.getByRole('button', { name: 'Fixa', exact: true }).click()
  const linhas = await page.locator('tbody tr').allTextContents()
  ok('Despesas: filtro Fixa mostra só fixas', linhas.length > 0 && linhas.every((l) => /Fixa/.test(l)), `${linhas.length} linhas`)

  // Fechamento: mês vazio não derruba a tela (F16) e só conta pagas
  await page.goto(BASE + '#/fechamento')
  const mesFech = page.getByLabel('Mês do fechamento')
  await mesFech.waitFor()
  await mesFech.fill('')
  await page.waitForTimeout(400)
  ok('Fechamento: limpar o mês não derruba a tela (F16)', await page.getByRole('heading', { name: 'Fechamento Financeiro' }).isVisible())
  ok('Fechamento: rótulo "Despesas pagas no mês"', await page.getByText('Despesas pagas no mês', { exact: true }).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false))

  ok('Sem erros de JS (despesas)', dados.erros.length === 0, dados.erros.slice(0, 3).join(' | '))
  await ctx.close()
}

async function celular(browser) {
  const { ctx, page, dados } = await novaPagina(browser, { ...devices['Pixel 7'] })
  const dlg = await abrirNovaOS(page)
  const servico = dados.servicos[1]
  await servicoDaLinha(dlg).first().tap()
  await page.getByRole('dialog', { name: 'Selecione o serviço' }).waitFor()
  await page.locator('[cmdk-input]').fill(servico.nome)
  await page.getByRole('option', { name: servico.nome }).first().tap()
  await page.waitForTimeout(300)
  ok('Celular: escolher serviço por toque', (await textoLinha(dlg, 0)) === servico.nome, await textoLinha(dlg, 0))
  await dlg.getByRole('button', { name: 'Adicionar serviço' }).tap()
  await page.waitForTimeout(200)
  await dlg.getByRole('button', { name: 'Adicionar serviço' }).tap()
  await page.waitForTimeout(200)
  ok('Celular: toques repetidos criam só uma linha nova', (await totalLinhas(dlg)) === 2, `linhas=${await totalLinhas(dlg)}`)
  ok('Sem erros de JS (celular)', dados.erros.length === 0, dados.erros.slice(0, 3).join(' | '))
  await ctx.close()
}

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const filtro = process.argv[2]
  const blocos = { teclado, precos, salvamentoSeguido, edicao, outrasTelas, despesas, celular }
  for (const [nome, fn] of Object.entries(blocos)) {
    if (filtro && filtro !== nome) continue
    console.log(`\n== ${nome}`)
    try {
      await fn(browser)
    } catch (e) {
      ok(`${nome}: executou até o fim`, false, e.message.split('\n')[0])
    }
  }
  await browser.close()
  const falhas = resultados.filter((r) => !r.ok)
  console.log(`\n${resultados.length - falhas.length}/${resultados.length} passaram`)
  process.exit(falhas.length ? 1 : 0)
})()
