var defaultStyle = {};
defaultStyle[DocumentApp.Attribute.LINE_SPACING] = 1.0;
defaultStyle[DocumentApp.Attribute.SPACING_BEFORE] = 0;
defaultStyle[DocumentApp.Attribute.SPACING_AFTER] = 0;

var styLeft = {};
styLeft[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.LEFT;
var styCenter = {};
styCenter[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.CENTER;
var styRight = {};
styRight[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.RIGHT;

// Main function:
function main() {
  var result = UrlFetchApp.fetch("https://github.com/JamesDunne/eminor2/raw/master/v2/controller/flash_manager/setlist.json");
  var setlistData = JSON.parse(result.getContentText());

  generateSetlist(setlistData);
}

function setZeroMargin(style) {
  style[DocumentApp.Attribute.MARGIN_BOTTOM] = 0;
  style[DocumentApp.Attribute.MARGIN_LEFT] = 0;
  style[DocumentApp.Attribute.MARGIN_RIGHT] = 0;
  style[DocumentApp.Attribute.MARGIN_TOP] = 0;
}

function setZeroPadding(style) {
  style[DocumentApp.Attribute.PADDING_BOTTOM] = 0;
  style[DocumentApp.Attribute.PADDING_LEFT] = 0;
  style[DocumentApp.Attribute.PADDING_RIGHT] = 0;
  style[DocumentApp.Attribute.PADDING_TOP] = 0;
}

function newCell(row, text, style) {
  var cell = row.appendTableCell(text);
  cell.setAttributes(style);
  cell.getChild(0).setAttributes(defaultStyle);
  return cell;
}

function generateSetlist(sd) {
  // Create a new Google Doc named 'Hello, world!'
  var doc = DocumentApp.openByUrl("https://docs.google.com/document/d/1fxlTpBh1ztBa5ngESu1RObN7MRI7KV7EGqO6hOSVa2A/edit");
  //var doc = DocumentApp.create(sd.date);
  doc.setName(sd.date);

  var body = doc.getBody();
  body.clear();
  body.setAttributes(defaultStyle);

  // Define the header style:
  var styleHead = {};
  styleHead[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.CENTER;
  styleHead[DocumentApp.Attribute.FONT_FAMILY] = 'Verdana';
  styleHead[DocumentApp.Attribute.FONT_SIZE] = 21;
  styleHead[DocumentApp.Attribute.BOLD] = true;

  // Define the date style:
  var styleDate = {};
  styleDate[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.CENTER;
  styleDate[DocumentApp.Attribute.FONT_FAMILY] = 'Verdana';
  styleDate[DocumentApp.Attribute.FONT_SIZE] = 11;
  styleDate[DocumentApp.Attribute.BOLD] = true;

  var styHead = {};
  styHead[DocumentApp.Attribute.BORDER_WIDTH] = 1;
  styHead[DocumentApp.Attribute.FONT_FAMILY] = 'Verdana';
  styHead[DocumentApp.Attribute.FONT_SIZE] = 18;
  styHead[DocumentApp.Attribute.BOLD] = true;
  setZeroMargin(styHead);
  setZeroPadding(styHead);

  var styCell = [{},{},{}];
  styCell[0][DocumentApp.Attribute.FOREGROUND_COLOR] = '#000000';
  styCell[0][DocumentApp.Attribute.FONT_FAMILY] = 'Verdana';
  styCell[0][DocumentApp.Attribute.FONT_SIZE] = 18;
  styCell[0][DocumentApp.Attribute.BOLD] = false;
  styCell[0][DocumentApp.Attribute.WIDTH] = 18 * 2;
  setZeroMargin(styCell[0]);
  setZeroPadding(styCell[0]);

  styCell[1][DocumentApp.Attribute.FOREGROUND_COLOR] = '#000000';
  styCell[1][DocumentApp.Attribute.FONT_FAMILY] = 'Verdana';
  styCell[1][DocumentApp.Attribute.FONT_SIZE] = 18;
  styCell[1][DocumentApp.Attribute.BOLD] = true;
  styCell[1][DocumentApp.Attribute.WIDTH] = 18 * 20;
  setZeroMargin(styCell[1]);
  setZeroPadding(styCell[1]);

  styCell[2][DocumentApp.Attribute.FOREGROUND_COLOR] = '#000000';
  styCell[2][DocumentApp.Attribute.FONT_FAMILY] = 'Verdana';
  styCell[2][DocumentApp.Attribute.FONT_SIZE] = 18;
  styCell[2][DocumentApp.Attribute.BOLD] = false;
  styCell[2][DocumentApp.Attribute.WIDTH] = 18 * 8;
  setZeroMargin(styCell[2]);
  setZeroPadding(styCell[2]);

  var styCellBreak = [{},{},{}];
  styCellBreak[0][DocumentApp.Attribute.FOREGROUND_COLOR] = '#008800';
  styCellBreak[0][DocumentApp.Attribute.FONT_FAMILY] = 'Verdana';
  styCellBreak[0][DocumentApp.Attribute.FONT_SIZE] = 14;
  styCellBreak[0][DocumentApp.Attribute.BOLD] = true;
  setZeroMargin(styCellBreak[0]);
  setZeroPadding(styCellBreak[0]);

  styCellBreak[1][DocumentApp.Attribute.FOREGROUND_COLOR] = '#008800';
  styCellBreak[1][DocumentApp.Attribute.FONT_FAMILY] = 'Verdana';
  styCellBreak[1][DocumentApp.Attribute.FONT_SIZE] = 14;
  styCellBreak[1][DocumentApp.Attribute.BOLD] = true;
  setZeroMargin(styCellBreak[1]);
  setZeroPadding(styCellBreak[1]);

  styCellBreak[2][DocumentApp.Attribute.FOREGROUND_COLOR] = '#6aa84f';
  styCellBreak[2][DocumentApp.Attribute.FONT_FAMILY] = 'Verdana';
  styCellBreak[2][DocumentApp.Attribute.FONT_SIZE] = 14;
  styCellBreak[2][DocumentApp.Attribute.BOLD] = true;
  setZeroMargin(styCellBreak[2]);
  setZeroPadding(styCellBreak[2]);

  var para;
  para = body.getParagraphs()[0];
  para.setText('One In Ten');
  para.setAttributes(styleHead);
  para.setAttributes(defaultStyle);

  para = body.appendParagraph(sd.date);
  para.setAttributes(styleDate);
  
  // Start off the table with the right cell string data and dimensions:
  var table = body.appendTable();
  table.setBorderWidth(0);
  table.setAttributes(defaultStyle);

  var row = table.appendTableRow();
  row.setMinimumHeight(12);
  row.setAttributes(defaultStyle);

  var cell;
  cell = newCell(row, "##", styHead);
  cell = newCell(row, "Song", styHead);
  cell = newCell(row, "Who Starts?", styHead);

  for (var i = 0; i < sd.songs.length; i++) {
    var song = sd.songs[i];

    row = table.appendTableRow();
    row.setMinimumHeight(12);
    row.setAttributes(defaultStyle);

    if (song.breakText != undefined) {
      newCell(row, "", styCellBreak[0]);

      cell = newCell(row, song.breakText, styCellBreak[1]);
      cell.getChild(0).setAttributes(styRight);

      newCell(row, "", styCellBreak[2]);
      continue;
    }

    var index = song.i.toString();
    if (index.length < 2) index = "0" + index;

    cell = newCell(row, index, styCell[0]);
    cell.getChild(0).setAttributes(styCenter);
    cell = newCell(row, song.title, styCell[1]);
    cell.getChild(0).setAttributes(styLeft);
    cell = newCell(row, song.starts, styCell[2]);
    cell.getChild(0).setAttributes(styLeft);
  }
}

// Example data pulled from setlist.json URL above:
function sampleSetlistData() {
  return {
    "date": "2015-03-14",
    "songs": [
      {
        "i": 1,
        "title": "Dammit",
        "starts": "Jim"
      },
      {
        "i": 2,
        "title": "My Own Worst Enemy",
        "starts": "Jim"
      },
      {
        "i": 3,
        "title": "Song 2",
        "starts": "Bremer"
      },
      {
        "breakText": "BAND INTRO"
      },
      {
        "i": 4,
        "title": "Machinehead",
        "starts": "Jim"
      },
      {
        "i": 5,
        "title": "Hey Jealousy",
        "starts": "Bremer 4 ct"
      },
      {
        "i": 6,
        "title": "Buddy Holly",
        "starts": "Glaz+Bremer"
      },
      {
        "i": 7,
        "title": "Bullet With Butterfly Wings",
        "starts": "Glaz"
      },
      {
        "breakText": "BREAK"
      },
      {
        "i": 8,
        "title": "Cumbersome",
        "starts": "Jim"
      },
      {
        "i": 9,
        "title": "Hash Pipe",
        "starts": "Bremer+Adam"
      },
      {
        "i": 10,
        "title": "Zero",
        "starts": "Jim"
      },
      {
        "breakText": "TUNING"
      },
      {
        "i": 11,
        "title": "Plush",
        "starts": "Bremer 2 ct"
      },
      {
        "i": 12,
        "title": "Brainstew",
        "starts": "Jim"
      },
      {
        "i": 13,
        "title": "Everything Zen",
        "starts": "Glaz"
      },
      {
        "breakText": "TUNING"
      },
      {
        "i": 14,
        "title": "The Middle",
        "starts": "Glaz"
      },
      {
        "i": 15,
        "title": "Monkeywrench",
        "starts": "Bremer 4 ct"
      },
      {
        "i": 16,
        "title": "Lump",
        "starts": "Bremer+Glaz"
      },
      {
        "breakText": "TUNING"
      },
      {
        "i": 17,
        "title": "Counting Blue Cars",
        "starts": "Bremer 4 ct"
      },
      {
        "i": 18,
        "title": "Holiday",
        "starts": "Jim"
      },
      {
        "breakText": "GOODBYE"
      },
      {
        "i": 19,
        "title": "Enter Sandman",
        "starts": "Glaz"
      }
    ]
  };
}