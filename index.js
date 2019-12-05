const PDFTableToCSV = require('./pdf2csv')

var pdfPath = process.argv[2] || './pdfs/tests.pdf'
var csvPath = process.argv[3] || './csv/output.csv'
pdf2csv = new PDFTableToCSV(pdfPath, csvPath)
pdf2csv.convert(pdfPath, csvPath).then(
  success => {
    if (success) console.log('Successfully converted PDF Table to csv !')
  },
  err => {
    console.log({ error: err })
  }
)
