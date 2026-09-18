/**
 * Conteúdo da Central de Ajuda do NWB Asset.
 *
 * Cada tópico é um procedimento: para que serve, a tela (captura em
 * /public/ajuda, extraída do próprio sistema), o passo a passo — onde clicar,
 * o que fazer e por quê — e dicas. Os nomes de menus, botões, etapas e campos
 * são os mesmos da tela; quando uma tela mudar, este arquivo precisa
 * acompanhar. `open` leva a pessoa direto para a tela do procedimento.
 */

export type AjudaPasso = {
  onde: string;
  acao: string;
  porque?: string;
};

export type AjudaTopico = {
  id: string;
  titulo: string;
  objetivo: string;
  imagem?: string;
  imagemLegenda?: string;
  open?: { href: string; label: string };
  requer?: string;
  passos: AjudaPasso[];
  dicas?: string[];
  palavras?: string[];
};

export type AjudaSecao = {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  topicos: AjudaTopico[];
};


export const AJUDA_SECOES: AjudaSecao[] = [
  {
    id: 'primeiros-passos',
    titulo: 'Primeiros passos',
    descricao: 'Entrar no sistema, escolher a empresa e entender o painel.',
    icone: 'home',
    topicos: [
      {
        id: 'entrar',
        titulo: 'Como entrar no sistema',
        objetivo: 'Acessar o NWB Asset com o seu e-mail e senha. O sistema identifica automaticamente a empresa vinculada ao seu acesso.',
        imagem: '/ajuda/login.jpg',
        open: { href: '/login', label: 'Abrir a tela de login' },
        passos: [
          { onde: 'Tela de login › Entrar com NWB ID', acao: 'Clique em Entrar com NWB ID e use a sua conta NWB ID (o mesmo e-mail e senha dos outros sistemas da NWB). Quem pode abrir o NWB Asset é definido no NWB Acessos.', porque: 'Uma conta só para todos os sistemas: sair do NWB Asset também encerra a sessão no NWB ID.' },
          { onde: 'Tela de login › e-mail e senha', acao: 'Quando o login por senha estiver habilitado, informe o e-mail cadastrado e a senha e clique em Entrar.', porque: 'Cada usuário tem um perfil (Super admin, Admin da empresa, Gestor patrimonial, Auditor ou Operador de inventário) que define o que ele pode ver e fazer.' },
          { onde: 'Após entrar', acao: 'Se o seu usuário tiver acesso a mais de uma empresa, escolha a empresa na tela seguinte. Caso contrário, o Painel de Controle abre direto.', porque: 'Todos os módulos trabalham no contexto da empresa ativa, mostrada no canto superior direito.' },
        ],
        dicas: [
          'Errou a senha 5 vezes em um minuto? Aguarde um minuto antes de tentar de novo — é uma proteção contra tentativas automáticas.',
          'Para sair, clique no seu avatar (círculo com a inicial do nome) no canto superior direito e escolha Sair.',
        ],
        palavras: ['login', 'senha', 'acesso', 'entrar', 'sair', 'logout', 'nwb id', 'nwbid', 'keycloak', 'acessos', 'crachá'],
      },
      {
        id: 'termo-lgpd',
        titulo: 'Termo de Responsabilidade e LGPD (primeiro acesso)',
        objetivo: 'Entender o aceite obrigatório do Termo de Responsabilidade de Uso da Ferramenta e Proteção de Dados, e onde consultá-lo depois.',
        imagem: '/ajuda/termo.jpg',
        open: { href: '/perfil', label: 'Abrir meu Perfil' },
        passos: [
          { onde: 'Primeiro acesso', acao: 'Logo após o login, o sistema mostra o Termo. Role o documento até o fim, marque "Li e aceito o Termo" e clique em Aceitar e entrar no sistema.', porque: 'Sem o aceite o sistema não pode ser usado: a navegação volta para o termo e a API recusa qualquer operação.' },
          { onde: 'Registro do aceite', acao: 'O aceite fica gravado com o seu nome, e-mail, data, hora, endereço IP e a versão do texto aceito. Se você não concordar, use "Não aceito · sair".' },
          { onde: 'Avatar › Perfil › Termo de Responsabilidade e LGPD', acao: 'No seu perfil o termo fica disponível com o carimbo do aceite (nome, data e hora). Clique em Abrir termo para ler no visualizador e em Imprimir / salvar PDF se precisar de uma cópia.' },
          { onde: 'Nova versão', acao: 'Quando o termo for atualizado, o sistema pede um novo aceite no próximo acesso; os aceites anteriores continuam guardados.' },
        ],
        palavras: ['termo', 'lgpd', 'aceite', 'responsabilidade', 'privacidade', 'dados pessoais', 'carimbo'],
      },
      {
        id: 'trocar-empresa',
        titulo: 'Como trocar a empresa ativa',
        objetivo: 'Alternar entre as empresas às quais você tem acesso, ou abrir o Painel geral (visão consolidada, para Super admin).',
        imagem: '/ajuda/painel.jpg',
        imagemLegenda: 'O seletor "Selecione uma empresa" fica no centro da barra superior.',
        requer: 'Acesso a mais de uma empresa ou perfil Super admin.',
        passos: [
          { onde: 'Barra superior › Selecione uma empresa', acao: 'Abra a lista e escolha a empresa. O sistema recarrega o Painel de Controle já no novo contexto.', porque: 'Bens, inventários, relatórios e usuários são sempre da empresa ativa.' },
          { onde: 'No celular', acao: 'Toque em Menu na barra inferior: o seletor de empresa aparece no topo do menu.' },
        ],
        dicas: ['Super admin pode escolher Painel geral para ver indicadores consolidados de todas as empresas.'],
        palavras: ['empresa ativa', 'multiempresa', 'painel geral', 'trocar'],
      },
      {
        id: 'painel',
        titulo: 'Entendendo o Painel de Controle',
        objetivo: 'Ler os indicadores da empresa ativa e chegar rápido aos módulos.',
        imagem: '/ajuda/painel.jpg',
        open: { href: '/dashboard/patrimonio', label: 'Abrir o Painel de Controle' },
        passos: [
          { onde: 'Indicadores (cartões do topo)', acao: 'Veja Bens patrimoniais, Valor patrimonial, Bens depreciados, Sem plaqueta, Inventários abertos e Divergências. Cada cartão é clicável e leva ao módulo correspondente.', porque: 'A cor do texto abaixo do número indica o estado: verde em dia, âmbar atenção, vermelho pendência.' },
          { onde: 'Evolução do patrimônio', acao: 'Acompanhe o valor acumulado mês a mês, calculado pela data de aquisição dos bens.' },
          { onde: 'Saúde do patrimônio', acao: 'Três barras resumem Identificação (bens com plaqueta), Depreciação (bens com cálculo) e Conciliação (divergências em aberto).' },
          { onde: 'Bens por local / por departamento', acao: 'Gráficos de onde o patrimônio está alocado.' },
          { onde: 'Atalhos', acao: 'Use os cartões de atalho para ir direto a Bens, Plaquetas, Inventários, Transferências, Depreciações e Relatório BI.' },
        ],
        palavras: ['dashboard', 'indicadores', 'kpi', 'gráfico', 'início'],
      },
      {
        id: 'personalizar-painel',
        titulo: 'Como personalizar o painel',
        objetivo: 'Escolher quais seções aparecem no Painel de Controle. A escolha fica salva no seu navegador.',
        imagem: '/ajuda/painel-personalizar.jpg',
        open: { href: '/dashboard/patrimonio', label: 'Abrir o Painel de Controle' },
        passos: [
          { onde: 'Painel de Controle › botão Personalizar', acao: 'Clique em Personalizar, no canto superior direito do painel.' },
          { onde: 'Lista Seções do painel', acao: 'Marque ou desmarque Indicadores, Evolução do patrimônio, Saúde do patrimônio, Distribuição, Estrutura organizacional, Atalhos e Exportações.', porque: 'A mudança é imediata e vale só para o seu navegador — outros usuários não são afetados.' },
          { onde: 'Restaurar padrão', acao: 'Para voltar à configuração original, clique em Restaurar padrão no rodapé da lista.' },
        ],
        palavras: ['personalizar', 'seções', 'ocultar', 'exibir'],
      },
      {
        id: 'celular',
        titulo: 'Usando no celular (app)',
        objetivo: 'Navegar pela barra inferior e instalar o NWB Asset como aplicativo.',
        imagem: '/ajuda/mobile-menu.jpg',
        imagemLegenda: 'Barra inferior com Ativos, Inventário, Painel, Movimentações e Menu.',
        passos: [
          { onde: 'Barra inferior', acao: 'Toque em Ativos, Inventário ou Movimentações para abrir os módulos do grupo; o botão central Painel volta ao Painel de Controle.' },
          { onde: 'Menu', acao: 'Toque em Menu (ou no botão ☰ do topo) para ver todos os módulos, trocar de empresa, abrir o Perfil ou Sair.' },
          { onde: 'Instalar como app', acao: 'No Chrome (Android) use "Adicionar à tela inicial"; no Safari (iPhone) use Compartilhar › "Adicionar à Tela de Início".', porque: 'O sistema abre em tela cheia, como um aplicativo, sem a barra do navegador.' },
        ],
        palavras: ['mobile', 'celular', 'pwa', 'app', 'instalar', 'barra inferior'],
      },
    ],
  },
  {
    id: 'corporativo',
    titulo: 'Corporativo',
    descricao: 'A estrutura organizacional: empresa, filiais, unidades, departamentos e locais.',
    icone: 'building',
    topicos: [
      {
        id: 'estrutura',
        titulo: 'Como funciona a estrutura organizacional',
        objetivo: 'Entender a hierarquia que todo bem precisa ter: Empresa › Filial › Unidade administrativa › Departamento › Local.',
        imagem: '/ajuda/locais.jpg',
        passos: [
          { onde: 'Ordem de cadastro', acao: 'Cadastre nesta ordem: Filiais, depois Unidades Administrativas, depois Departamentos e por fim Locais.', porque: 'Cada nível depende do anterior: um Local pertence a um Departamento, que pertence a uma Unidade, que pertence a uma Filial.' },
          { onde: 'No cadastro do bem', acao: 'A etapa Estrutura do bem pede exatamente essa cadeia (Filial, Unidade administrativa, Departamento, Local) e só libera o próximo campo quando o anterior é escolhido.' },
        ],
        dicas: ['Uma empresa pequena pode ter uma única Filial (matriz), uma Unidade e um Departamento — mas eles precisam existir para o bem ser cadastrado.'],
        palavras: ['hierarquia', 'organização', 'matriz'],
      },
      {
        id: 'empresas',
        titulo: 'Como cadastrar uma empresa',
        objetivo: 'Criar uma nova empresa no ambiente multiempresa, com CNPJ, contato e logo.',
        imagem: '/ajuda/empresas.jpg',
        open: { href: '/dashboard/modulos/empresas', label: 'Abrir Empresas' },
        requer: 'Perfil Super admin ou contexto da empresa master. Para os demais usuários o menu Empresas não aparece.',
        passos: [
          { onde: 'Menu Corporativo › Empresas', acao: 'Abra o módulo e clique em Nova empresa.' },
          { onde: 'Formulário', acao: 'Informe razão social, nome fantasia, CNPJ, e-mail, telefone e endereço. Se quiser, envie o Logo.', porque: 'O logo aparece na barra superior, no perfil e nas etiquetas patrimoniais.' },
          { onde: 'Cadastrar empresa', acao: 'Clique em Cadastrar empresa. A empresa passa a aparecer no seletor do topo para quem tiver acesso a ela.' },
        ],
        palavras: ['cnpj', 'razão social', 'nome fantasia', 'logo'],
      },
      {
        id: 'filiais',
        titulo: 'Como cadastrar uma filial',
        objetivo: 'Registrar a matriz e as filiais da empresa ativa.',
        imagem: '/ajuda/filiais-nova.jpg',
        open: { href: '/dashboard/modulos/filiais', label: 'Abrir Filiais' },
        passos: [
          { onde: 'Menu Corporativo › Filiais', acao: 'Clique em Nova filial.' },
          { onde: 'Dados do cadastro', acao: 'Preencha Nome da filial, CNPJ e endereço (CEP, número, complemento, bairro, cidade, estado). O Código do cadastro é gerado automaticamente ao salvar.', porque: 'A filial matriz representa a unidade principal; as demais são unidades adicionais.' },
          { onde: 'Cadastrar filial', acao: 'Clique em Cadastrar filial. Para editar depois, use o ícone de lápis na linha da tabela.' },
        ],
        palavras: ['matriz', 'filial', 'unidade'],
      },
      {
        id: 'unidades',
        titulo: 'Como cadastrar unidades administrativas',
        objetivo: 'Criar a estrutura administrativa vinculada a cada filial.',
        imagem: '/ajuda/unidades.jpg',
        open: { href: '/dashboard/modulos/unidades-administrativas', label: 'Abrir Unidades Administrativas' },
        passos: [
          { onde: 'Menu Corporativo › Unidades Administrativas', acao: 'Clique em Nova unidade, escolha a Filial e informe o nome.' },
          { onde: 'Salvar', acao: 'Confirme. A unidade fica disponível para receber Departamentos.' },
        ],
        palavras: ['unidade administrativa'],
      },
      {
        id: 'departamentos',
        titulo: 'Como cadastrar departamentos',
        objetivo: 'Criar os departamentos de cada unidade administrativa.',
        imagem: '/ajuda/departamentos.jpg',
        open: { href: '/dashboard/modulos/departamentos', label: 'Abrir Departamentos' },
        passos: [
          { onde: 'Menu Corporativo › Departamentos', acao: 'Clique em Novo departamento, escolha Filial e Unidade administrativa e informe o nome.' },
          { onde: 'Salvar', acao: 'Confirme. O departamento aparece no gráfico Bens por departamento do painel assim que receber bens.' },
        ],
        palavras: ['departamento', 'setor'],
      },
      {
        id: 'locais',
        titulo: 'Como cadastrar locais',
        objetivo: 'Registrar os locais físicos (salas, almoxarifado, pátio) onde os bens ficam.',
        imagem: '/ajuda/locais.jpg',
        open: { href: '/dashboard/modulos/locais', label: 'Abrir Locais' },
        passos: [
          { onde: 'Menu Corporativo › Locais', acao: 'Clique em Novo local, escolha Filial, Unidade administrativa e Departamento e informe o nome do local.' },
          { onde: 'Salvar', acao: 'Confirme. O local passa a aparecer na etapa Estrutura do cadastro de bens e no relatório Bens por local.' },
        ],
        dicas: ['Seja específico no nome (ex.: "Sala de TI - 2º andar"): é o que o operador vê no inventário.'],
        palavras: ['local', 'sala', 'localização'],
      },
    ],
  },
  {
    id: 'ativos',
    titulo: 'Ativos',
    descricao: 'Cadastro de bens, catálogo de tipos e identificação por plaqueta / QR Code.',
    icone: 'cube',
    topicos: [
      {
        id: 'tipos-bens',
        titulo: 'Como cadastrar tipos de bem e tipos de produto',
        objetivo: 'Montar o catálogo usado na classificação dos bens (ex.: Informática › Notebook).',
        imagem: '/ajuda/tipos-produtos.jpg',
        open: { href: '/dashboard/modulos/tipos-bens', label: 'Abrir Tipos de Bem' },
        passos: [
          { onde: 'Menu Ativos › Tipos de Bem Patrimonial', acao: 'Clique em Novo tipo de bem e informe o Nome do tipo de bem (ex.: Equipamentos, Informática, Mobiliário, Utensílios, Veículos, Imóveis).', porque: 'O tipo define a regra padrão de depreciação e quais campos técnicos o bem terá.' },
          { onde: 'Menu Ativos › Tipos de Produto', acao: 'Clique em Novo produto, escolha o Tipo do bem e informe o Nome do produto (ex.: Notebook, Cadeira, Projetor). Use o filtro "Tipo do bem: todos" para navegar pelo catálogo.' },
        ],
        palavras: ['catálogo', 'categoria', 'tipo', 'produto', 'subtipo'],
      },
      {
        id: 'bens-cadastrar',
        titulo: 'Como cadastrar um bem patrimonial',
        objetivo: 'Registrar um novo bem com estrutura, identificação, valores e anexos, em quatro etapas.',
        imagem: '/ajuda/bens-novo.jpg',
        imagemLegenda: 'O assistente Novo bem mostra a Timeline do cadastro com as quatro etapas.',
        open: { href: '/dashboard/modulos/bens', label: 'Abrir Bens Patrimoniais' },
        requer: 'Filial, Unidade administrativa, Departamento e Local já cadastrados.',
        passos: [
          { onde: 'Menu Ativos › Bens Patrimoniais', acao: 'Clique em Novo bem.' },
          { onde: 'Etapa 1 · Estrutura', acao: 'Escolha Filial, Unidade administrativa, Departamento, Local e Responsável. Clique em Continuar.', porque: 'Cada campo só libera depois do anterior, para o bem sempre ter uma localização válida.' },
          { onde: 'Etapa 2 · Identificação', acao: 'Escolha o Tipo do bem; depois aparecem os campos do tipo (Produto, Marca, Modelo, Número de Série / Tag Service, e campos técnicos como Processador, Placa do veículo, Material...). Preencha a Descrição e, se a plaqueta já existir, o Número da Plaqueta.' },
          { onde: 'Etapa 3 · Valores e status', acao: 'Informe Data de aquisição, Valor de aquisição, Status do bem e Estado de conservação. Valor residual e Vida útil são calculados automaticamente pela regra de depreciação do tipo.' },
          { onde: 'Etapa 4 · Anexos', acao: 'Envie fotos do bem e o documento fiscal (NF-e, DANFE, XML, Orçamento ou Garantia). Clique em Salvar.' },
        ],
        dicas: [
          'O sistema guarda um rascunho local do cadastro: se fechar sem salvar, ao abrir Novo bem de novo ele pergunta se quer continuar de onde parou.',
          'O Tombo (numeração patrimonial) é gerado automaticamente ao salvar.',
        ],
        palavras: ['bem', 'ativo', 'cadastro', 'tombo', 'nota fiscal', 'foto', 'anexo', 'marca', 'modelo'],
      },
      {
        id: 'bens-consultar',
        titulo: 'Como consultar, editar ou excluir um bem',
        objetivo: 'Localizar um bem na lista e manter o cadastro atualizado.',
        imagem: '/ajuda/bens.jpg',
        open: { href: '/dashboard/modulos/bens', label: 'Abrir Bens Patrimoniais' },
        passos: [
          { onde: 'Lista de bens', acao: 'Cada linha mostra foto, descrição, tombo, estrutura, local/responsável, valores e status. Use Atualizar para recarregar.' },
          { onde: 'Coluna Ações', acao: 'Clique no olho para ver a ficha completa, no lápis para editar e na lixeira para excluir.', porque: 'A exclusão pede confirmação; para retirar um bem do patrimônio de forma auditável, prefira registrar uma Baixa Patrimonial.' },
          { onde: 'Edição', acao: 'A edição abre o mesmo assistente em quatro etapas; a Timeline do cadastro mostra em que etapa você está.' },
        ],
        palavras: ['editar', 'excluir', 'ficha', 'consulta'],
      },
      {
        id: 'plaquetas',
        titulo: 'Como cadastrar e vincular plaquetas (etiquetas)',
        objetivo: 'Registrar as etiquetas já impressas pela gráfica e vincular cada código de barras ao bem correto.',
        imagem: '/ajuda/plaquetas-nova.jpg',
        open: { href: '/dashboard/modulos/plaquetas', label: 'Abrir Plaquetas / QR Code' },
        passos: [
          { onde: 'Menu Ativos › Plaquetas / QR Code', acao: 'Clique em Nova etiqueta para cadastrar uma unidade: informe o Número da plaqueta e o Código de barras impresso e clique em Cadastrar etiqueta.' },
          { onde: 'Importar planilha', acao: 'Para lotes, clique em Importar planilha e envie um arquivo .csv, .txt ou .xlsx com as colunas numero_plaqueta e codigo_barras (também aceita numero, plaqueta, codigo_barras_conteudo, barcode, codigo e observacoes).', porque: 'É o caminho para cadastrar de uma vez todas as etiquetas de uma remessa da gráfica.' },
          { onde: 'Plaquetas cadastradas › Vincular ao bem', acao: 'Na linha da etiqueta, clique em Vincular ao bem e escolha o bem. O status muda de Em estoque para Vinculada; quando a etiqueta física for colada, marque como Aplicada.' },
          { onde: 'Modelo da etiqueta', acao: 'O bloco Modelo da etiqueta patrimonial mostra como a plaqueta fica (logo, "Patrimônio", código de barras e número).' },
        ],
        dicas: ['Ao ler o código de barras ou QR pelo celular, abre-se a consulta pública do bem — útil no inventário em campo.'],
        palavras: ['etiqueta', 'plaqueta', 'qr code', 'código de barras', 'importar', 'planilha', 'vincular'],
      },
      {
        id: 'etiqueta-imprimir',
        titulo: 'Como visualizar e imprimir a etiqueta de um bem',
        objetivo: 'Abrir a etiqueta patrimonial de uma plaqueta vinculada, pronta para impressão.',
        imagem: '/ajuda/plaquetas.jpg',
        open: { href: '/dashboard/modulos/plaquetas', label: 'Abrir Plaquetas / QR Code' },
        passos: [
          { onde: 'Plaquetas cadastradas', acao: 'Na linha da plaqueta, clique no ícone de etiqueta/impressão. Abre a página Etiqueta patrimonial com empresa, tombo, código de barras e leitura.' },
          { onde: 'Página da etiqueta', acao: 'Use o botão de imprimir (ou Ctrl+P). A página já vem formatada para impressão, sem menus.' },
        ],
        palavras: ['imprimir', 'etiqueta', 'impressão'],
      },
    ],
  },
  {
    id: 'inventario',
    titulo: 'Inventário',
    descricao: 'Planejar a contagem, tratar divergências e conciliar o patrimônio.',
    icone: 'clipboard',
    topicos: [
      {
        id: 'inventario-fluxo',
        titulo: 'Fluxo completo de um inventário',
        objetivo: 'Entender as etapas: abrir o inventário, contar em campo, registrar divergências, conciliar e auditar.',
        imagem: '/ajuda/inventarios.jpg',
        passos: [
          { onde: '1. Inventários', acao: 'Crie o inventário (nome, filial, período). Status inicial: Aberto.' },
          { onde: '2. Contagem', acao: 'Em campo, leia a plaqueta de cada bem (QR/código de barras) ou confira pela lista. O status do inventário passa a Em andamento.' },
          { onde: '3. Divergências', acao: 'Registre o que não bateu: bem Não encontrado, Sem tombo, em Local diferente ou com Responsável diferente.' },
          { onde: '4. Conciliações', acao: 'Feche a contagem registrando a conciliação: total de bens encontrados e divergências.' },
          { onde: '5. Auditorias', acao: 'Registre a auditoria (data, auditor, observações) e finalize o inventário (status Finalizado).' },
        ],
        dicas: ['O Painel de Controle e o Relatório BI mostram a cobertura (itens encontrados ÷ itens previstos) e a taxa de divergência de cada inventário.'],
        palavras: ['contagem', 'inventário', 'fluxo', 'processo'],
      },
      {
        id: 'inventario-criar',
        titulo: 'Como abrir um inventário',
        objetivo: 'Planejar uma nova contagem patrimonial.',
        imagem: '/ajuda/inventarios-novo.jpg',
        open: { href: '/dashboard/modulos/inventarios', label: 'Abrir Inventários' },
        passos: [
          { onde: 'Menu Inventário › Inventários', acao: 'Clique em Novo inventário.' },
          { onde: 'Formulário', acao: 'Informe Filial, Nome do inventário, Data de início, Data de fim (opcional) e Status (Aberto, Em andamento ou Finalizado). Salve.' },
          { onde: 'Lista', acao: 'A tabela mostra Inventário, Filial, Período e Status. Edite pelo lápis conforme a contagem avança.' },
        ],
        palavras: ['novo inventário', 'abrir', 'período'],
      },
      {
        id: 'divergencias',
        titulo: 'Como registrar divergências',
        objetivo: 'Apontar diferenças entre o sistema e a contagem física.',
        imagem: '/ajuda/divergencias.jpg',
        open: { href: '/dashboard/modulos/divergencias', label: 'Abrir Divergências' },
        passos: [
          { onde: 'Menu Inventário › Divergências', acao: 'Clique em Nova divergência.' },
          { onde: 'Formulário', acao: 'Escolha o Inventário e o Bem patrimonial, o Tipo de divergência (Não encontrado, Sem tombo, Local diferente, Responsável diferente) e descreva o que foi observado. Salve.' },
          { onde: 'Tratamento', acao: 'Corrija a causa no módulo correspondente (Transferências para local errado, Responsáveis para custódia errada, Baixas para bens que não existem mais).', porque: 'O Relatório BI destaca em vermelho quando a taxa de divergência passa de 10% dos itens inventariados.' },
        ],
        palavras: ['divergência', 'não encontrado', 'sem tombo'],
      },
      {
        id: 'conciliacoes',
        titulo: 'Como conciliar e auditar um inventário',
        objetivo: 'Fechar a contagem e registrar a auditoria.',
        imagem: '/ajuda/conciliacoes.jpg',
        open: { href: '/dashboard/modulos/conciliacoes', label: 'Abrir Conciliações' },
        passos: [
          { onde: 'Menu Inventário › Conciliações', acao: 'Clique em Nova conciliação, escolha o Inventário, informe a Data da conciliação e os totais. Salve.' },
          { onde: 'Menu Administração › Auditorias', acao: 'Clique em Nova auditoria, escolha o Inventário, informe Data da auditoria, Auditor e Observações. Salve.' },
          { onde: 'Inventários', acao: 'Edite o inventário e mude o Status para Finalizado.' },
        ],
        palavras: ['conciliação', 'auditoria', 'finalizar'],
      },
    ],
  },
  {
    id: 'movimentacoes',
    titulo: 'Movimentações',
    descricao: 'Responsáveis, transferências, baixas e histórico de localização.',
    icone: 'swap',
    topicos: [
      {
        id: 'responsaveis',
        titulo: 'Como cadastrar responsáveis e atribuir bens',
        objetivo: 'Registrar as pessoas que respondem pelos bens e o histórico de responsabilidade.',
        imagem: '/ajuda/responsaveis-novo.jpg',
        open: { href: '/dashboard/modulos/responsaveis', label: 'Abrir Responsáveis' },
        passos: [
          { onde: 'Menu Movimentações › Responsáveis', acao: 'Na aba Responsáveis, clique em Novo responsável e informe nome, matrícula, filial, departamento, contato e status. Salve.' },
          { onde: 'Aba Responsabilidade de bens', acao: 'Clique em Nova responsabilidade, escolha o Bem patrimonial, o Responsável e a Data de início. A Data de fim é preenchida quando a custódia termina.', porque: 'É esse histórico que sustenta o termo de responsabilidade e o relatório Bens por responsável.' },
        ],
        dicas: ['O Relatório BI alerta quando uma única pessoa responde por 60% ou mais do valor patrimonial.'],
        palavras: ['responsável', 'custódia', 'termo de responsabilidade', 'matrícula'],
      },
      {
        id: 'transferencias',
        titulo: 'Como transferir um bem de local',
        objetivo: 'Movimentar um bem entre unidades, departamentos e locais, com registro de origem e destino.',
        imagem: '/ajuda/transferencias-nova.jpg',
        open: { href: '/dashboard/modulos/transferencias-bens', label: 'Abrir Transferências' },
        passos: [
          { onde: 'Menu Movimentações › Transferências', acao: 'Clique em Nova transferência.' },
          { onde: 'Origem', acao: 'Escolha a Filial e o Bem patrimonial: Origem unidade, Origem departamento, Origem local e Responsável de origem são preenchidos com a situação atual.' },
          { onde: 'Destino', acao: 'Escolha Destino unidade, Destino departamento, Destino local e, se mudar a custódia, o Responsável de destino. Marque Atualizar responsável do bem para aplicar a mudança na ficha.' },
          { onde: 'Confirmação', acao: 'Informe Data da transferência, Motivo e Observações e salve. O Histórico de Localização do bem recebe um registro automaticamente.' },
        ],
        palavras: ['transferência', 'mover', 'origem', 'destino', 'realocar'],
      },
      {
        id: 'baixas',
        titulo: 'Como dar baixa em um bem',
        objetivo: 'Retirar formalmente um bem do patrimônio (venda, doação, perda, obsolescência), mantendo o registro auditável.',
        imagem: '/ajuda/baixas-nova.jpg',
        open: { href: '/dashboard/modulos/baixas-bens', label: 'Abrir Baixas Patrimoniais' },
        passos: [
          { onde: 'Menu Movimentações › Baixas Patrimoniais', acao: 'Clique em Nova baixa.' },
          { onde: 'Formulário', acao: 'Escolha Filial e Bem patrimonial, informe Data da baixa, Motivo da baixa, Valor da baixa e Observações. Salve.', porque: 'Diferente de excluir o bem, a baixa preserva o histórico e aparece nas auditorias.' },
        ],
        palavras: ['baixa', 'descarte', 'doação', 'venda', 'obsoleto'],
      },
      {
        id: 'historico',
        titulo: 'Como consultar o histórico de localização',
        objetivo: 'Ver por onde um bem passou ao longo do tempo.',
        imagem: '/ajuda/historico.jpg',
        open: { href: '/dashboard/modulos/historico-localizacao-bens', label: 'Abrir Histórico de Localização' },
        passos: [
          { onde: 'Menu Movimentações › Histórico de Localização', acao: 'A lista mostra, para cada bem, unidade, departamento, local e o período (Data de início / Data de fim) em que esteve ali.' },
          { onde: 'Novo histórico', acao: 'Use apenas para registrar movimentações antigas, anteriores ao sistema. Movimentações novas devem ser feitas por Transferências, que geram o histórico sozinhas.' },
        ],
        palavras: ['histórico', 'rastreio', 'localização'],
      },
    ],
  },
  {
    id: 'depreciacao',
    titulo: 'Depreciação',
    descricao: 'Regras por tipo de bem e registros de depreciação.',
    icone: 'trend',
    topicos: [
      {
        id: 'depreciacao-regras',
        titulo: 'Como configurar as regras de depreciação',
        objetivo: 'Definir, por tipo de bem, o método, a taxa anual, a vida útil e o valor residual usados nos cálculos.',
        imagem: '/ajuda/depreciacoes-regra.jpg',
        open: { href: '/dashboard/modulos/depreciacoes', label: 'Abrir Depreciações' },
        passos: [
          { onde: 'Menu Depreciação › Depreciações', acao: 'A tabela Regras de depreciação por tipo de bem mostra Tipo de bem, Base (Fiscal/Contábil), Método, Vida útil e Taxa. Clique em + Nova regra ou em Editar.' },
          { onde: 'Formulário da regra', acao: 'Escolha o Tipo de bem e a Base da regra (Fiscal ou Contábil), o Método de depreciação (ex.: Linha Reta) e a Vigência. Informe Vida útil (anos), Taxa anual (%) e Valor residual (%). Marque Depreciável, Regra ativa e, se quiser, Taxa automática (100 ÷ vida útil).', porque: 'O bloco Preview da regra contábil mostra o efeito antes de salvar.' },
          { onde: 'Fontes de Consulta', acao: 'O botão Fontes de Consulta lista as referências fiscais/contábeis usadas nos presets (ex.: veículos e informática 5 anos / 20%, terrenos não depreciáveis).' },
        ],
        dicas: ['Um bem específico pode ter parâmetro próprio (override), que tem prioridade sobre a regra do tipo.'],
        palavras: ['depreciação', 'regra', 'taxa', 'vida útil', 'linha reta', 'valor residual', 'fiscal', 'contábil'],
      },
      {
        id: 'depreciacao-registros',
        titulo: 'Como registrar e acompanhar a depreciação dos bens',
        objetivo: 'Lançar o cálculo de depreciação de um bem e acompanhar o valor contábil.',
        imagem: '/ajuda/depreciacoes.jpg',
        open: { href: '/dashboard/modulos/depreciacoes', label: 'Abrir Depreciações' },
        passos: [
          { onde: 'Registros de depreciação', acao: 'Clique em Nova depreciação, escolha o Bem patrimonial e o Método, confira Valor de aquisição, Valor residual e Vida útil (anos) e informe a Data do cálculo. Salve.' },
          { onde: 'Acompanhamento', acao: 'O Painel de Controle mostra quantos bens têm cálculo registrado; o Relatório BI mostra Valor contábil × Depreciação acumulada por bem e alerta bens com menos de 20% de valor contábil (fim da vida útil).' },
        ],
        palavras: ['valor contábil', 'depreciado', 'cálculo'],
      },
    ],
  },
  {
    id: 'relatorios',
    titulo: 'Relatórios',
    descricao: 'Painel BI, PDF do relatório e exportações.',
    icone: 'report',
    topicos: [
      {
        id: 'bi',
        titulo: 'Como usar o Relatório BI',
        objetivo: 'Analisar o patrimônio com indicadores, gráficos, alertas automáticos e tabelas detalhadas.',
        imagem: '/ajuda/relatorios.jpg',
        open: { href: '/dashboard/modulos/relatorios', label: 'Abrir o Relatório BI' },
        passos: [
          { onde: 'Menu Relatórios › Relatórios', acao: 'Use os filtros Filial (bens por local / responsável) e Inventário (divergências). Limpar filtros volta ao recorte completo.' },
          { onde: 'Indicadores', acao: 'Seis cartões: Bens patrimoniais, Valor de aquisição, Valor contábil líquido, Depreciação acumulada, Inventários abertos e Divergências.' },
          { onde: 'Gráficos', acao: 'Distribuição por local e Custódia por responsável (alterne Qtd. / Valor), Depreciação por bem, Andamento dos inventários e Divergências por tipo.' },
          { onde: 'Alertas e recomendações', acao: 'Leia os cartões: Ação necessária (vermelho), Atenção (âmbar), Informação (azul) e Em dia (verde). Cada um diz o que fazer e em qual módulo.', porque: 'São regras automáticas: concentração de valor em um local ou pessoa, bens sem local/responsável, bens no fim da vida útil, inventários com baixa cobertura e taxa de divergência.' },
          { onde: 'Detalhamento', acao: 'As abas Bens por local, Bens por responsável, Depreciação, Inventário e Divergências trazem as tabelas; clique no título da coluna para ordenar.' },
        ],
        palavras: ['bi', 'relatório', 'análise', 'gráfico', 'alerta', 'tomada de decisão'],
      },
      {
        id: 'bi-pdf',
        titulo: 'Como gerar o PDF do relatório BI',
        objetivo: 'Baixar um relatório completo e apresentável, com capa, indicadores, alertas, todos os gráficos e tabelas.',
        imagem: '/ajuda/relatorios.jpg',
        imagemLegenda: 'Os botões Atualizar, Imprimir e Baixar PDF do relatório BI ficam no canto superior direito.',
        open: { href: '/dashboard/modulos/relatorios', label: 'Abrir o Relatório BI' },
        passos: [
          { onde: 'Relatório BI › Baixar PDF do relatório BI', acao: 'Ajuste os filtros, aguarde os gráficos carregarem e clique em Baixar PDF do relatório BI. O arquivo relatorio-bi-patrimonial-<data>.pdf é baixado em alguns segundos.', porque: 'O PDF traz logo, empresa, CNPJ, data, recorte, indicadores, alertas, os cinco gráficos, as tabelas e rodapé com numeração de páginas.' },
          { onde: 'Imprimir', acao: 'Para imprimir direto do navegador, clique em Imprimir: menus e filtros ficam ocultos na impressão.' },
          { onde: 'Exportar (rodapé do Detalhamento)', acao: 'Baixe cada relatório em PDF, Excel ou CSV gerados pelo servidor, ou clique em CSV desta tabela para exportar exatamente a tabela que está na tela.' },
        ],
        palavras: ['pdf', 'imprimir', 'exportar', 'excel', 'csv', 'baixar'],
      },
      {
        id: 'exportacoes',
        titulo: 'Como baixar as exportações',
        objetivo: 'Baixar os arquivos padrão (PDF, Excel, CSV) sem passar pelo painel BI.',
        imagem: '/ajuda/exportacoes.jpg',
        open: { href: '/dashboard/modulos/exportacoes', label: 'Abrir Exportações' },
        passos: [
          { onde: 'Menu Relatórios › Exportações', acao: 'Escolha o arquivo (Bens por local em PDF/Excel/CSV, Bens por responsável, Depreciação, Inventário, Divergências em PDF) e clique em Baixar arquivo.', porque: 'Os arquivos respeitam a empresa ativa.' },
        ],
        palavras: ['exportação', 'download', 'arquivo'],
      },
    ],
  },
  {
    id: 'administracao',
    titulo: 'Administração',
    descricao: 'Usuários, permissões, auditorias e o seu perfil.',
    icone: 'users',
    topicos: [
      {
        id: 'usuarios',
        titulo: 'Como cadastrar usuários e definir permissões',
        objetivo: 'Criar acessos para a equipe, com perfil e permissões por caixas de seleção.',
        imagem: '/ajuda/usuarios-novo.jpg',
        open: { href: '/users', label: 'Abrir Usuários' },
        requer: 'Perfil Super admin ou Admin da empresa.',
        passos: [
          { onde: 'Menu Administração › Usuários', acao: 'Clique em Novo usuário.' },
          { onde: 'Formulário', acao: 'Informe nome, e-mail e senha (mínimo 8 caracteres) e escolha o Perfil: Super admin, Admin da empresa, Gestor patrimonial, Auditor ou Operador de inventário.', porque: 'O perfil traz um conjunto padrão de permissões; você pode ajustar marcando ou desmarcando as caixas (bens, inventários, relatórios, usuários...).' },
          { onde: 'Salvar', acao: 'Confirme. O usuário fica vinculado à empresa ativa e já pode entrar.' },
        ],
        dicas: ['Em Administração › Permissões você vê a matriz completa de permissões padrão de cada perfil.'],
        palavras: ['usuário', 'perfil', 'permissão', 'acesso', 'senha', 'super admin'],
      },
      {
        id: 'trocar-senha',
        titulo: 'Como trocar a sua senha',
        objetivo: 'Alterar a senha de acesso do seu próprio usuário.',
        imagem: '/ajuda/usuarios.jpg',
        open: { href: '/users', label: 'Abrir Usuários' },
        passos: [
          { onde: 'Menu Administração › Usuários', acao: 'Localize o seu usuário na lista e clique no lápis (editar).' },
          { onde: 'Campo de senha', acao: 'Digite a nova senha (mínimo 8 caracteres) e salve. Os demais campos podem ficar como estão.', porque: 'Deixe o campo vazio para manter a senha atual.' },
        ],
        dicas: ['Faça isso no primeiro acesso, principalmente se recebeu uma senha provisória.'],
        palavras: ['senha', 'alterar senha', 'trocar senha', 'primeiro acesso'],
      },
      {
        id: 'perfil',
        titulo: 'Perfil e logo da empresa',
        objetivo: 'Ver os dados da sua sessão e enviar o logo da empresa ativa.',
        imagem: '/ajuda/perfil.jpg',
        open: { href: '/perfil', label: 'Abrir Perfil' },
        passos: [
          { onde: 'Avatar › Perfil', acao: 'Clique no círculo com a sua inicial, no canto superior direito, e escolha Perfil.' },
          { onde: 'Logo da empresa', acao: 'No bloco Logo da empresa, escolha o arquivo (PNG ou JPG) e envie. O logo passa a aparecer na barra superior, no PDF do BI e nas etiquetas.' },
        ],
        palavras: ['perfil', 'logo', 'sessão', 'avatar'],
      },
      {
        id: 'auditorias',
        titulo: 'Auditorias e trilha de eventos',
        objetivo: 'Registrar auditorias de inventário e consultar quem fez o quê no sistema.',
        imagem: '/ajuda/auditorias.jpg',
        open: { href: '/dashboard/modulos/auditorias', label: 'Abrir Auditorias' },
        passos: [
          { onde: 'Menu Administração › Auditorias', acao: 'Clique em Nova auditoria para registrar uma auditoria de inventário (Inventário, Data da auditoria, Auditor, Observações).' },
          { onde: 'Trilha', acao: 'As operações importantes (cadastros, alterações, baixas, logins) ficam registradas com usuário, data e empresa para consulta em auditorias.' },
        ],
        palavras: ['auditoria', 'trilha', 'log', 'rastreabilidade'],
      },
    ],
  },
];

/** Todos os tópicos em sequência, com a seção a que pertencem. */
export function listarTopicos() {
  return AJUDA_SECOES.flatMap((secao) => secao.topicos.map((topico) => ({ secao, topico })));
}
