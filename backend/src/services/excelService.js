const { Readable } = require('stream');
const ExcelJS = require('exceljs');
const ApiError = require('../utils/ApiError');

/** Header names are normalised so "Reg No", "reg_no" and "REGNO" all match. */
function normaliseHeader(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Flattens the value types exceljs can hand back into a plain string/number. */
function cellValue(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    // Formulas, hyperlinks and rich text all expose their display text here.
    if (value.text !== undefined) return value.text;
    if (value.result !== undefined) return value.result;
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join('');
    if (value.hyperlink !== undefined) return value.hyperlink;
    return '';
  }
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Reads the first worksheet of an uploaded .xlsx/.xls/.csv buffer into plain
 * objects keyed by normalised header name.
 */
async function parseSheet(buffer, filename = '') {
  const workbook = new ExcelJS.Workbook();

  try {
    if (/\.csv$/i.test(filename)) {
      await workbook.csv.read(Readable.from(buffer));
    } else {
      await workbook.xlsx.load(buffer);
    }
  } catch (err) {
    throw ApiError.badRequest('The uploaded file could not be read as a spreadsheet');
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw ApiError.badRequest('The spreadsheet has no worksheets');

  const headerRow = worksheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = normaliseHeader(cellValue(cell.value));
  });

  if (!headers.filter(Boolean).length) {
    throw ApiError.badRequest('The first row of the spreadsheet must contain column headings');
  }

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // heading row

    const record = { __row: rowNumber };
    let hasValue = false;

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = headers[colNumber];
      if (!key) return;
      const value = cellValue(cell.value);
      record[key] = value;
      if (value !== '') hasValue = true;
    });

    if (hasValue) rows.push(record);
  });

  return rows;
}

/** Picks the first present value among several accepted column spellings. */
function pick(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return undefined;
}

/**
 * Maps spreadsheet rows to student payloads, collecting per-row errors rather
 * than failing the whole import on one bad line.
 */
function mapStudentRows(rows) {
  const valid = [];
  const errors = [];

  for (const row of rows) {
    const rowNumber = row.__row;
    const regNo = pick(row, 'regno', 'registrationno', 'registrationnumber', 'regnumber');
    const name = pick(row, 'name', 'studentname', 'fullname');
    const email = pick(row, 'email', 'emailaddress');

    if (!regNo) {
      errors.push({ row: rowNumber, message: 'Missing registration number' });
      continue;
    }
    if (!name) {
      errors.push({ row: rowNumber, message: `Missing name for ${regNo}` });
      continue;
    }

    const cleanReg = String(regNo).trim().toUpperCase();
    const batch = pick(row, 'batch', 'year');

    valid.push({
      regNo: cleanReg,
      name: String(name).trim(),
      email: email
        ? String(email).trim().toLowerCase()
        : `${cleanReg.replace(/[^a-z0-9]/gi, '').toLowerCase()}@stu.vau.ac.lk`,
      department: pick(row, 'department', 'dept'),
      batch: batch !== undefined ? String(batch) : undefined
    });
  }

  return { valid, errors };
}

/** Maps spreadsheet rows to computer payloads for bulk lab setup. */
function mapComputerRows(rows) {
  const valid = [];
  const errors = [];

  for (const row of rows) {
    const pcNumber = pick(row, 'pcnumber', 'pcno', 'pc', 'computer', 'computernumber');

    if (!pcNumber) {
      errors.push({ row: row.__row, message: 'Missing PC number' });
      continue;
    }

    valid.push({
      pcNumber: String(pcNumber).trim().toUpperCase(),
      hostname: pick(row, 'hostname', 'host', 'computername'),
      ipAddress: pick(row, 'ipaddress', 'ip'),
      macAddress: pick(row, 'macaddress', 'mac'),
      specs: {
        cpu: pick(row, 'cpu', 'processor'),
        ramGb: Number(pick(row, 'ramgb', 'ram')) || undefined,
        storageGb: Number(pick(row, 'storagegb', 'storage', 'disk')) || undefined,
        os: pick(row, 'os', 'operatingsystem')
      }
    });
  }

  return { valid, errors };
}

/** Builds an .xlsx buffer from row objects, used by the report export endpoint. */
async function buildWorkbook(rows, sheetName = 'Report') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SmartLab Guardian';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(String(sheetName).replace(/[\\/*?:[\]]/g, '-').slice(0, 31));

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  worksheet.columns = columns.map((key) => ({
    header: key,
    key,
    width: Math.min(Math.max(key.length + 4, 12), 40)
  }));
  worksheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    worksheet.addRow(row);
  }

  return workbook.xlsx.writeBuffer();
}

module.exports = { parseSheet, mapStudentRows, mapComputerRows, buildWorkbook, pick };
