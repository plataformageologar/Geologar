/**
 * Indicador (não sensível) de que este navegador tem uma sessão da área
 * administrativa. Os cookies da sessão são httpOnly; sem este indicador, o
 * botão "Editar esta página" teria de consultar o servidor em toda visita.
 *
 * Ele não concede nada: só faz o botão perguntar ao servidor
 * (`/api/editor-access`, `no-store`), que verifica sessão e vínculo ativo.
 * Gravado e removido pelo proxy de `/admin` conforme a sessão.
 */
export const EDITOR_HINT_COOKIE = "geologar-editor-hint";
export const EDITOR_HINT_MAX_AGE = 60 * 60 * 24 * 30;
