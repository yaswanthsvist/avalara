var pdfjsLib = require('pdfjs-dist')
var fs = require('fs')

const X_POSITION = 4
const Y_POSITION = 5
const gridColumnGap = 4
const lineSpacing = 3

const getCoordinates = item => {
  const { transform, width, height, str: text } = item
  const startX = transform[X_POSITION]
  const endX = transform[X_POSITION] + width
  const startY = transform[Y_POSITION]
  return { text, startX, endX, startY, height }
}

const generateElevationReducer = (
  acc,
  { startX, endX, text, height, startY },
  index
) => {
  acc[startX] = acc[startX] || { steps: 0, channel: [] }
  acc[startX].steps++
  acc[startX].channel.push({ index, text, startY, height })
  acc[endX] = acc[endX] || { steps: 0 }
  acc[endX].steps--
  return acc
}

const getElevation = itemsInAllPages =>
  itemsInAllPages.map(getCoordinates).reduce(generateElevationReducer, {})
const getColumns = elevation => (acc, xPosition) => {
  let { index2Column, column, columns, height } = acc
  let { columnEnd, columnStart } = columns[column] || {}
  if (!columnStart) {
    columnStart = xPosition
  }
  const { steps, channel } = elevation[xPosition]
  if (height + steps === 0) {
    columnEnd = xPosition
  }
  columns[column] = { columnEnd, columnStart }
  if (height === 0) {
    const gap = Math.round((xPosition - columnEnd) * 10) / 10
    if (gridColumnGap < gap) {
      column++
    }
  }
  height += steps
  channel &&
    channel.map(({ index, text, startY, height: fontHeight }) => {
      index2Column[index] = { column, text, startY, height: fontHeight }
    })
  return { index2Column, column, columns, height }
}
const elevation2Column = elevation =>
  Object.keys(elevation)
    .map(x => parseFloat(x))
    .sort((a, b) => (a > b ? 1 : -1))
    .reduce(getColumns(elevation), {
      index2Column: [],
      columns: [],
      column: 0,
      height: 0,
      prevHeight: Infinity,
    })

let sameColumn = []
const generateCsvTextFromIndex2Column = index2Column =>
  index2Column.reduce(
    (acc, { column, text, startY, height }, index) => {
      let csvTextContent = acc.text
      const { prevColumn, prevStartY } = acc
      let diff = column - prevColumn

      if (diff === 0 && prevStartY - startY - height > lineSpacing) {
        diff = -1
      }
      if (diff !== 0 && sameColumn.length > 0) {
        csvTextContent += '"' + sameColumn.join('\n') + '"'
        sameColumn = []
      }
      if (diff < 0) {
        csvTextContent += '\n'
        for (let i = 1; i <= column; i++) {
          csvTextContent += ','
        }
      } else if (diff !== 0) {
        for (let i = 0; i < diff; i++) {
          csvTextContent += ','
        }
      }

      if (diff === 0) {
        sameColumn.push(text)
      } else {
        if (sameColumn.length > 0)
          csvTextContent += '"' + sameColumn.join('\n') + '"'
        sameColumn = []
        sameColumn.push(text)
      }

      csvTextContent +=
        index2Column.length - 1 === index
          ? '"' + sameColumn.join('\n') + '"'
          : ''

      return { text: csvTextContent, prevColumn: column, prevStartY: startY }
    },
    { text: '', prevColumn: 1, prevY: 0, prevStartY: Infinity }
  )
const pdfTableToCsv = async (pdfPath, csvPath) => {
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
    fs.writeFile(csvPath, text, () => {
      console.log('PDF Table to csv conversion completed')
    })
  })
}

module.exports = {
  pdfTableToCsv,
  getElevation,
  generateElevationReducer,
  elevation2Column,
  generateCsvTextFromIndex2Column,
  getCoordinates,
}
