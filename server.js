const { google } = require("googleapis")
const fs = require("fs")

// const setData = "2025-04-28"

function getDataHoje() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0") // adiciona 1 porque janeiro é 0
  const day = String(today.getDate()).padStart(2, "0")

  const formattedDate = `${year}-${month}-${day}`

  return formattedDate
}

const setData = getDataHoje()

function formatHora(date) {
  const horas = String(date.getHours()).padStart(2, "0")
  const minutos = String(date.getMinutes()).padStart(2, "0")
  return `${horas}:${minutos}`
}

const agora = new Date()
const umaHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000)

const horaAtual = setData + "+" + formatHora(agora)
const horaAnterior = setData + "+" + formatHora(umaHoraAtras)
const horaRange = formatHora(umaHoraAtras) + "-" + formatHora(agora)

let camps = []

const dados = async (pagina) => {
  const d = await fetch(
    `https://api.redtrack.io/tracks?api_key=9ISY1RpT1h93L0bDzE97&date_from=${setData}&date_to=${setData}&country_code=US&time_interval=lasthour&page=${pagina}&per=5000`
  )

  const data = await d.json()

  console.log(data)

  return data // imprime os dados
}

const campUniq = (arr) => {
  return Array.from(new Map(arr.map((item) => [item.camp, item])).values())
}

const all_Camps = async () => {
  let a
  let data
  let count = 1

  a = await dados(count)
  data = await a.items

  do {
    for (let index = 0; index < data?.length; index++) {
      const y = data[index].sub6
      const z = data[index].sub19
      camps.push({
        camp: y,
        offer: z,
      })
    }

    count++

    a = await dados(count)
    data = await a.items

    isVazio = data == ""
    // console.log(isVazio)
  } while (isVazio == false)

  const uniq = campUniq(camps)

  console.log(uniq)

  dados2(uniq)
}

// all_Camps()

let fullData = []

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const getReport = async (n) => {
  const a = await fetch(
    `https://api.redtrack.io/report?api_key=9ISY1RpT1h93L0bDzE97&group=campaign&date_from=${setData}&date_to=${setData}&timezone=America/Sao_Paulo&time_interval=lasthour&sub6=${n}&page=1&per=1000&total=true`
  )

  return a
}

const originalDate = setData
const [year, month, day] = originalDate.split("-")
const formattedDate = `${day}-${month}-${year}`

const dados2 = async (campaign) => {
  let nome
  let data
  const tamanho = campaign.length

  for (let index = 0; index < tamanho; index++) {
    console.log(index + " total: " + tamanho)

    nome = campaign[index].camp
    offer = campaign[index].offer

    let response = await getReport(nome)

    data = await response.json()

    // console.log(data.total.cost)

    fullData.push({
      data: formattedDate,
      camp: nome,
      offer: offer,
      cost: data.total.cost,
    })

    await delay(1000)
  }
  // console.log("Custo")
  console.log(fullData)
  // enviarParaSheets()
  dados_Cartpanda()
}

let dados_cart = []
let completo = []
let conv = 0

