// app.js — versão FINAL VS ALPHA (compatível com Render + Z-API + OpenAI)
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// 🔐 Variáveis do Render (não precisa inserir no código)
const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🧠 Rota Webhook: recebe mensagens do WhatsApp
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    // 📥 Captura corretamente o texto e o telefone (formato novo da Z-API)
    const phone = body?.phone || body?.message?.phone;
    const message =
      body?.text?.message ||
      body?.message?.text ||
      body?.message?.body ||
      body?.body;

    // Ignora se não tiver texto ou número
    if (!phone || !message) {
      console.log("Mensagem inválida recebida:", req.body);
      return res.sendStatus(200);
    }

    console.log(`📩 Mensagem recebida de ${phone}: ${message}`);

    // 🧠 Envia para o modelo da OpenAI
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
              Seja breve, direto e use uma linguagem leve e amigável. \
              Caso o cliente pergunte sobre serviços, explique que a VS ALPHA atua com gestão de pessoas nas áreas de logística, limpeza, recepção e apoio operacional."
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

    // 📤 Envia a resposta via Z-API pro WhatsApp
    const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;
    await axios.post(zapiUrl, {
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

// ⚙️ Porta correta (Render usa variável PORT automaticamente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor VS ALPHA rodando na porta ${PORT}`)
);
