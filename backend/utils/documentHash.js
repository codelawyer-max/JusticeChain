const crypto = require('crypto');

const calculateSHA256 = (buffer) => {
    return crypto
        .createHash('sha256')
        .update(buffer)
        .digest('hex');
};

module.exports = {
    calculateSHA256
};