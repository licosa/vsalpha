// app.js — versão estável VS ALPHA (Render + Z-API + OpenAI)
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// 🔐 Variáveis de ambiente do Render
const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🧠 Webhook: recebe mensagens do WhatsApp e responde com ChatGPT
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    // 📩 Extrai telefone e texto (cobre todos os formatos possíveis da Z-API)
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

    if (!phone || !message) {
      console.log("Mensagem inválida recebida:", req.body);
      return res.sendStatus(200);
    }

    console.log(`📩 Mensagem recebida de ${phone}: ${message}`);

    // 🧠 Gera resposta com a OpenAI
    const gptResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é o agente virtual da VS ALPHA — Impulsionando Resultados. \
              Fale como se estivesse no WhatsApp, com simpatia, clareza e profissionalismo. \
              Seja breve e natural. \
              Caso perguntem sobre serviços, explique que a VS ALPHA atua com gestão de pessoas nas áreas de logística, limpeza, recepção e apoio operacional."
          },
          { role: "user", content: message }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = gptResponse.data.choices[0].message.content.trim();
    console.log(`💬 Resposta da IA: ${reply}`);

    // 📤 Envia a resposta pelo WhatsApp via Z-API
    const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;
    const zapiPayload = {
      phone: phone,
      message: reply
    };

    await axios.post(zapiUrl, zapiPayload);

    console.log(`✅ Mensagem enviada para ${phone}`);
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// ⚙️ Porta (Render define via variável PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor VS ALPHA rodando na porta ${PORT}`)
);
