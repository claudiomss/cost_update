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

let setData = getDataHoje()

function formatHora(date) {
  const horas = String(date.getHours()).padStart(2, "0")
  const minutos = String(date.getMinutes()).padStart(2, "0")
  return `${horas}:${minutos}`
}

let agora = new Date()
let umaHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000)

let horaAtual = setData + "+" + formatHora(agora)
let horaAnterior = setData + "+" + formatHora(umaHoraAtras)
let horaRange = formatHora(umaHoraAtras) + "-" + formatHora(agora)

let camps = []

const dados = async (pagina) => {
  const d = await fetch(
    `https://api.redtrack.io/tracks?api_key=9ISY1RpT1h93L0bDzE97&date_from=${setData}&date_to=${setData}&country_code=US&time_interval=lasthour&page=${pagina}&per=5000`
  )

  const data = await d.json()

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

  // console.log(uniq)

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

    await delay(1200)
  }
  // console.log("Custo")
  // console.log(fullData)
  // enviarParaSheets()
  dados_Cartpanda()
}

let dados_cart = []
let completo = []
// let conv = 0

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
            conv: 1,
          })
        }
      }
    }
  }

  conv = dados_cart.length

  // console.log(dados_cart)
  // console.log(conv)

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
        acc[key] = { camp: key, total: 0, faturamento: 0, conv: 0 }
      }

      acc[key].total += valorNumerico
      acc[key].faturamento += faturamentoNumerico
      acc[key].conv += 1

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
  // console.log(uniqueResult)
  // return resultado

  // Mapeia os totais por "camp"
  const mapTotais = new Map()
  const mapFaturamento = new Map()
  const mapConv = new Map()

  uniqueResult.forEach((item) => {
    const currentConv = mapConv.get(item.camp) || 0
    mapConv.set(item.camp, currentConv + item.conv)
  })

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
    conv: mapConv.get(item.camp) || 0,
  }))

  // console.log("fim")

  // console.log(resultado)
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
          conv: 0,
        }
      }
      acc[item.offer].cost += item.cost
      acc[item.offer].total += item.total
      acc[item.offer].faturamento += item.faturamento
      acc[item.offer].lucro += item.lucro
      acc[item.offer].conv += item.conv
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
      conv: oferta.conv,
    })

    await delay(1200)
  }

  // console.log(completo)

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
  // keyFile: "/root/up/service.json",
  keyFile: "service.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

// async function enviarParaSheets(resultado) {
//   const client = await auth.getClient()
//   const sheets = google.sheets({ version: "v4", auth: client })

//   const spreadsheetId = "1mfu0Tezwxp4A0v1XUKI4tk48HEeK69WKu6MbnQyv0w0" // copie da URL da planilha
//   const range = "Página1!A2:D" // ou o nome da sua aba e intervalo desejado

//   const values = completo.map((d) => [
//     setData,
//     horaRange,
//     d.offer,
//     // d.camp,
//     d.custo_completo,
//     d.custo_30min,
//     d.faturamento,
//     d.liquido,
//     d.lucro,
//     conv,
//   ])

//   await sheets.spreadsheets.values.append({
//     spreadsheetId,
//     range,
//     valueInputOption: "RAW",
//     requestBody: {
//       values,
//     },
//   })

//   console.log("Dados inseridos com sucesso!")
// }

// async function enviarParaSheets(resultado) {
//   const client = await auth.getClient()
//   const sheets = google.sheets({ version: "v4", auth: client })

//   const spreadsheetId = "1mfu0Tezwxp4A0v1XUKI4tk48HEeK69WKu6MbnQyv0w0"
//   const { data: sheetData } = await sheets.spreadsheets.get({ spreadsheetId })

//   const existingSheets = sheetData.sheets.map((s) => s.properties.title)

//   for (const d of completo) {
//     const sheetName = d.offer

