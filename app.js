// app.js — versão FINAL VS ALPHA com Client-Token Z-API + Segurança
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// 🔐 Variáveis de ambiente (Render)
const API_ZAPI = process.env.API_ZAPI;               // URL completa da instância (https://api.z-api.io/instances/.../send-text)
const CLIENT_TOKEN_ZAPI = process.env.CLIENT_TOKEN_ZAPI; // Client Token gerado em "Segurança" na Z-API
const TOKEN_GPT = process.env.TOKEN_GPT;             // Chave da OpenAI (sk-proj-...)

// 🧠 Webhook: recebe mensagens do WhatsApp e responde via ChatGPT
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    // 📩 Extrai telefone e texto da mensagem (cobre diferentes formatos da Z-API)
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

    // 🚫 Ignora mensagens de grupos
    if (isGroup) {
      console.log(`🚫 Mensagem ignorada (grupo detectado): ${phone}`);
      return res.sendStatus(200);
    }

    // Ignora se não tiver mensagem válida
    if (!phone || !message) {
      console.log("Mensagem inválida recebida:", req.body);
      return res.sendStatus(200);
    }

    console.log(`📩 Mensagem recebida de ${phone}: ${message}`);

    // 🧠 Chama a OpenAI para gerar resposta
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

    // 📤 Envia a resposta pelo WhatsApp via Z-API (com Client Token)
    await axios.post(
      API_ZAPI,
      {
        phone,
        message: reply
      },
      {
        headers: {
          "Client-Token": CLIENT_TOKEN_ZAPI
        }
      }
    );

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
