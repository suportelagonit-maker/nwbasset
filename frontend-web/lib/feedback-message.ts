export type FriendlyFeedback = {
  tone: 'success' | 'error' | 'warning';
  title: string;
  text: string;
  help?: string;
};

const TECHNICAL_MESSAGE_MAP: Array<{
  match: RegExp;
  feedback: Omit<FriendlyFeedback, 'tone'> & { tone?: FriendlyFeedback['tone'] };
}> = [
  {
    match: /validation\.required|campo.*obrigat[oó]rio|the .* field is required/i,
    feedback: {
      tone: 'warning',
      title: 'Campos obrigatórios',
      text: 'Existem campos obrigatórios não preenchidos.',
      help: 'Revise os campos destacados e tente novamente.',
    },
  },
  {
    match: /validation\.exists|the selected .* is invalid/i,
    feedback: {
      tone: 'warning',
      title: 'Seleção inválida',
      text: 'Um dos itens selecionados não existe ou não pertence à empresa ativa.',
      help: 'Atualize os campos de seleção e tente novamente.',
    },
  },
  {
    match: /validation\.unique|already been taken|duplicat|unique constraint/i,
    feedback: {
      tone: 'warning',
      title: 'Valor já cadastrado',
      text: 'Já existe um registro com este valor.',
      help: 'Use outro valor ou edite o cadastro já existente.',
    },
  },
  {
    match: /validation\.email|valid email address/i,
    feedback: {
      tone: 'warning',
      title: 'E-mail inválido',
      text: 'O e-mail informado está em formato inválido.',
    },
  },
];

const MOJIBAKE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/NÃ£o/g, 'Não'],
  [/nÃ£o/g, 'não'],
  [/operaÃ§Ã£o/g, 'operação'],
  [/concluÃ[íi]da/g, 'concluída'],
  [/AtenÃ§Ã£o/g, 'Atenção'],
  [/UsuÃ¡rio/g, 'Usuário'],
  [/usuÃ¡rio/g, 'usuário'],
  [/sessÃ£o/g, 'sessão'],
  [/informaÃ§Ãµes/g, 'informações'],
  [/descriÃ§Ã£o/g, 'descrição'],
  [/Ã§/g, 'ç'],
  [/Ã£/g, 'ã'],
  [/Ã¡/g, 'á'],
  [/Ã©/g, 'é'],
  [/Ãª/g, 'ê'],
  [/Ã­/g, 'í'],
  [/Ã³/g, 'ó'],
  [/Ã´/g, 'ô'],
  [/Ãº/g, 'ú'],
];

export function sanitizePtBrText(value: string | null | undefined): string {
  let text = String(value ?? '').trim();

  for (const [pattern, replacement] of MOJIBAKE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\s+/g, ' ').trim();
}

function resolveMappedTechnicalMessage(cleaned: string): FriendlyFeedback | null {
  for (const entry of TECHNICAL_MESSAGE_MAP) {
    if (entry.match.test(cleaned)) {
      return {
        tone: entry.feedback.tone ?? 'warning',
        title: entry.feedback.title,
        text: entry.feedback.text,
        help: entry.feedback.help,
      };
    }
  }

  return null;
}

export function toFriendlyError(raw: string | null | undefined): FriendlyFeedback {
  const cleaned = sanitizePtBrText(raw);
  const mapped = resolveMappedTechnicalMessage(cleaned);

  if (mapped) {
    return mapped;
  }

  const lower = cleaned.toLowerCase();

  if (!cleaned) {
    return {
      tone: 'error',
      title: 'Falha na operação',
      text: 'Não foi possível concluir a operação.',
    };
  }

  if (lower.includes('sqlstate')) {
    return {
      tone: 'error',
      title: 'Erro de persistência',
      text: 'Não foi possível salvar os dados no banco neste momento.',
      help: 'Revise os campos e tente novamente. Se persistir, acione o suporte técnico.',
    };
  }

  if (lower.includes('unauthenticated') || lower.includes('não autenticado') || lower.includes('nao autenticado') || lower.includes(': 401')) {
    return {
      tone: 'warning',
      title: 'Sessão expirada',
      text: 'Sua sessão expirou ou o acesso não está autenticado.',
      help: 'Faça login novamente para continuar.',
    };
  }

  if (lower.includes(': 403') || lower.includes('forbidden') || lower.includes('sem permissão') || lower.includes('sem permissao')) {
    return {
      tone: 'warning',
      title: 'Acesso negado',
      text: 'Você não tem permissão para executar esta ação.',
      help: 'Solicite a liberação de acesso para o administrador.',
    };
  }

  if (lower.includes(': 404') || lower.includes('not found') || lower.includes('não encontrado')) {
    return {
      tone: 'warning',
      title: 'Registro não encontrado',
      text: 'O registro solicitado não foi encontrado.',
      help: 'Atualize a listagem e tente novamente.',
    };
  }

  if (lower.includes(': 500') || lower.includes('internal server error')) {
    return {
      tone: 'error',
      title: 'Falha no servidor',
      text: 'O servidor encontrou um erro ao processar a solicitação.',
      help: 'Tente novamente em instantes. Se continuar, verifique os logs do backend.',
    };
  }

  if (lower.includes('fetch failed') || lower.includes('failed to fetch')) {
    return {
      tone: 'error',
      title: 'Falha de conexão',
      text: 'Não foi possível comunicar com a API do sistema.',
      help: 'Verifique se o backend está ativo e se a URL da API está correta.',
    };
  }

  if (lower.includes('the given data was invalid')) {
    return {
      tone: 'warning',
      title: 'Dados inválidos',
      text: 'Existem dados inválidos no formulário.',
      help: 'Revise os campos preenchidos e tente novamente.',
    };
  }

  return {
    tone: 'error',
    title: 'Atenção',
    text: cleaned,
  };
}

export function toFriendlySuccess(raw: string | null | undefined): FriendlyFeedback {
  const cleaned = sanitizePtBrText(raw);

  return {
    tone: 'success',
    title: 'Operação concluída',
    text: cleaned || 'Operação concluída com sucesso.',
  };
}
