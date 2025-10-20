// app.js — versão VS ALPHA corrigida e compatível com Render + Z-API + OpenAI
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// 🔐 Variáveis de ambiente vindas do Render
const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🧠 Rota que recebe mensagens do WhatsApp
app.post("/webhook", async (req, res) => {
  try {
    const phone = req.body?.message?.phone;
    const message = req.body?.message?.text;

    // ignora se não tiver mensagem ou número
    if (!phone || !message) {
      console.log("Mensagem inválida recebida:", req.body);
      return res.sendStatus(200);
    }

    console.log(`📩 Mensagem recebida de ${phone}: ${message}`);

    // 🔥 Chama o modelo da OpenAI
    const gptResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é o agente virtual da VS ALPHA — Impulsionando Resultados. \
              Fale de forma simpática, profissional e objetiva, sempre como se estivesse no WhatsApp. \
              Se o cliente perguntar sobre serviços, responda que a VS ALPHA faz gestão de pessoas nas áreas de logística, limpeza e apoio operacional."
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

// ⚙️ Porta correta (Render usa variável PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor VS ALPHA rodando na porta ${PORT}`)
);
