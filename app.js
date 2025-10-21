// app.js — versão VS ALPHA final com integração ao Google Sheets (base de conhecimento dinâmica)
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// 🔐 Variáveis (Render)
const API_ZAPI = process.env.API_ZAPI;                 // URL completa da instância Z-API
const CLIENT_TOKEN_ZAPI = process.env.CLIENT_TOKEN_ZAPI; // Token de segurança da Z-API
const TOKEN_GPT = process.env.TOKEN_GPT;               // Chave da OpenAI
const SHEET_ID = process.env.SHEET_ID;                 // ID da planilha do Google Sheets

// 🧠 Função que busca dados da planilha pública do Google Sheets (em CSV)
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

// 📬 Webhook principal — recebe mensagens do WhatsApp e responde
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    // 🚫 Evita loop (mensagem enviada pela própria instância)
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

    // 🧾 Busca a base de conhecimento atualizada do Google Sheets
    const baseVSAlpha = await carregarBaseConhecimento();

    // 🧠 Gera resposta usando GPT e o contexto da VS ALPHA
    const gptResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é o agente virtual da empresa VS ALPHA — Impulsionando Resultados.
            Utilize as informações abaixo como base de conhecimento para responder perguntas sobre a empresa:

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

    const reply = gptResponse.data.choices[0].message.content.trim();
    console.log(`💬 Resposta da IA: ${reply}`);

    // 📤 Envia a resposta pelo WhatsApp via Z-API
    await axios.post(
      API_ZAPI,
      { phone, message: reply },
      { headers: { "Client-Token": CLIENT_TOKEN_ZAPI } }
    );

    console.log(`✅ Mensagem enviada para ${phone}`);
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro no processamento:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// ⚙️ Porta (Render define automaticamente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor VS ALPHA rodando na porta ${PORT}`)
);
