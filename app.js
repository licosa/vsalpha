import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE;
const ZAPI_TOKEN    = process.env.ZAPI_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post("/webhook", async (req, res) => {
  try {
    const phone   = req.body.message?.phone;
    const message = req.body.message?.text;
    if (!phone || !message) return res.sendStatus(200);

    const gptResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é o agente da VS ALPHA..." },
          { role: "user", content: message }
        ]
      },
      {
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }
      }
    );
    const reply = gptResponse.data.choices[0].message.content;

    await axios.post(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`,
      {
        phone: phone,
        message: reply
      }
    );

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