//     // Se a aba não existir, crie
//     if (!existingSheets.includes(sheetName)) {
//       await sheets.spreadsheets.batchUpdate({
//         spreadsheetId,
//         requestBody: {
//           requests: [
//             {
//               addSheet: {
//                 properties: {
//                   title: sheetName,
//                 },
//               },
//             },
//           ],
//         },
//       })

//       console.log(`Aba "${sheetName}" criada.`)
//     }

//     // Escreve os dados na aba correspondente
//     const values = [
//       [
//         setData,
//         horaRange,
//         d.offer,
//         d.custo_completo,
//         d.custo_30min,
//         d.faturamento,
//         d.liquido,
//         d.lucro,
//         conv,
//       ],
//     ]

//     await sheets.spreadsheets.values.append({
//       spreadsheetId,
//       range: `${sheetName}!A2`, // A2 para não sobrescrever cabeçalhos, se houver
//       valueInputOption: "RAW",
//       requestBody: {
//         values,
//       },
//     })

//     console.log(`Dados adicionados na aba "${sheetName}".`)
//   }
// }

// async function enviarParaSheets(resultado) {
//   const client = await auth.getClient()
//   const sheets = google.sheets({ version: "v4", auth: client })

//   const spreadsheetId = "1mfu0Tezwxp4A0v1XUKI4tk48HEeK69WKu6MbnQyv0w0"
//   const { data: sheetData } = await sheets.spreadsheets.get({ spreadsheetId })
//   const existingSheets = sheetData.sheets.map((s) => s.properties.title)

//   const headers = [
//     "Data",
//     "Hora",
//     "Oferta",
//     "Custo_ACM",
//     "Custo_1hr",
//     "Faturamento",
//     "Líquido",
//     "Lucro",
//     "Conversão",
//   ]

//   for (const d of completo) {
//     const sheetName = d.offer

//     if (!existingSheets.includes(sheetName)) {
//       const addSheetRes = await sheets.spreadsheets.batchUpdate({
//         spreadsheetId,
//         requestBody: {
//           requests: [
//             {
//               addSheet: {
//                 properties: {
//                   title: sheetName,
//                 },
//               },
//             },
//           ],
//         },
//       })

//       const sheetId = addSheetRes.data.replies[0].addSheet.properties.sheetId

//       // Define cabeçalhos com negrito e alinhamento central
//       await sheets.spreadsheets.batchUpdate({
//         spreadsheetId,
//         requestBody: {
//           requests: [
//             {
//               updateCells: {
//                 rows: [
//                   {
//                     values: headers.map((text) => ({
//                       userEnteredValue: { stringValue: text },
//                       userEnteredFormat: {
//                         textFormat: { bold: true },
//                         horizontalAlignment: "CENTER",
//                       },
//                     })),
//                   },
//                 ],
//                 fields:
//                   "userEnteredValue,userEnteredFormat(textFormat,horizontalAlignment)",
//                 start: {
//                   sheetId,
//                   rowIndex: 0,
//                   columnIndex: 0,
//                 },
//               },
//             },
//             {
//               // Aplica alinhamento central para uma área ampla (A1:I1000)
//               repeatCell: {
//                 range: {
//                   sheetId,
//                   startRowIndex: 0,
//                   endRowIndex: 1000,
//                   startColumnIndex: 0,
//                   endColumnIndex: 9,
//                 },
//                 cell: {
//                   userEnteredFormat: {
//                     horizontalAlignment: "CENTER",
//                   },
//                 },
//                 fields: "userEnteredFormat.horizontalAlignment",
//               },
//             },
//           ],
//         },
//       })

//       console.log(
//         `Aba "${sheetName}" criada com cabeçalhos e alinhamento central.`
//       )
//     }

//     const values = [
//       [
//         setData,
//         horaRange,
//         d.offer,
//         d.custo_completo,
//         d.custo_30min,
//         d.faturamento,
//         d.liquido,
//         d.lucro,
//         conv,
//       ],
//     ]

