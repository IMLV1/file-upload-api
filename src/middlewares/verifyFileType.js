const fs = require('fs/promises');
const fileTypeModule = import('file-type');
const { ALLOWED } = require('./upload');
module.exports = async function verifyFileType(req, res, next) {
  const files = req.file ? [req.file] : req.files || [];
  try {
    for (const f of files) {
      let detected;
      try { detected = await (await fileTypeModule).fileTypeFromFile(f.path); }
      catch (err) { if (err.name !== 'EndOfStreamError') throw err; }
      if (!detected || !ALLOWED[detected.mime] || detected.mime !== f.mimetype) {
        await Promise.all(files.map((x) => fs.unlink(x.path).catch(() => {})));

        return res.status(415).json({ error: `เนื้อหาไฟล์ ${f.originalname} ไม่ตรงกับชนิดที่อนุญาต` });
      }
    }
   next();
  } catch (err) {
    await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
    next(err);
  }
};
