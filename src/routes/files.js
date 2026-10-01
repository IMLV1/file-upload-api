const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const { upload, UPLOAD_DIR } = require('../middlewares/upload');
const verifyFileType = require('../middlewares/verifyFileType');
const router = express.Router();

const toDto = (req, f) => ({
	filename: f.filename,
	originalName: f.originalname,
	mimetype: f.mimetype,
	size: f.size,
	url: `${req.protocol}://${req.get('host')}/api/files/${f.filename}`,
});

const safePath = (name) => path.join(UPLOAD_DIR, path.basename(name));

router.param('filename', (req, res, next, name) => {
	if (name !== path.basename(name) || /[\\/:]/.test(name) || name === '.' || name === '..') {
		return res.status(400).json({ error: 'ชื่อไฟล์ไม่ถูกต้อง' });
	}
	next();
});

// อัปโหลดไฟล์เดียว
router.post('/', upload.single('file'), verifyFileType, (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: 'กรุณาแนบไฟล์ในฟิลด์ file' });
	}

	res.status(201).json(toDto(req, req.file));
});

// อัปโหลดหลายไฟล์
router.post('/multiple', upload.array('files', 5), verifyFileType, (req, res) => {
	if (!req.files?.length) {
		return res.status(400).json({ error: 'กรุณาแนบไฟล์ในฟิลด์ files' });
	}

	res.status(201).json({
		count: req.files.length,
		files: req.files.map((f) => toDto(req, f)),
	});
});

// รายการไฟล์
router.get('/', async (req, res, next) => {
	try {
		const names = await fs.readdir(UPLOAD_DIR);
		const files = await Promise.all(
			names.map(async (name) => {
				const stat = await fs.stat(safePath(name));
				return { filename: name, size: stat.size, uploadedAt: stat.birthtime };
			})
		);

		res.json(files);
	} catch (err) {
		next(err);
	}
});

// ดาวน์ โหลด
router.get('/:filename', (req, res, next) => {
	res.download(safePath(req.params.filename), (err) => {
		if (err && !res.headersSent) {
			if (err.code === 'ENOENT') {
				return res.status(404).json({ error: 'ไม่พบไฟล์' });
			}

			next(err);
		}
	});
});

// ลบ
router.delete('/:filename', async (req, res, next) => {
	try {
		await fs.unlink(safePath(req.params.filename));
		res.status(204).end();
	} catch (err) {
		if (err.code === 'ENOENT') {
			return res.status(404).json({ error: 'ไม่พบไฟล์' });
		}

		next(err);
	}
});

module.exports = router;
