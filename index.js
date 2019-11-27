var pdfjsLib = require('pdfjs-dist')
var fs = require('fs')

const X_POSITION = 4

export const getElevation = itemsInAllPages =>
  itemsInAllPages.reduce((acc, item, index) => {
    const elevation = acc
    const { transform, width, str } = item
    const startX = transform[X_POSITION]
    const endX = transform[X_POSITION] + width
    elevation[startX] = elevation[startX] || { steps: 0, channel: [] }
    elevation[startX].steps++
    elevation[startX].channel.push({ index, str })
    elevation[endX] = elevation[endX] || { steps: 0 }
    elevation[endX].steps--
    return acc
  }, {})

export const elevation2Column = elevation => {
  return Object.keys(elevation)
    .map(x => parseFloat(x))
    .sort((a, b) => (a > b ? 1 : -1))
    .reduce(
      (acc, xPosition) => {
        const { steps, channel } = elevation[xPosition]
        let { index2Column, column, height } = acc
        if (height === 0) {
          column++
        }
        height += steps
        channel &&
          channel.map(({ index, str }) => {
            index2Column[index] = { column, str }
          })
        return { index2Column, column, height }
      },
      { index2Column: [], column: 0, height: 0 }
    )
}

export const generateCsvTextFromIndex2Column = index2Column =>
  index2Column.reduce(
    (acc, { column, str }) => {
      let csvTextContent = acc.text
      const prevColumn = acc.prevColumn
      const diff = column - prevColumn
      if (diff < 0) {
        csvTextContent += '\n'
        for (let i = 1; i < column; i++) {
          csvTextContent += ','
        }
      } else if (diff === 0) {
        csvTextContent += ' '
      } else {
        for (let i = 0; i < diff; i++) {
          csvTextContent += ','
        }
      }
      csvTextContent += str
      return { text: csvTextContent, prevColumn: column }
    },
    { text: '', prevColumn: 1 }
  )

// Loading file from file system into typed array
var pdfPath = process.argv[2] || './pdfs/more-rows.pdf'
var csvPath = process.argv[3] || './csv/output.csv'

pdfjsLib.getDocument(pdfPath).promise.then(async function(doc) {
  var numPages = doc.numPages
  let itemsInAllPages = []

  for (let i = 1; i <= numPages; i++) {
    var page = await doc.getPage(i)
    const content = await page.getTextContent()
    content.items.map(x => itemsInAllPages.push(x))
  }

  const elevation = getElevation(itemsInAllPages)
  const { index2Column } = elevation2Column(elevation)
  const { text } = generateCsvTextFromIndex2Column(index2Column)
  fs.writeFile(csvPath, text)
})