//     await sheets.spreadsheets.values.append({
//       spreadsheetId,
//       range: `${sheetName}!A2`,
//       valueInputOption: "RAW",
//       requestBody: {
//         values,
//       },
//     })

//     console.log(`Dados adicionados na aba "${sheetName}".`)
//   }
// }

// async function enviarParaSheets(resultado) {
//   const client = await auth.getClient()
//   const sheets = google.sheets({ version: "v4", auth: client })

//   const spreadsheetId = "1mfu0Tezwxp4A0v1XUKI4tk48HEeK69WKu6MbnQyv0w0"
//   const { data: sheetData } = await sheets.spreadsheets.get({ spreadsheetId })
//   const existingSheets = sheetData.sheets.map((s) => s.properties.title)

//   const headers = [
//     "Data",
//     "Hora",
//     "Oferta",
//     "Custo_ACM",
//     "Custo_1hr",
//     "Faturamento",
//     "Líquido",
//     "Lucro",
//     "Conversão",
//   ]

//   for (const d of completo) {
//     const sheetName = d.offer

//     // Cria a aba se necessário
//     if (!existingSheets.includes(sheetName)) {
//       const addSheetRes = await sheets.spreadsheets.batchUpdate({
//         spreadsheetId,
//         requestBody: {
//           requests: [
//             {
//               addSheet: {
//                 properties: {
//                   title: sheetName,
//                 },
//               },
//             },
//           ],
//         },
//       })

//       const sheetId = addSheetRes.data.replies[0].addSheet.properties.sheetId

//       // Define cabeçalhos e formatação (negrito, centralizado)
//       await sheets.spreadsheets.batchUpdate({
//         spreadsheetId,
//         requestBody: {
//           requests: [
//             {
//               updateCells: {
//                 rows: [
//                   {
//                     values: headers.map((text) => ({
//                       userEnteredValue: { stringValue: text },
//                       userEnteredFormat: {
//                         textFormat: { bold: true },
//                         horizontalAlignment: "CENTER",
//                       },
//                     })),
//                   },
//                 ],
//                 fields:
//                   "userEnteredValue,userEnteredFormat(textFormat,horizontalAlignment)",
//                 start: {
//                   sheetId,
//                   rowIndex: 0,
//                   columnIndex: 0,
//                 },
//               },
//             },
//             {
//               // Centraliza toda a aba (até linha 1000 e colunas A-I)
//               repeatCell: {
//                 range: {
//                   sheetId,
//                   startRowIndex: 0,
//                   endRowIndex: 1000,
//                   startColumnIndex: 0,
//                   endColumnIndex: 9,
//                 },
//                 cell: {
//                   userEnteredFormat: {
//                     horizontalAlignment: "CENTER",
//                   },
//                 },
//                 fields: "userEnteredFormat.horizontalAlignment",
//               },
//             },
//             {
//               // Formata colunas D (3), E (4), F (5), G (6), H (7) como moeda R$
//               repeatCell: {
//                 range: {
//                   sheetId,
//                   startRowIndex: 1,
//                   endRowIndex: 1000,
//                   startColumnIndex: 3,
//                   endColumnIndex: 8,
//                 },
//                 cell: {
//                   userEnteredFormat: {
//                     numberFormat: {
//                       type: "CURRENCY",
//                       pattern: "R$#,##0.00",
//                     },
//                   },
//                 },
//                 fields: "userEnteredFormat.numberFormat",
//               },
//             },
//           ],
//         },
//       })

//       console.log(
//         `Aba "${sheetName}" criada com cabeçalhos, alinhamento e formato monetário.`
//       )
//     }

//     // Dados da linha
//     const values = [
//       [
//         setData,
//         horaRange,
//         d.offer,
//         d.custo_completo,
//         d.custo_30min,
//         d.faturamento,
//         d.liquido,
//         d.lucro,
//         d.conv,
//       ],
//     ]

