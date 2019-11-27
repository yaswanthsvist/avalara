const pdf2csv = require('./pdf2csv');

var pdfPath = process.argv[2] || './pdfs/test.pdf';
var csvPath = process.argv[3] || './csv/output.csv';

pdf2csv.pdfTableToCsv(pdfPath, csvPath);
