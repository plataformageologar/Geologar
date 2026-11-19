/**
 * Mensagens exibidas ao visitante (navegador e servidor). Sem detalhes
 * técnicos: códigos internos ficam só nos logs.
 */
export const CONTACT_MESSAGES = {
  sending: "Enviando mensagem...",
  success: "Mensagem enviada! Entraremos em contato pelo e-mail informado.",
  failure:
    "Não foi possível enviar sua mensagem agora. Tente novamente ou utilize os canais de contato disponíveis.",
  verification: "Não foi possível validar o envio. Tente novamente.",
  validation: "Revise os campos destacados.",
  rateLimited: "Você enviou várias mensagens em pouco tempo. Aguarde um minuto e tente novamente.",
  waitVerification: "Aguarde a conclusão da verificação de segurança e envie novamente.",
  verificationUnavailable:
    "Não foi possível carregar a verificação de segurança. Recarregue a página ou utilize os canais de contato disponíveis.",
  privacy: "Os dados informados serão utilizados para responder à sua mensagem enviada à GeoLogar.",
} as const;
