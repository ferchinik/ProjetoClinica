const express = require('express');
const ExcelJS = require('exceljs');
const router = express.Router();
const { Relatorio } = require('../models'); 

router.get('/export', async (req, res) => {
  const rows = await Relatorio.findAll();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Relatórios');

  ws.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Data', key: 'data', width: 20 },
    { header: 'Cliente', key: 'cliente', width: 30 },
    { header: 'Valor', key: 'valor', width: 15 }
  ];
  rows.forEach(r => {
    ws.addRow({
      id:     r.id,
      data:   r.createdAt.toLocaleDateString(),
      cliente: r.clienteNome,
      valor:   r.valorTotal
    });
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="relatorios.xlsx"'
  );

  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;
