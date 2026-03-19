const express = require('express');
const router = express.Router();
const multer = require('multer');
const Tesseract = require('tesseract.js');
const Certificate = require('../models/Certificate');
const TeamMember = require('../models/TeamMember');

// ─── Multer setup (memory storage) ─────────────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only PNG, JPG, and PDF files are allowed'));
    }
});

// ─── Helper: Extract skills from OCR text ───────────────────────────
function extractCertData(rawText) {
    const text = rawText || '';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Try to find certification name (first substantial line)
    let certName = '';
    for (const line of lines) {
        if (line.length > 5 && line.length < 150 && !/^(this|date|issued|verify)/i.test(line)) {
            certName = line;
            break;
        }
    }

    // Known skill keywords to look for
    const skillKeywords = [
        'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'rust', 'ruby', 'php', 'swift',
        'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring',
        'html', 'css', 'sass', 'tailwind', 'bootstrap',
        'mongodb', 'mysql', 'postgresql', 'redis', 'elasticsearch', 'sql',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
        'machine learning', 'deep learning', 'ai', 'data science', 'nlp',
        'devops', 'ci/cd', 'git', 'agile', 'scrum',
        'figma', 'photoshop', 'ui/ux', 'design', 'frontend', 'backend', 'full stack',
        'testing', 'qa', 'selenium', 'cypress', 'jest',
        'security', 'networking', 'linux', 'cloud', 'microservices', 'api'
    ];

    const textLower = text.toLowerCase();
    const skills = skillKeywords.filter(s => textLower.includes(s));

    // Try to find issuer
    let issuer = '';
    const issuerPatterns = [/issued\s*by[:\s]+(.+)/i, /awarded\s*by[:\s]+(.+)/i, /from[:\s]+(.+)/i, /organization[:\s]+(.+)/i];
    for (const pattern of issuerPatterns) {
        const match = text.match(pattern);
        if (match) { issuer = match[1].trim().slice(0, 100); break; }
    }

    // Try to find date
    let completionDate = '';
    const datePatterns = [
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
        /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{2,4})/i,
        /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/
    ];
    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) { completionDate = match[1].trim(); break; }
    }

    return { certName, skills: [...new Set(skills)], issuer, completionDate, rawText: text.slice(0, 2000) };
}

// ─── Upload certificate ────────────────────────────────────────────
router.post('/upload/:memberId', upload.single('certificate'), async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.memberId);
        if (!member) return res.status(404).json({ message: 'Member not found' });
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        // Create certificate record
        const cert = new Certificate({
            memberId: req.params.memberId,
            fileName: req.file.originalname,
            fileData: req.file.buffer,
            mimeType: req.file.mimetype,
            status: 'pending'
        });
        await cert.save();

        // Run OCR asynchronously
        let extractedData = { certName: '', skills: [], issuer: '', completionDate: '', rawText: '' };
        try {
            if (req.file.mimetype.startsWith('image/')) {
                const result = await Tesseract.recognize(req.file.buffer, 'eng', {
                    logger: () => {} // suppress logs
                });
                extractedData = extractCertData(result.data.text);
            } else {
                // For PDFs, we can only do basic extraction
                extractedData.rawText = 'PDF file uploaded — manual review recommended';
                extractedData.certName = req.file.originalname.replace(/\.[^.]+$/, '');
            }

            cert.extractedData = extractedData;
            cert.status = 'processed';
            await cert.save();

            // Add extracted skills to member profile
            if (extractedData.skills.length > 0) {
                const existingSkillNames = (member.skills || []).map(s => s.name.toLowerCase());
                const newSkills = extractedData.skills
                    .filter(s => !existingSkillNames.includes(s.toLowerCase()))
                    .map(s => ({ name: s, level: 'intermediate', source: 'certificate', verifiedDate: new Date() }));

                if (newSkills.length > 0) {
                    await TeamMember.findByIdAndUpdate(req.params.memberId, {
                        $push: { skills: { $each: newSkills }, certificates: cert._id }
                    });
                } else {
                    await TeamMember.findByIdAndUpdate(req.params.memberId, {
                        $push: { certificates: cert._id }
                    });
                }
            } else {
                await TeamMember.findByIdAndUpdate(req.params.memberId, {
                    $push: { certificates: cert._id }
                });
            }
        } catch (ocrErr) {
            cert.status = 'failed';
            cert.extractedData = { rawText: 'OCR failed: ' + ocrErr.message };
            await cert.save();
        }

        res.status(201).json({
            certificate: {
                _id: cert._id,
                fileName: cert.fileName,
                mimeType: cert.mimeType,
                status: cert.status,
                extractedData: cert.extractedData,
                uploadedAt: cert.uploadedAt
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── Get certificates for a member ─────────────────────────────────
router.get('/:memberId', async (req, res) => {
    try {
        const certs = await Certificate.find(
            { memberId: req.params.memberId },
            { fileData: 0 } // exclude binary data
        ).sort({ uploadedAt: -1 });
        res.json(certs);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Get certificate image/file ─────────────────────────────────────
router.get('/file/:certId', async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.certId);
        if (!cert) return res.status(404).json({ message: 'Certificate not found' });
        res.set('Content-Type', cert.mimeType);
        res.send(cert.fileData);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Delete a certificate ───────────────────────────────────────────
router.delete('/:certId', async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.certId);
        if (!cert) return res.status(404).json({ message: 'Certificate not found' });

        // Remove skills added by this certificate
        const member = await TeamMember.findById(cert.memberId);
        if (member) {
            const certSkills = cert.extractedData?.skills || [];
            const updatedSkills = (member.skills || []).filter(s =>
                !(s.source === 'certificate' && certSkills.includes(s.name.toLowerCase()))
            );
            await TeamMember.findByIdAndUpdate(cert.memberId, {
                skills: updatedSkills,
                $pull: { certificates: cert._id }
            });
        }

        await Certificate.findByIdAndDelete(req.params.certId);
        res.json({ message: 'Certificate deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
