// app.js — versão estável VS ALPHA (corrigida para loops e pronta para integração externa)
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// 🔐 Variáveis de ambiente (Render)
const API_ZAPI = process.env.API_ZAPI;               // URL completa da Z-API (com /send-text)
const CLIENT_TOKEN_ZAPI = process.env.CLIENT_TOKEN_ZAPI; // Token de segurança da Z-API
const TOKEN_GPT = process.env.TOKEN_GPT;             // Chave da OpenAI

// 🧠 Memória simples de controle (para pausas e logs futuros)
const atendimentos = {}; // {"5527999XXXX": {modo: "humano", expira: 123456789}}

// 🛰️ Webhook: recebe mensagens e responde via ChatGPT
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    // 🚫 1. Evita loop infinito — ignora mensagens enviadas pelo próprio número
    if (body?.fromMe || body?.message?.fromMe) {
      console.log("↩️ Mensagem ignorada (enviada pela própria instância).");
      return res.sendStatus(200);
    }

    // 📩 2. Extrai telefone e texto
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

    // 🚫 3. Ignora grupos (confirmado funcionando)
    if (isGroup) {
      console.log(`🚫 Mensagem ignorada (grupo detectado): ${phone}`);
      return res.sendStatus(200);
    }

    // 🚫 4. Ignora mensagens vazias ou inválidas
    if (!phone || !message) {
      console.log("Mensagem inválida recebida:", req.body);
      return res.sendStatus(200);
    }

    console.log(`📩 Mensagem recebida de ${phone}: ${message}`);

    // 🧠 5. Gera resposta com a OpenAI
    const gptResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é o agente virtual da VS ALPHA — Impulsionando Resultados. \
              Fale como se estivesse no WhatsApp, com clareza, naturalidade e profissionalismo. \
              Caso perguntem sobre serviços, explique que a VS ALPHA atua com gestão de pessoas nas áreas de logística, limpeza, recepção e apoio operacional."
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

    // 📤 6. Envia a resposta pelo WhatsApp via Z-API
    await axios.post(
      API_ZAPI,
      { phone, message: reply },
      { headers: { "Client-Token": CLIENT_TOKEN_ZAPI } }
    );

    console.log(`✅ Mensagem enviada para ${phone}`);
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// ⚙️ Porta automática (Render define)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor VS ALPHA rodando na porta ${PORT}`)
);
