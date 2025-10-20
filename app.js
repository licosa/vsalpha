// app.js — versão VS ALPHA (Render + Z-API + OpenAI com variáveis nomeadas igual ao painel)
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// 🔐 Variáveis de ambiente (nomes idênticos aos da Z-API e OpenAI)
const ID_INSTANCE = process.env.ID_INSTANCE;            // ID da instância Z-API
const TOKEN_INSTANCE = process.env.TOKEN_INSTANCE;      // Token da instância Z-API
const TOKEN_GPT = process.env.TOKEN_GPT;                // Token da OpenAI (sk-...)


// 🧠 Webhook: recebe mensagens do WhatsApp e responde com ChatGPT
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    // 📩 Extrai telefone e texto da mensagem (formato novo da Z-API)
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

    // 🧠 Gera resposta com o ChatGPT (modelo gpt-4o-mini)
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
          Authorization: `Bearer ${TOKEN_GPT}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = gptResponse.data.choices[0].message.content.trim();
    console.log(`💬 Resposta da IA: ${reply}`);

    // 📤 Envia a resposta pelo WhatsApp via Z-API
    const zapiUrl = `https://api.z-api.io/instances/${ID_INSTANCE}/token/${TOKEN_INSTANCE}/send-text`;
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

// ⚙️ Porta (Render define automaticamente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor VS ALPHA rodando na porta ${PORT}`)
);