const dados_Cartpanda = async (pagina) => {
  const d = await fetch(
    `https://accounts.cartpanda.com/api/the-pain/orders?created_at_min=${horaAnterior}&created_at_max=${horaAtual}&payment_status=3`,
    {
      method: "GET",
      headers: {
        Authorization:
          "Bearer Hpd0ARgM1imwvuxfKb9u4offfYd4yBqVvhUXMDS9c3KF1GceHdnBGaYBxC7l",
        "Content-Type": "application/json",
      },
    }
  )

  const data = await d.json()
  const orders = data.orders.data

  for (const conv of orders) {
    let track = conv.tracking_parameters

    // Remove Vendas Tauk
    if (track != "") {
      for (const trk of track) {
        if (trk.parameter_name == "utm_campaign") {
          dados_cart.push({
            camp: trk.parameter_value,
            valor: conv.subtotal_price,
            faturamento: conv.total_price,
          })
        }
      }
    }
  }

  conv = dados_cart.length

  const uniqueResult = Object.values(
    dados_cart.reduce((acc, item) => {
      const key = item.camp

      // Conversão de 'valor' para número
      const valorNumerico = parseFloat(
        item.valor.replace(/,/g, "").replace(/\./g, "") / 100
      )

      // Conversão de 'faturamento' para número
      const faturamentoNumerico = parseFloat(
        item.faturamento.replace(/,/g, "").replace(/\./g, "") / 100
      )

      if (!acc[key]) {
        acc[key] = { camp: key, total: 0, faturamento: 0 }
      }

      acc[key].total += valorNumerico
      acc[key].faturamento += faturamentoNumerico

      return acc
    }, {})
  ).map((obj) => ({
    ...obj,
    total: obj.total.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    faturamento: obj.faturamento.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  }))

  // console.log("Lucro")
  console.log(uniqueResult)
  // return resultado

  // Mapeia os totais por "camp"
  const mapTotais = new Map()
  const mapFaturamento = new Map()

  uniqueResult.forEach((item) => {
    mapTotais.set(item.camp, item.total)
  })

  uniqueResult.forEach((item) => {
    mapFaturamento.set(item.camp, item.faturamento)
  })

  // console.log(mapTotais)
  // console.log(mapFaturamento)

  // Converte string BR para número
  function parseBR(str) {
    if (!str) return 0 // se for undefined, null ou string vazia
    return parseFloat(str.replace(/\./g, "").replace(",", "."))
  }

  function removerPontoMilhar(str) {
    if (!str) return 0 // se for undefined, null ou string vazia
    return parseFloat(str.replace(/\./g, ""))
  }

  // console.log(fullData)

  // Junta os dados
  const resultado = fullData.map((item) => ({
    offer: item.offer,
    camp: item.camp,
    cost: item.cost,
    faturamento: parseBR(mapFaturamento.get(item.camp)) || 0,
    total: parseBR(mapTotais.get(item.camp)) || 0,
    lucro: parseBR(mapTotais.get(item.camp)) - item.cost,
  }))

  // console.log("fim")

  console.log(resultado)
  // enviarParaSheets(resultado)

  const resultOffer = Object.values(
    resultado.reduce((acc, item) => {
      if (!acc[item.offer]) {
        acc[item.offer] = {
          offer: item.offer,
          cost: 0,
          total: 0,
          faturamento: 0,
          lucro: 0,
        }
      }
      acc[item.offer].cost += item.cost
      acc[item.offer].total += item.total
      acc[item.offer].faturamento += item.faturamento
      acc[item.offer].lucro += item.lucro
      return acc
    }, {})
  )

  // console.log(resultOffer)

  for (const oferta of resultOffer) {
    let ctotal = await getCostACM(oferta.offer)

    completo.push({
      offer: oferta.offer,
      custo_completo: ctotal.total?.cost || 0,
      custo_30min: oferta.cost,
      faturamento: oferta.faturamento,
      liquido: oferta.total,
      lucro: oferta.lucro,
    })
  }

  console.log(completo)

  enviarParaSheets()
}

const getCostACM = async (n) => {
  const a = await fetch(
    `https://api.redtrack.io/report?api_key=9ISY1RpT1h93L0bDzE97&group=campaign&date_from=${setData}&date_to=${setData}&timezone=America/Sao_Paulo&sub19=${n}&page=1&per=1000&total=true`
  )

  const cost = await a.json()
  return cost
}

// 🔑 Substitua pelo caminho para o seu arquivo JSON da chave
const auth = new google.auth.GoogleAuth({
  keyFile: "service.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

async function enviarParaSheets(resultado) {
  const client = await auth.getClient()
  const sheets = google.sheets({ version: "v4", auth: client })

  const spreadsheetId = "1mfu0Tezwxp4A0v1XUKI4tk48HEeK69WKu6MbnQyv0w0" // copie da URL da planilha
  const range = "Página1!A2:D" // ou o nome da sua aba e intervalo desejado

  const values = completo.map((d) => [
    setData,
    horaRange,
    d.offer,
    // d.camp,
    `R$ ${d.custo_completo}`,
    `R$ ${d.custo_30min.toFixed(2).replace(".", ",")}`,
    `R$ ${d.liquido.toFixed(2).replace(".", ",")}`,
    `R$ ${d.lucro.toFixed(2).replace(".", ",")}`,
    conv,
  ])

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values,
    },
  })

  console.log("Dados inseridos com sucesso!")
}

const express = require("express")
const app = express()
const port = process.env.PORT || 3000

app.get("/", async (req, res) => {
  try {
    await all_Camps() // faltava também o await, supondo que all_Camps seja assíncria
    res.status(200).json({
      message: "Sucesso!",
    })
  } catch (err) {
    res.status(500).send("Erro ao processar a requisição")
  }
})
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`)
})
