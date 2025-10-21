// app.js — versão final VS ALPHA (com integração ao Sheets, modo humano, auto-detecção e comando #f0)
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// 🔐 Variáveis (Render)
const API_ZAPI = process.env.API_ZAPI;                 // URL completa da instância Z-API
const CLIENT_TOKEN_ZAPI = process.env.CLIENT_TOKEN_ZAPI; // Token de segurança da Z-API
const TOKEN_GPT = process.env.TOKEN_GPT;               // Chave da OpenAI
const SHEET_ID = process.env.SHEET_ID;                 // ID da planilha do Google Sheets

// 📞 Número do gestor autorizado (pode encerrar com #f0)
const NUMERO_GESTOR = "5527999046870"; // <- substitua se quiser outro

// 💬 Memória temporária de atendimentos humanos
const atendimentos = {}; // { "5527999xxxx": { humano: true, expira: timestamp } }

// 🕓 Função auxiliar: verifica se atendimento humano expirou
function atendimentoExpirado(phone) {
  const agora = Date.now();
  const registro = atendimentos[phone];
  if (!registro) return true;
  return agora > registro.expira;
}

// 🧠 Busca a base de conhecimento do Google Sheets
async function carregarBaseConhecimento() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("❌ Erro ao carregar base de conhecimento:", error.message);
    return "";
  }
}

// 📬 Webhook principal
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    // 🚫 Ignora mensagens enviadas pela própria instância
    if (body?.fromMe || body?.message?.fromMe) {
      console.log("↩️ Ignorado: mensagem enviada pela própria instância.");
      return res.sendStatus(200);
    }

    // 📩 Extrai número e texto
    const phone =
      body?.phone ||
      body?.message?.phone ||
      body?.data?.message?.phone ||
      body?.data?.phone;

    const message =
      body?.text?.message ||
      body?.message?.text ||
      body?.message?.body ||
      body?.body ||
      body?.data?.message?.text ||
      body?.data?.message?.body;

    const isGroup =
      body?.isGroup ||
      body?.message?.isGroup ||
      body?.data?.message?.isGroup ||
      false;

    // 🚫 Ignora grupos
    if (isGroup) {
      console.log(`🚫 Ignorado (grupo detectado): ${phone}`);
      return res.sendStatus(200);
    }

    // 🚫 Ignora mensagens inválidas
    if (!phone || !message) {
      console.log("❌ Mensagem inválida recebida:", req.body);
      return res.sendStatus(200);
    }

    console.log(`📩 Mensagem recebida de ${phone}: ${message}`);

    // 🧩 Comando de encerramento manual (feito apenas pelo gestor)
    if (phone === NUMERO_GESTOR && /^#f0$/i.test(message.trim())) {
      if (atendimentos[phone]) {
        delete atendimentos[phone];
        console.log(`🔚 Atendimento manualmente encerrado por ${phone}`);
      } else {
        console.log(`ℹ️ Nenhum atendimento humano ativo para ${phone}`);
      }
      // Silencioso — não responde ao cliente
      return res.sendStatus(200);
    }

    // 🤝 Pedido explícito para falar com humano
    if (/humano|atendente|pessoa|falar com alguém|falar com um humano/i.test(message)) {
      atendimentos[phone] = {
        humano: true,
        expira: Date.now() + 6 * 60 * 60 * 1000 // 6 horas
      };
      const aviso = "Certo! Te conectei com um atendente humano da equipe VS ALPHA. Vou pausar minhas respostas automáticas por enquanto.";
      await axios.post(API_ZAPI, { phone, message: aviso }, { headers: { "Client-Token": CLIENT_TOKEN_ZAPI } });
      console.log(`🤝 Atendimento humano ativado para ${phone}`);
      return res.sendStatus(200);
    }

    // 🧍 Se está em modo humano e ainda dentro do prazo, não responde
    if (atendimentos[phone]?.humano && !atendimentoExpirado(phone)) {
      console.log(`🙊 Modo humano ativo — IA silenciada para ${phone}`);
      return res.sendStatus(200);
    }

    // ⏰ Se passou das 6 horas, reativa IA e envia saudação inicial
    if (atendimentos[phone]?.humano && atendimentoExpirado(phone)) {
      delete atendimentos[phone];
      console.log(`🔄 Atendimento humano expirado — IA reativada para ${phone}`);

      const saudacao = `Olá! 👋 Saudações da equipe VS ALPHA — Impulsionando Resultados.

**Sobre o que quer falar?**
*Recursos Humanos / Financeiro*  
*Sobre a Empresa*  
*Quero trabalhar na VS ALPHA*

(Veja o que mais precisa e me fale aqui)`;

      await axios.post(API_ZAPI, { phone, message: saudacao }, { headers: { "Client-Token": CLIENT_TOKEN_ZAPI } });
      return res.sendStatus(200);
    }

    // 🧾 Carrega base de conhecimento do Sheets
    const baseVSAlpha = await carregarBaseConhecimento();

    // 🧠 Envia mensagem ao GPT
    const gptResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
Você é o agente virtual da empresa VS ALPHA — Impulsionando Resultados.
Use a base abaixo para responder perguntas sobre a empresa.
Se identificar que o cliente está tratando de um assunto sensível, reclamação, financeiro, erro ou negociação,
não responda — apenas retorne exatamente {"acao":"encaminhar_humano"}.

Base de conhecimento:
${baseVSAlpha}
`
          },
          { role: "user", content: message }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN_GPT}`,
          "Content-Type": "application/json"
        }
      }
    );

    let reply = gptResponse.data.choices[0].message.content.trim();

    // 🧭 Se o GPT decidir que precisa de humano
    if (/encaminhar_humano/i.test(reply)) {
      atendimentos[phone] = {
        humano: true,
        expira: Date.now() + 6 * 60 * 60 * 1000
      };
      const aviso = "Percebi que esse assunto precisa de atenção humana. Estou encaminhando sua conversa para um atendente da VS ALPHA. Aguarde um momento.";
      await axios.post(API_ZAPI, { phone, message: aviso }, { headers: { "Client-Token": CLIENT_TOKEN_ZAPI } });
      console.log(`⚠️ Encaminhamento automático para humano: ${phone}`);
      return res.sendStatus(200);
    }

    // 🧹 Limpa formatação Markdown
    reply = reply.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    reply = reply.replace(/[*_`]/g, "");

    console.log(`💬 Resposta da IA: ${reply}`);

    // 📤 Envia a resposta pelo WhatsApp via Z-API
    await axios.post(API_ZAPI, { phone, message: reply }, { headers: { "Client-Token": CLIENT_TOKEN_ZAPI } });
    console.log(`✅ Mensagem enviada para ${phone}`);

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro no processamento:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// ⚙️ Porta automática (Render define)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor VS ALPHA rodando na porta ${PORT}`));