//     await sheets.spreadsheets.values.append({
//       spreadsheetId,
//       range: `${sheetName}!A2`,
//       valueInputOption: "RAW",
//       requestBody: {
//         values,
//       },
//     })

//     console.log(`Dados adicionados na aba "${sheetName}".`)
//   }
// }

async function enviarParaSheets(resultado) {
  const client = await auth.getClient()
  const sheets = google.sheets({ version: "v4", auth: client })

  const spreadsheetId = "1mfu0Tezwxp4A0v1XUKI4tk48HEeK69WKu6MbnQyv0w0"
  const { data: sheetData } = await sheets.spreadsheets.get({ spreadsheetId })
  const existingSheets = sheetData.sheets.map((s) => s.properties.title)

  const headers = [
    "Data",
    "Hora",
    "Oferta",
    "Custo_ACM",
    "Custo_1hr",
    "Faturamento",
    "Líquido",
    "Lucro",
    "Conversão",
  ]

  for (const [index, d] of completo.entries()) {
    const sheetName = d.offer

    let sheetId
    if (!existingSheets.includes(sheetName)) {
      const addSheetRes = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      })

      sheetId = addSheetRes.data.replies[0].addSheet.properties.sheetId

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              updateCells: {
                rows: [
                  {
                    values: headers.map((text) => ({
                      userEnteredValue: { stringValue: text },
                      userEnteredFormat: {
                        textFormat: { bold: true },
                        horizontalAlignment: "CENTER",
                      },
                    })),
                  },
                ],
                fields:
                  "userEnteredValue,userEnteredFormat(textFormat,horizontalAlignment)",
                start: {
                  sheetId,
                  rowIndex: 0,
                  columnIndex: 0,
                },
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1000,
                  startColumnIndex: 0,
                  endColumnIndex: 9,
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: "CENTER",
                  },
                },
                fields: "userEnteredFormat.horizontalAlignment",
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  endRowIndex: 1000,
                  startColumnIndex: 3,
                  endColumnIndex: 8,
                },
                cell: {
                  userEnteredFormat: {
                    numberFormat: {
                      type: "CURRENCY",
                      pattern: "R$#,##0.00",
                    },
                  },
                },
                fields: "userEnteredFormat.numberFormat",
              },
            },
          ],
        },
      })
      console.log(`Aba "${sheetName}" criada com formatação.`)
    } else {
      const sheet = sheetData.sheets.find(
        (s) => s.properties.title === sheetName
      )
      sheetId = sheet.properties.sheetId
    }

    const read = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    })

    const currentRow = read.data.values ? read.data.values.length + 1 : 2

    const formula =
      currentRow === 2
        ? "=D2"
        : `=SE(ÉNÚM(D${currentRow - 1})=TRUE; (D${currentRow} - D${
            currentRow - 1
          }); D${currentRow})`

    const values = [
      [
        setData,
        horaRange,
        d.offer,
        d.custo_completo,
        formula,
        d.faturamento,
        d.liquido,
        d.lucro,
        d.conv,
      ],
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A${currentRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    })

    console.log(
      `Dados adicionados na aba "${sheetName}" na linha ${currentRow}.`
    )
  }
}

// all_Camps()

const cron = require("node-cron")

cron.schedule("0 * * * *", () => {
  // cron.schedule("* * * * *", () => {
  // cron.schedule("*/5 * * * *", () => {
  all_Camps()

  setData = getDataHoje()

  agora = new Date()
  umaHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000)
  horaAtual = setData + "+" + formatHora(agora)
  horaAnterior = setData + "+" + formatHora(umaHoraAtras)
  horaRange = formatHora(umaHoraAtras) + "-" + formatHora(agora)

  camps = []
  fullData = []
  dados_cart = []
  completo = []
  conv = 0
})
