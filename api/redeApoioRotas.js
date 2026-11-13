import express from "express";
import db from "../config/banco.js"; // Conexão com o MySQL
import { 
    listarChamados, 
    obterPerfil, 
    salvarPerfil, 
    loginRedeApoio 
} from "../controller/redeApoioController.js";

const router = express.Router();

// Rotas de Autenticação e Perfil
router.post("/login", loginRedeApoio);
router.get("/perfil", obterPerfil);
router.put("/perfil", salvarPerfil);

// 🔹 GET /api/chamados -> Listar chamados existentes
router.get("/chamados", listarChamados);

/**
 * Função auxiliar para converter o nome do dia da semana (ex: "Segunda-feira")
 * na próxima data válida no formato YYYY-MM-DD, cravado no Horário de Brasília (UTC-3).
 */
function obterProximaDataPorDiaSemana(diaTexto) {
    const dias = {
        "Domingo": 0,
        "Segunda-feira": 1,
        "Terça-feira": 2,
        "Quarta-feira": 3,
        "Quinta-feira": 4,
        "Sexta-feira": 5,
        "Sábado": 6
    };

    const diaDesejado = dias[diaTexto];

    // Obtém o momento atual garantindo o fuso horário de Brasília (America/Sao_Paulo)
    const agora = new Date();
    const dataSP = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

    // Função interna para formatar como YYYY-MM-DD
    const formatarYYYYMMDD = (d) => {
        const ano = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, "0");
        const dia = String(d.getDate()).padStart(2, "0");
        return `${ano}-${mes}-${dia}`;
    };

    // Caso o dia passado não esteja no mapeamento, retorna a data atual de SP
    if (diaDesejado === undefined) {
        return formatarYYYYMMDD(dataSP);
    }

    const diaAtual = dataSP.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    let diferenca = diaDesejado - diaAtual;

    // Se o dia escolhido for hoje ou já tiver passado na semana, agenda para a próxima semana
    if (diferenca <= 0) {
        diferenca += 7;
    }

    dataSP.setDate(dataSP.getDate() + diferenca);

    return formatarYYYYMMDD(dataSP);
}

// 🔹 POST /api/chamados -> Criar novo chamado no MySQL
// 🔹 POST /api/chamados -> Criar novo chamado no MySQL
router.post("/chamados", async (req, res) => {
    try {
        const { id_rede_apoio, endereco_usuario, motivo, data_chamado, horario } = req.body;

        // 1. Tenta pegar o ID da sessão
        let id_usuario =
            req.session?.usuarioId ||
            req.session?.id_usuario ||
            req.session?.usuario?.id_usuario;

        // 2. Fallback: se a sessão tiver apenas o e-mail (ex: sessão antiga), busca o ID no banco
        if (!id_usuario && req.session?.usuarioEmail) {
            const [usuarios] = await db.query(
                "SELECT id_usuario FROM usuario WHERE email = ?",
                [req.session.usuarioEmail]
            );
            if (usuarios.length > 0) {
                id_usuario = usuarios[0].id_usuario;
                req.session.usuarioId = id_usuario;
            }
        }

        if (!id_usuario) {
            return res.status(401).json({ mensagem: "Sessão expirada. Faça login novamente para agendar." });
        }

        if (!id_rede_apoio || !endereco_usuario || !motivo || !horario) {
            return res.status(400).json({ mensagem: "Preencha endereço, voluntária, motivo e horário." });
        }

        const dataFormatada = (data_chamado && data_chamado.includes("-") && data_chamado.length === 10)
            ? data_chamado
            : obterProximaDataPorDiaSemana(data_chamado);

        const sql = `
            INSERT INTO chamado 
            (USUARIO_id_usuario, REDE_id_rede, endereco_usuario, motivo, data_chamado, horario) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await db.query(sql, [
            id_usuario,
            id_rede_apoio,
            endereco_usuario,
            motivo,
            dataFormatada,
            horario
        ]);

        return res.status(201).json({ mensagem: "Chamado agendado com sucesso!" });
    } catch (erro) {
        console.log("Erro ao salvar chamado no MySQL:", erro);
        return res.status(500).json({ mensagem: "Erro ao salvar chamado no banco de dados." });
    }
});

export default router;