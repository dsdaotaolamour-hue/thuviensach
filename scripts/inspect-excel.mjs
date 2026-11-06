import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {inspectWorkbook} from '../server/excel.mjs';
const report=await inspectWorkbook(await readFile('tests/fixtures/Book1_hoanchinh.xlsx'));
await mkdir('docs',{recursive:true});
await writeFile('docs/excel-original-schema.json',JSON.stringify(report,null,2));
console.log('Đã kiểm tra',report.sheets.length,'sheet; SHA256',report.sha256);
