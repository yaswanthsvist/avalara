const pdfjsLib = require('pdfjs-dist')
var fs = require('fs')

function PDFTableToCSV(pdfPath, csvPath) {
  this.X_POSITION = 4
  this.Y_POSITION = 5
  this.gridColumnGap = 4
  this.lineSpacing = 3
  this.pdfPath = pdfPath
  this.csvPath = csvPath
}

const getCoordinates = function(item) {
  const { transform, width, height, str: text } = item
  const startX = transform[this.X_POSITION]
  const endX = transform[this.X_POSITION] + width
  const startY = transform[this.Y_POSITION]
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

const getElevation = function(itemsInAllPages) {
  const self = this
  return itemsInAllPages
    .map(self.getCoordinates.bind(self))
    .reduce(generateElevationReducer, {})
}

const getColumns = function(elevation) {
  const self = this
  return (acc, xPosition) => {
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
      if (self.gridColumnGap < gap) {
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
}

const elevation2Column = function(elevation) {
  return Object.keys(elevation)
    .map(x => parseFloat(x))
    .sort((a, b) => (a > b ? 1 : -1))
    .reduce(this.getColumns(elevation), {
      index2Column: [],
      columns: [],
      column: 0,
      height: 0,
      prevHeight: Infinity,
    })
}

const generateCsvTextFromIndex2Column = function(index2Column) {
  const self = this
  let sameColumn = []
  return index2Column.reduce(
    (acc, { column, text, startY, height }, index) => {
      let { prevColumn, prevStartY, csvTextContent } = acc
      let diff = column - prevColumn
      if (diff === 0 && prevStartY - startY - height > self.lineSpacing) {
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

      return { csvTextContent, prevColumn: column, prevStartY: startY }
    },
    { csvTextContent: '', prevColumn: 1, prevY: 0, prevStartY: Infinity }
  )
}
const getItemsInAllPages = async function() {
  return new Promise(async (resolve, reject) =>
    pdfjsLib.getDocument(this.pdfPath).promise.then(async function(doc) {
      var numPages = doc.numPages
      let itemsInAllPages = []

      for (let i = 1; i <= numPages; i++) {
        var page = await doc.getPage(i)
        const content = await page.getTextContent()
        content.items.map(x => itemsInAllPages.push(x))
      }
      resolve(itemsInAllPages)
    }, reject)
  )
}
const getTextFromItems = function(itemsInAllPages) {
  const elevation = this.getElevation(itemsInAllPages)
  const { index2Column } = this.elevation2Column(elevation)
  const { csvTextContent } = this.generateCsvTextFromIndex2Column(index2Column)
  return csvTextContent
}
const writeTextToCSVFile = function(text) {
  return new Promise((resolve, reject) => {
    fs &&
      fs.writeFile(this.csvPath, text, err => {
        if (err) reject(err)
        resolve(true)
      })
  })
}

const convert = async function() {
  const itemsInAllPages = await this.getItemsInAllPages()
  const text = this.getTextFromItems(itemsInAllPages)
  return await this.writeTextToCSVFile(text)
}

Object.assign(PDFTableToCSV.prototype, {
  convert,
  getElevation,
  getItemsInAllPages,
  getTextFromItems,
  getColumns,
  writeTextToCSVFile,
  generateElevationReducer,
  elevation2Column,
  generateCsvTextFromIndex2Column,
  getCoordinates,
})
module.exports = PDFTableToCSV
