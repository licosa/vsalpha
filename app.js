// app.js — versão VS ALPHA (corrigida com URL completa da Z-API)
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// 🔐 Variáveis do Render
const API_ZAPI = process.env.API_ZAPI; // URL completa da API da instância
const TOKEN_GPT = process.env.TOKEN_GPT; // Token da OpenAI (sk-...)

// 🧠 Webhook: recebe mensagens e responde com ChatGPT
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    // 📩 Extrai número e texto (compatível com todos formatos da Z-API)
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
              Fale como se estivesse no WhatsApp, com simpatia e profissionalismo. \
              Seja breve e natural. \
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

    // 📤 Envia resposta pelo WhatsApp (usando a URL completa da Z-API)
    await axios.post(API_ZAPI, {
      phone: phone,
      message: reply
    });

    console.log(`✅ Mensagem enviada para ${phone}`);
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// ⚙️ Porta (Render define automaticamente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor VS ALPHA rodando na porta ${PORT}`)
);
