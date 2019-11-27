var pdfjsLib = require('pdfjs-dist');
var fs = require('fs');

const X_POSITION = 4;

const getCoordinates = item => {
  const { transform, width, str: text } = item;
  const startX = transform[X_POSITION];
  const endX = transform[X_POSITION] + width;
  return { text, startX, endX };
};

const generateElevationReducer = (acc, { startX, endX, text }, index) => {
  acc[startX] = acc[startX] || { steps: 0, channel: [] };
  acc[startX].steps++;
  acc[startX].channel.push({ index, text });
  acc[endX] = acc[endX] || { steps: 0 };
  acc[endX].steps--;
  return acc;
};

const getElevation = itemsInAllPages =>
  itemsInAllPages.map(getCoordinates).reduce(generateElevationReducer, {});

const elevation2Column = elevation => {
  return Object.keys(elevation)
    .map(x => parseFloat(x))
    .sort((a, b) => (a > b ? 1 : -1))
    .reduce(
      (acc, xPosition) => {
        const { steps, channel } = elevation[xPosition];
        let { index2Column, column, height } = acc;
        if (height === 0) {
          column++;
        }
        height += steps;
        channel &&
          channel.map(({ index, text }) => {
            index2Column[index] = { column, text };
          });
        return { index2Column, column, height };
      },
      { index2Column: [], column: 0, height: 0 }
    );
};

const generateCsvTextFromIndex2Column = index2Column =>
  index2Column.reduce(
    (acc, { column, text }, index) => {
      let csvTextContent = acc.text;
      const prevColumn = acc.prevColumn;
      const diff = column - prevColumn;
      if (diff < 0) {
        csvTextContent += '\n';
        for (let i = 1; i < column; i++) {
          csvTextContent += ',';
        }
      } else if (diff === 0) {
        csvTextContent += index === 0 ? '' : ' ';
      } else {
        for (let i = 0; i < diff; i++) {
          csvTextContent += ',';
        }
      }
      csvTextContent += text;
      return { text: csvTextContent, prevColumn: column };
    },
    { text: '', prevColumn: 1 }
  );

const pdfTableToCsv = async (pdfPath, csvPath) => {
  pdfjsLib.getDocument(pdfPath).promise.then(async function(doc) {
    var numPages = doc.numPages;
    let itemsInAllPages = [];

    for (let i = 1; i <= numPages; i++) {
      var page = await doc.getPage(i);
      const content = await page.getTextContent();
      content.items.map(x => itemsInAllPages.push(x));
    }
    const elevation = getElevation(itemsInAllPages);
    const { index2Column } = elevation2Column(elevation);
    const { text } = generateCsvTextFromIndex2Column(index2Column);
    fs.writeFile(csvPath, text, () => {
      console.log('PDF Table to csv conversion completed');
    });
  });
};

module.exports = {
  pdfTableToCsv,
  getElevation,
  generateElevationReducer,
  elevation2Column,
  generateCsvTextFromIndex2Column,
  getCoordinates,
};
