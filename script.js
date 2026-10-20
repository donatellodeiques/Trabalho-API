const MATRICULA_ALUNO = "464509";

const URL_BASE = "https://api.tvmaze.com";
const URL_LOGS = "https://www.piway.com.br/unoesc/api";

function sanitizar(texto) {
    if (!texto) return "sem_informacao";
    return String(texto)
        .replace(/[\/\?\#\&\\\%]/g, "-")
        .replace(/\s+/g, "_")
        .trim();
}

async function gravarLog(nomeApi, metodo, resultado) {
    if (MATRICULA_ALUNO === "COLOQUE_SUA_MATRICULA_AQUI") return;
    try {
        const apiLimpa = sanitizar(nomeApi);
        const metodoLimpo = sanitizar(metodo);
        const resultadoLimpo = sanitizar(resultado);
        const urlFinal = `${URL_LOGS}/inserir/log/${MATRICULA_ALUNO}/${apiLimpa}/${metodoLimpo}/${resultadoLimpo}`;
        await fetch(urlFinal);
    } catch (erro) {
        console.error(erro);
    }
}

async function carregarListaLogs() {
    const corpoTabela = document.getElementById("tabelaLogsCorpo");
    corpoTabela.innerHTML = `<tr><td colspan="5" class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div> Carregando logs...</td></tr>`;

    try {
        const resposta = await fetch(`${URL_LOGS}/logs/${MATRICULA_ALUNO}`);
        const logs = await resposta.json();

        corpoTabela.innerHTML = "";

        if (typeof logs === "string" || (logs && logs.erro) || (logs && logs.mensagem)) {
            const msg = typeof logs === "string" ? logs : (logs.erro || logs.mensagem);
            corpoTabela.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-3 fw-bold">${msg}</td></tr>`;
            return;
        }

        if (!Array.isArray(logs) || logs.length === 0) {
            corpoTabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Nenhum log registrado até o momento.</td></tr>`;
            return;
        }

        logs.forEach(item => {
            // Mapeamento exato dos campos do backend do professor
            const idLog = item.id || item.idlog || item.ID || "-";
            const api = item.api || item.nome_api || item.descapi || "TVMaze";
            
            // Busca o método testando todas as chaves possíveis
            const metodo = item.metodo || item.descmetodo || item.metodo_api || item.METODO || item.rota || "-";
            
            // Busca o resultado testando todas as chaves possíveis
            const resultado = item.resultado || item.descresultado || item.resposta || item.RESULTADO || item.retorno || "-";
            
            // Pega a data/hora que vimos no console (desclog)
            const dataHora = item.desclog || "";

            corpoTabela.innerHTML += `
                <tr>
                    <td><strong>#${idLog}</strong></td>
                    <td><span class="badge bg-secondary">${api}</span></td>
                    <td><code>${metodo}</code></td>
                    <td>
                        <div>${resultado}</div>
                        ${dataHora ? `<small class="text-muted d-block" style="font-size: 0.75rem;">📅 ${dataHora}</small>` : ""}
                    </td>
                    <td class="text-center">
                        <button onclick="excluirLog(${idLog})" class="btn btn-outline-danger btn-sm">
                            Excluir
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (erro) {
        corpoTabela.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-3">Erro ao carregar logs: ${erro.message}</td></tr>`;
    }
}

async function excluirLog(idLog) {
    if (!confirm(`Deseja realmente excluir o log #${idLog}?`)) return;

    try {
        const resposta = await fetch(`${URL_LOGS}/excluir/log/${idLog}/aluno/${MATRICULA_ALUNO}`);
        await resposta.json();
        carregarListaLogs();
    } catch (erro) {
        alert("Erro ao excluir: " + erro.message);
    }
}

async function carregarCatalogoSemFiltro() {
    const container = document.getElementById("listaComRepeticao");
    const titulo = document.getElementById("tituloListagem");
    const contador = document.getElementById("contadorResultados");

    titulo.innerText = "Catálogo Geral de Séries (Chamada SEM Filtro e COM Repetição)";
    container.innerHTML = `<div class="col-12 text-center py-4"><div class="spinner-border text-success"></div><p class="mt-2 text-muted">Carregando catálogo da API...</p></div>`;

    container.scrollIntoView({ behavior: "smooth" });

    try {
        const resposta = await fetch(`${URL_BASE}/shows`);
        if (!resposta.ok) throw new Error(`Status ${resposta.status}`);
        const dados = await resposta.json();

        const listaSeries = dados.slice(0, 36);
        contador.innerText = `${listaSeries.length} séries exibidas`;
        container.innerHTML = "";

        listaSeries.forEach(serie => {
            const imagem = (serie.image && serie.image.medium) 
                ? serie.image.medium 
                : "https://images.placeholders.dev/?width=210&height=295&text=Sem+Foto";
            const nota = (serie.rating && serie.rating.average) ? serie.rating.average : "N/A";
            const generos = (serie.genres && serie.genres.length > 0) ? serie.genres.join(", ") : "Geral";

            container.innerHTML += `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0">
                        <img src="${imagem}" class="card-img-top" alt="${serie.name}">
                        <div class="card-body d-flex flex-column">
                            <span class="badge bg-secondary align-self-start mb-2">ID: ${serie.id}</span>
                            <h5 class="card-title fw-bold">${serie.name}</h5>
                            <p class="small text-muted mb-1"><strong>Gênero:</strong> ${generos}</p>
                            <p class="small text-muted mb-3"><strong>Nota:</strong> ${nota}</p>
                            <button onclick="selecionarSeriePorId(${serie.id})" class="btn btn-outline-dark btn-sm mt-auto">
                                Ver Detalhes e Elenco (Sem Repetição)
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        gravarLog("TVMaze", "catalogo_geral", `${listaSeries.length}_series`);

    } catch (erro) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-danger text-center">Não foi possível carregar as séries: ${erro.message}</div></div>`;
    }
}

async function buscarComFiltro() {
    const termoBusca = document.getElementById("inputFiltroNome").value.trim();
    const generoFiltro = document.getElementById("selectFiltroGenero").value;
    const container = document.getElementById("listaComRepeticao");
    const titulo = document.getElementById("tituloListagem");
    const contador = document.getElementById("contadorResultados");

    if (termoBusca === "") {
        alert("Digite o nome de uma série para filtrar!");
        return;
    }

    titulo.innerText = `Resultado Filtrado por: "${termoBusca}" ${generoFiltro ? `(${generoFiltro})` : ""}`;
    container.innerHTML = `<div class="col-12 text-center py-4"><div class="spinner-border text-primary"></div></div>`;

    try {
        const resposta = await fetch(`${URL_BASE}/search/shows?q=${encodeURIComponent(termoBusca)}`);
        const dados = await resposta.json();

        const resultadosFiltrados = dados.filter(item => {
            if (!generoFiltro) return true;
            return item.show.genres.includes(generoFiltro);
        });

        contador.innerText = `${resultadosFiltrados.length} resultados encontrados`;
        container.innerHTML = "";

        if (resultadosFiltrados.length === 0) {
            container.innerHTML = `<div class="col-12"><div class="alert alert-warning">Nenhuma série encontrada com esses filtros.</div></div>`;
            gravarLog("TVMaze", "busca_filtro", "0_resultados");
            return;
        }

        resultadosFiltrados.forEach(item => {
            const serie = item.show;
            const imagem = (serie.image && serie.image.medium) ? serie.image.medium : "https://images.placeholders.dev/?width=210&height=295&text=Sem+Foto";
            const nota = (serie.rating && serie.rating.average) ? serie.rating.average : "N/A";
            const generos = (serie.genres && serie.genres.length > 0) ? serie.genres.join(", ") : "Não informado";

            container.innerHTML += `
                <div class="col">
                    <div class="card h-100 shadow-sm border-primary">
                        <img src="${imagem}" class="card-img-top" alt="${serie.name}">
                        <div class="card-body d-flex flex-column">
                            <span class="badge bg-primary align-self-start mb-2">ID: ${serie.id}</span>
                            <h5 class="card-title fw-bold">${serie.name}</h5>
                            <p class="small text-muted mb-1"><strong>Gênero:</strong> ${generos}</p>
                            <p class="small text-muted mb-3"><strong>Nota:</strong> ${nota}</p>
                            <button onclick="selecionarSeriePorId(${serie.id})" class="btn btn-primary btn-sm mt-auto">
                                Ver Detalhes (Sem Repetição)
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        gravarLog("TVMaze", "busca_filtro", `${resultadosFiltrados.length}_series`);

    } catch (erro) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-danger">Erro ao filtrar dados: ${erro.message}</div></div>`;
    }
}

async function buscarSerieUnicaSemRepeticao() {
    const id = document.getElementById("inputIdSerie").value;
    const secao = document.getElementById("secaoSemRepeticao");
    const conteudo = document.getElementById("conteudoSemRepeticao");

    if (!id || id <= 0) {
        alert("Informe um ID válido!");
        return;
    }

    secao.classList.remove("d-none");
    conteudo.innerHTML = `<div class="text-center py-3"><div class="spinner-border text-dark"></div></div>`;

    try {
        const respostaSerie = await fetch(`${URL_BASE}/shows/${id}`);
        if (!respostaSerie.ok) throw new Error("Série não encontrada para o ID informado.");
        const serieUnica = await respostaSerie.json();

        const respostaElenco = await fetch(`${URL_BASE}/shows/${id}/cast`);
        const dadosElenco = await respostaElenco.json();
        const nomesAtores = dadosElenco.slice(0, 5).map(item => item.person.name).join(", ") || "Elenco não listado";

        const imagem = serieUnica.image ? serieUnica.image.original : "https://images.placeholders.dev/?width=300&height=420&text=Sem+Imagem";
        const emissora = serieUnica.network ? serieUnica.network.name : (serieUnica.webChannel ? serieUnica.webChannel.name : "N/A");

        conteudo.innerHTML = `
            <div class="row g-4 align-items-center">
                <div class="col-md-3 text-center">
                    <img src="${imagem}" class="img-fluid rounded shadow-sm" style="max-height: 320px;" alt="${serieUnica.name}">
                </div>
                <div class="col-md-9">
                    <span class="badge bg-dark mb-2">Registro Único — ID #${serieUnica.id}</span>
                    <h3 class="fw-bold">${serieUnica.name}</h3>
                    <p class="text-muted mb-2">
                        <strong>Idioma:</strong> ${serieUnica.language} | 
                        <strong>Status:</strong> ${serieUnica.status} | 
                        <strong>Estreia:</strong> ${serieUnica.premiered || "N/A"} | 
                        <strong>Canal/Streaming:</strong> ${emissora}
                    </p>
                    <div class="mb-3">${serieUnica.summary || "<p>Sem sinopse disponível.</p>"}</div>
                    <div class="p-3 bg-light rounded border">
                        <strong>Elenco Principal:</strong>
                        <p class="mb-0 mt-1 text-secondary">${nomesAtores}</p>
                    </div>
                </div>
            </div>
        `;

        gravarLog("TVMaze", "busca_id", `id_${serieUnica.id}`);

        secao.scrollIntoView({ behavior: "smooth" });

    } catch (erro) {
        conteudo.innerHTML = `<div class="alert alert-danger mb-0">${erro.message}</div>`;
    }
}

function selecionarSeriePorId(id) {
    document.getElementById("inputIdSerie").value = id;
    buscarSerieUnicaSemRepeticao();
}

function fecharDestaque() {
    document.getElementById("secaoSemRepeticao").classList.add("d-none");
}

window.onload = () => {
    carregarCatalogoSemFiltro();
    buscarSerieUnicaSemRepeticao();
};