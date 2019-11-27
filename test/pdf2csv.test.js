var pdf2csv = require('./../pdf2csv');
var { test1 } = require('./intermediatRepresentation');
const {
  getElevation,
  generateElevationReducer,
  elevation2Column,
  generateCsvTextFromIndex2Column,
  getCoordinates,
} = pdf2csv;

describe('Tests for pdf2csv module', () => {
  test('getCoordinates should return start and end position of a string on x axis', () => {
    const xCordinates = getCoordinates({
      str: 'row1',
      width: 5.421,
      height: 9.75,
      transform: [9.75, 0, 0, 9.75, 542.25, 467.81624999999985],
    });
    expect(xCordinates.startX).toBe(542.25);
    expect(xCordinates.endX).toBe(542.25 + 5.421);
    expect(xCordinates.text).toBe('row1');
  });

  test('generateElevationReducer should should generate a elevation json based on coordinates and steps', () => {
    let elevation = generateElevationReducer(
      {},
      {
        startX: 542.25,
        endX: 547.671,
        text: 'row1',
      },
      0
    );
    expect(elevation[542.25].steps).toBe(1);
    expect(elevation[542.25].channel.length).toBe(1);
    elevation = pdf2csv.generateElevationReducer(
      elevation,
      {
        startX: 542.25,
        endX: 544.671,
        text: 'row2',
      },
      0
    );
    expect(elevation[542.25].steps).toBe(2);
    expect(elevation[544.671].steps).toBe(-1);
    expect(elevation[547.671].steps).toBe(-1);
    expect(elevation[542.25].channel.length).toBe(2);
  });
  test('generate csv from intermediat representation of table data', () => {
    const elevation = getElevation(test1);
    const { index2Column } = elevation2Column(elevation);
    const { text } = generateCsvTextFromIndex2Column(index2Column);
    expect(text).toMatchSnapshot();
  });
});
