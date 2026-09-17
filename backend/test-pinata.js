const { Readable } = require('stream');

const fileStream = Readable.from(req.file.buffer);

const pinataOptions = {
    pinataMetadata: {
        name: req.file.originalname,

        keyvalues: {
            system: 'JusticeChain',
            type: 'legal-document',
            documentHash: sha256Hash
        }
    },

    pinataOptions: {
        cidVersion: 1
    }
};

const uploadResult = await pinata.pinFileToIPFS(
    fileStream,
    pinataOptions
);