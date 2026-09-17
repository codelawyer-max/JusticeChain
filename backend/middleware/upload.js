const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',

        'image/jpeg',
        'image/png',
        'image/webp',

        'audio/mpeg',
        'audio/wav',

        'video/mp4',
        'video/webm',

        'text/plain',

        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                'Unsupported file type. Please upload a supported document, image, audio or video file.'
            ),
            false
        );
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024
    }
});

module.exports = upload;