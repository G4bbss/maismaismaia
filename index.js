
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import session from "express-session";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ===================== IMPORTAÇÕES =====================

import db from "./config/banco.js";

import rotasCliente from "./api/clienteRotas.js";
import profissionalRotas from "./api/ProfissionalRotas.js";
import redeApoioRotas from "./api/redeApoioRotas.js";
import diarioRotas from "./api/diarioRotas.js";
import muralRotas from "./api/muralRotas.js";

// ===================== CONFIGURAÇÕES =====================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backend = express();

const PORT = process.env.PORT || 3000;
const producao = process.env.NODE_ENV === "production";

// ===================== CONFIGURAÇÃO DO GEMINI =====================

const apiKey = process.env.GEMINI_API_KEY;

let genAI = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  console.log("🔑 GEMINI_API_KEY carregada com sucesso.");
} else {
  console.warn("⚠️ GEMINI_API_KEY não configurada.");
}

// ===================== MIDDLEWARES =====================

backend.use(express.json({ limit: "10mb" }));
backend.use(express.urlencoded({ extended: true }));

// Necessário quando a aplicação está atrás do proxy da Vercel.
if (producao) {
  backend.set("trust proxy", 1);
}

// ===================== SESSÃO =====================

backend.use(
  session({
    name: "maia.sid",
    secret: process.env.SESSION_SECRET || "troque-esta-chave-em-producao",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 4,
      httpOnly: true,
      secure: producao,
      sameSite: "lax"
    }
  })
);

// ===================== ARQUIVOS PÚBLICOS =====================

backend.use(express.static(path.join(__dirname, "public")));

// ===================== PROTEÇÃO DE LOGIN =====================

function exigirLogin(req, res, next) {
  if (req.session && req.session.usuarioEmail) {
    return next();
  }

  return res.redirect("/login");
}

// ===================== ROTAS DAS APIs =====================

// Clientes
backend.use("/cliente", rotasCliente);
backend.use("/usuario", rotasCliente);

// Profissionais
backend.use("/profissional", profissionalRotas);
backend.use("/api/profissionais", profissionalRotas);

// Rede de apoio
backend.use("/api", redeApoioRotas);
backend.use("/rede-apoio", redeApoioRotas);

// Diário emocional
backend.use("/diario", diarioRotas);

// Mural
backend.use("/api/mural", muralRotas);

// ===================== CHATBOT COM IA =====================

backend.post("/api/chatbot", async (req, res) => {
  try {
    const { mensagem, profissional, especialidade } = req.body;

    if (!mensagem) {
      return res.status(400).json({
        error: "A mensagem é obrigatória."
      });
    }

    if (!genAI) {
      return res.status(503).json({
        resposta: "O serviço de inteligência artificial está temporariamente indisponível."
      });
    }

    const nomeProf =
      profissional || "Profissional de Saúde Maia Care";

    const espProf =
      especialidade || "Saúde Materno-Infantil";

    const systemInstruction = `Você é ${nomeProf}, especialista em ${espProf} da plataforma de telemedicina Maia Care.

Você está conversando diretamente com uma paciente ou familiar pelo chat da plataforma.

Diretrizes:
- Responda em Português do Brasil.
- Utilize tom acolhedor, empático, seguro e profissional.
- Seja objetivo e conciso, com no máximo 1 a 3 parágrafos curtos.
- Forneça orientações responsáveis em saúde materno-infantil.
- Explique que orientações por chat não substituem consultas presenciais ou atendimento de emergência.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction
    });

    let respostaTexto = null;
    let tentativas = 0;
    const maxTentativas = 3;

    while (tentativas < maxTentativas && !respostaTexto) {
      try {
        tentativas++;

        const result = await model.generateContent(mensagem);
        const response = await result.response;

        respostaTexto = response.text();

      } catch (err) {
        console.error(
          `Tentativa ${tentativas} do chatbot falhou:`,
          err.message
        );

        if (tentativas >= maxTentativas) {
          throw err;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return res.json({
      resposta: respostaTexto
    });

  } catch (error) {
    console.error("Erro na API do Chatbot:", error);

    return res.status(500).json({
      resposta: "Olá! Tive uma breve oscilação de sinal. Como posso te orientar hoje?"
    });
  }
});

// ===================== PÁGINAS PÚBLICAS =====================

backend.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

backend.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

backend.get("/login-profissional", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login-profissional.html"));
});

backend.get("/login-rede-apoio", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login-rede-apoio.html"));
});

backend.get("/login-contato-apoio", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login-contato-apoio.html"));
});

backend.get("/cadastro", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cadastro.html"));
});

backend.get("/verificacao", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "verificacao.html"));
});

backend.get("/profissionais", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profissionais.html"));
});

backend.get("/painel-profissional", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "painel-profissional.html"));
});

backend.get("/painel-rede-apoio", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "painel-rede-apoio.html"));
});

backend.get("/dashboard-contato-apoio", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard-contato-apoio.html"));
});

// ===================== PÁGINAS PROTEGIDAS =====================

backend.get("/dashboard", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

backend.get("/dashboardapoio", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard-contato-apoio.html"));
});

backend.get("/perfil", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "perfil.html"));
});

backend.get("/agendamento", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "agendamento.html"));
});

backend.get("/telemedicina", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "telemedicina.html"));
});

backend.get("/mural", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "mural.html"));
});

// ===================== TRATAMENTO DE ERROS =====================

backend.use((err, req, res, next) => {
  console.error("Erro no servidor:", err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    error: "Ocorreu um erro interno no servidor."
  });
});

// ===================== EXPORTAÇÃO PARA VERCEL =====================

export default backend;

// ===================== EXECUÇÃO LOCAL =====================

if (!producao) {
  backend.listen(PORT, () => {
    console.log(`🚀 Maia Care rodando em http://localhost:${PORT}`);
  });
}
