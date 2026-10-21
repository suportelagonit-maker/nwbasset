/**
 * A regra que decide se a janela pode recarregar sozinha quando sai versao
 * nova. Fica separada do componente porque e a parte que precisa de teste: o
 * valor de "atualizacao automatica" esta em recarregar sem pedir, e o perigo
 * esta em recarregar por cima de um formulario meio preenchido.
 */

/**
 * Ha algo digitado e ainda nao enviado na tela?
 *
 * O criterio e "a pessoa perderia alguma coisa". Por isso NAO contam: valor que
 * veio do proprio sistema (value igual ao defaultValue), busca (refaz-se
 * sozinha), lista de opcoes (o valor volta igual), campo desabilitado ou so de
 * leitura, e botao.
 */
export function temTrabalhoEmAndamento(doc: Document): boolean {
  const campos = doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select',
  );

  for (const campo of campos) {
    if (campo.disabled) continue;
    // Escolher numa lista nao e trabalho que se perca.
    if (campo instanceof HTMLSelectElement) continue;
    if (campo.readOnly) continue;

    const tipo = campo.type;
    if (['button', 'submit', 'reset', 'hidden', 'search'].includes(tipo)) continue;

    if (campo instanceof HTMLInputElement && (tipo === 'checkbox' || tipo === 'radio')) {
      if (campo.checked !== campo.defaultChecked) return true;
      continue;
    }

    if (campo.value && campo.value !== campo.defaultValue) return true;
  }

  // Um dialogo aberto quase sempre e uma tarefa pela metade.
  return Boolean(doc.querySelector('dialog[open]'));
}
