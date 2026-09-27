const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const axios = require('axios');
const { ethers } = require('ethers');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PINATA_API_KEY = process.env.PINATA_API_KEY || '';
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY || '';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const RPC_URL = process.env.RPC_URL || '';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const PORT = process.env.PORT || 3000;

let abi = [];
try {
    abi = JSON.parse(fs.readFileSync(path.join(__dirname, 'JusticeChainABI.json'), 'utf8'));
} catch (e) {
    console.warn('JusticeChainABI.json not found or invalid - blockchain features will be disabled until ABI is provided.');
}

const COMPLAINT_CONTRACT_ADDRESS = process.env.COMPLAINT_CONTRACT_ADDRESS || '0xe7e1B7d34F9397059c388aF75138C29Ff42Bf6Fd';
let complaintAbi = [];
try {
    complaintAbi = JSON.parse(fs.readFileSync(path.join(__dirname, 'ComplaintABI.json'), 'utf8'));
} catch (e) {
    console.warn('ComplaintABI.json not found or invalid - complaint features will be disabled until ABI is provided.');
}

// Document registry contract config (new)
const DOCUMENT_CONTRACT_ADDRESS = process.env.DOCUMENT_CONTRACT_ADDRESS || '';
let documentAbi = [];
try {
    documentAbi = JSON.parse(fs.readFileSync(path.join(__dirname, 'DocumentRegistryABI.json'), 'utf8'));
} catch (e) {
    console.warn('DocumentRegistryABI.json not found or invalid - document anchoring will be disabled until ABI is provided.');
}

let provider = null;
let wallet = null;
let contract = null;
let complaintContract = null;
let documentContract = null; // new

// Initialize provider / wallet / contracts with defensive error handling so the server can still start
try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    if (CONTRACT_ADDRESS && abi && abi.length > 0) {
        contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
        console.log('JusticeChain contract initialized at', CONTRACT_ADDRESS);
    } else {
        console.warn('JusticeChain contract not initialized (ABI or address missing).');
    }

    if (COMPLAINT_CONTRACT_ADDRESS && complaintAbi && complaintAbi.length > 0) {
        complaintContract = new ethers.Contract(COMPLAINT_CONTRACT_ADDRESS, complaintAbi, wallet);
        console.log('Complaint contract initialized at', COMPLAINT_CONTRACT_ADDRESS);
    } else {
        console.log('Complaint contract not initialized (ABI or address missing).');
    }

    if (DOCUMENT_CONTRACT_ADDRESS && documentAbi && documentAbi.length > 0) {
        documentContract = new ethers.Contract(DOCUMENT_CONTRACT_ADDRESS, documentAbi, wallet);
        console.log('DocumentRegistry contract initialized at', DOCUMENT_CONTRACT_ADDRESS);
    } else {
        console.warn('DocumentRegistry contract not initialized (ABI or address missing).');
    }
} catch (initErr) {
    console.error('Error initializing blockchain provider/wallet/contracts:', initErr && initErr.message ? initErr.message : initErr);
    // Keep contract variables null and allow the HTTP server to start so health checks and actionable errors work.
}

app.get('/', (req, res) => {
    res.json({ success: true, message: 'JusticeChain Backend Running' });
});

// Health check endpoint: returns server + provider status
app.get('/health', async (req, res) => {
    const status = {
        server: true,
        port: PORT,
        provider: null,
        contractLoaded: !!contract,
        complaintContractLoaded: !!complaintContract,
        documentContractLoaded: !!documentContract
    };
    if (provider) {
        try {
            // quick provider check
            const block = await provider.getBlockNumber();
            status.provider = { ok: true, latestBlock: block };
        } catch (provErr) {
            status.provider = { ok: false, error: provErr && provErr.message ? provErr.message : String(provErr) };
        }
    } else {
        status.provider = { ok: false, error: 'No provider configured' };
    }

    return res.json({ success: true, status });
});

// Anchor a document's hash on-chain (new)
app.post('/api/anchorDocument', async (req, res) => {
    try {
        const { documentId, sha256Hash, ipfsHash } = req.body || {};

        if (!documentId || !sha256Hash) {
            return res.status(400).json({
                success: false,
                error: 'documentId and sha256Hash are required'
            });
        }

        if (!documentContract) {
            return res.status(500).json({
                success: false,
                error: 'DocumentRegistry contract not configured on backend'
            });
        }

        console.log('Anchoring document on-chain:', documentId);

        const tx = await documentContract.anchorDocument(
            documentId,
            sha256Hash,
            ipfsHash || ''
        );

        const receipt = await tx.wait();
        console.log('anchorDocument tx mined:', receipt.hash);

        return res.json({
            success: true,
            message: 'Document anchored on blockchain',
            txHash: receipt.hash
        });

    } catch (err) {
        console.error('Error anchoring document on chain:', err && err.message ? err.message : err);
        return res.status(500).json({
            success: false,
            error: err && err.message ? err.message : String(err)
        });
    }
});

// Look up an anchored document's on-chain record (new)
app.get('/api/verifyDocument/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;

        if (!documentContract) {
            return res.status(500).json({
                success: false,
                error: 'DocumentRegistry contract not configured on backend'
            });
        }

        const isAnchored = await documentContract.isAnchored(documentId);

        if (!isAnchored) {
            return res.status(404).json({
                success: false,
                message: 'Document not found on-chain'
            });
        }

        const result = await documentContract.getDocument(documentId);

        return res.json({
            success: true,
            documentId,
            sha256Hash: result.sha256Hash,
            ipfsHash: result.ipfsHash,
            anchoredBy: result.anchoredBy,
            timestamp: result.timestamp.toString()
        });

    } catch (err) {
        console.error('Error verifying document on chain:', err && err.message ? err.message : err);
        return res.status(500).json({
            success: false,
            error: err && err.message ? err.message : String(err)
        });
    }
});

app.post('/api/uploadFIR', async (req, res) => {
    try {
        console.log('Received FIR Data:', req.body);

        const firData = req.body || {};

        // AI classification (fast, local — keep blocking)
        let severity = 3;
        try {
            const airesponse = await axios.post('http://localhost:5050/classify', { description: firData.incidentDescription || '' });
            const priority = (airesponse.data && airesponse.data.priority || '').toString().toLowerCase();
            if (priority === 'high') severity = 3;
            else if (priority === 'medium') severity = 2;
            else severity = 1;
        } catch (AIerror) {
            console.warn('classification failed, setting severity to 1');
            severity = 1;
        }

        // Pinata upload (fast — keep blocking, already has 10s timeout)
        let ipfsHash = null;
        try {
            const pinataResponse = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', { ...firData, severity }, {
                headers: {
                    'Content-Type': 'application/json',
                    pinata_api_key: PINATA_API_KEY,
                    pinata_secret_api_key: PINATA_SECRET_API_KEY,
                },
                timeout: 10000,
            });
            ipfsHash = pinataResponse.data && pinataResponse.data.IpfsHash;
            console.log('Pinata upload successful:', ipfsHash);
        } catch (pinataErr) {
            console.warn('Pinata upload failed:', pinataErr && pinataErr.message ? pinataErr.message : pinataErr);
            ipfsHash = firData.ipfsHash || 'ipfs_pending_' + Date.now();
        }

        const citizenAddress = firData.citizenAddress || firData.walletAddress || firData.toAddress;
        if (!citizenAddress) {
            return res.status(400).json({ success: false, message: 'Error uploading FIR', error: 'citizen wallet address required in payload (citizenAddress)' });
        }

        const metadataUri = `ipfs://${ipfsHash}`;

        if (!contract || typeof contract.mintFir !== 'function') {
            return res.status(500).json({ success: false, message: 'Error uploading FIR', error: 'Contract ABI does not contain mintFir method' });
        }

        // ── Submit mintFir transaction (DO NOT await confirmation) ──
        console.log('Submitting mintFir transaction...');
        const tx = await contract.mintFir(
            citizenAddress,
            firData.incidentType || firData.title || 'Untitled FIR',
            firData.incidentDescription || firData.description || 'No description',
            severity,
            ipfsHash,
            metadataUri
        );
        const txHash = tx.hash;
        console.log('mintFir submitted, txHash:', txHash);

        // Respond immediately — don't make the caller wait for block confirmation
        res.json({ success: true, message: 'FIR submitted to blockchain (pending confirmation)', ipfsHash, txHash, tokenId: null, pending: true });

        // ── Confirm in background (non-blocking) ──
        tx.wait().then(receipt => {
            console.log('mintFir confirmed in block:', receipt.blockNumber, 'txHash:', receipt.hash);

            // Also fire fileComplaint in background after mint confirms
            if (complaintContract && typeof complaintContract.fileComplaint === 'function') {
                complaintContract.fileComplaint(
                    firData.incidentType || firData.title || 'Untitled FIR',
                    firData.incidentDate || new Date().toISOString().split('T')[0],
                    firData.incidentTime || new Date().toTimeString().split(' ')[0],
                    firData.incidentLocation || firData.location || 'Location not specified',
                    firData.incidentDescription || firData.description || 'No description',
                    firData.suspectDetails || 'No suspect details',
                    firData.witnessDetails || 'No witness details',
                    firData.evidenceDescription || 'No evidence description'
                ).then(cTx => cTx.wait()).then(() => {
                    console.log('fileComplaint confirmed on chain.');
                }).catch(err => {
                    console.warn('fileComplaint background error:', err && err.message ? err.message : err);
                });
            }
        }).catch(err => {
            console.error('mintFir confirmation error:', err && err.message ? err.message : err);
        });

    } catch (error) {
        console.error('Error uploading FIR:', error && error.message ? error.message : error);
        return res.status(500).json({ success: false, message: 'Error uploading FIR', error: error && error.message ? error.message : String(error) });
    }
});

app.post('/api/fileComplaint', async (req, res) => {
    try {
        if (!complaintContract) {
            return res.status(500).json({ success: false, error: 'Complaint contract not configured' });
        }

        const data = req.body || {};

        const incidentType = data.incidentType || '';
        const incidentDate = data.incidentDate || '';
        const incidentTime = data.incidentTime || '';
        const incidentLocation = data.incidentLocation || data.location || '';
        const incidentDescription = data.incidentDescription || data.description || '';
        const suspectDetails = data.suspectDetails || '';
        const witnessDetails = data.witnessDetails || '';
        const evidenceDescription = data.evidenceDescription || '';

        const tx = await complaintContract.fileComplaint(
            incidentType,
            incidentDate,
            incidentTime,
            incidentLocation,
            incidentDescription,
            suspectDetails,
            witnessDetails,
            evidenceDescription
        );

        await tx.wait();

        return res.json({ success: true, message: 'Complaint filed on chain', txHash: tx.hash });
    } catch (err) {
        console.error('Error filing complaint on chain:', err && err.message ? err.message : err);
        return res.status(500).json({ success: false, error: err && err.message ? err.message : String(err) });
    }
});

// Close (burn) an existing FIR NFT by tokenId (only backend wallet/police allowed)
app.post('/api/closeFIR', async (req, res) => {
    try {
        const { tokenId } = req.body || {};
        if (!tokenId) return res.status(400).json({ success: false, error: 'tokenId required' });

        if (!contract) {
            return res.status(500).json({ success: false, error: 'JusticeChain contract not configured on backend' });
        }

        console.log('Closing FIR tokenId:', tokenId);
        const tx = await contract.closeFir(tokenId);
        const receipt = await tx.wait();
        console.log('closeFir tx mined:', receipt.transactionHash);

        return res.json({ success: true, message: 'FIR closed (burned)', txHash: receipt.transactionHash });
    } catch (err) {
        console.error('Error closing FIR on chain:', err && err.message ? err.message : err);
        return res.status(500).json({ success: false, error: err && err.message ? err.message : String(err) });
    }
});

// ── Document anchoring ────────────────────────────────────────────────────────
app.post('/api/anchorDocument', async (req, res) => {
    try {
        if (!wallet || !provider) {
            return res.status(503).json({
                success: false,
                error: 'Blockchain wallet not configured — check PRIVATE_KEY and RPC_URL'
            });
        }

        const { documentId, sha256Hash, ipfsHash, officerAddress } = req.body || {};

        if (!documentId || !sha256Hash) {
            return res.status(400).json({
                success: false,
                error: 'documentId and sha256Hash are required'
            });
        }

        const anchorPayload = {
            v: 1,
            type: 'DOC_ANCHOR',
            docId:    documentId,
            sha256:   sha256Hash,
            ipfsHash: ipfsHash   || null,
            officer:  officerAddress || wallet.address,
            ts:       Math.floor(Date.now() / 1000)
        };

        const payloadHex = '0x' + Buffer.from(
            JSON.stringify(anchorPayload), 'utf8'
        ).toString('hex');

        console.log(`[Anchor] Anchoring document ${documentId} on-chain…`);

        const tx = await wallet.sendTransaction({
            to:    wallet.address,
            value: 0n,
            data:  payloadHex
        });

        console.log(`[Anchor] tx sent: ${tx.hash} — waiting for confirmation…`);
        const receipt = await tx.wait(1);
        console.log(`[Anchor] confirmed in block ${receipt.blockNumber}`);

        return res.json({
            success:     true,
            txHash:      receipt.hash,
            blockNumber: receipt.blockNumber,
            anchoredAt:  new Date().toISOString(),
            payload:     anchorPayload
        });

    } catch (err) {
        console.error('[Anchor] anchorDocument error:', err && err.message ? err.message : err);
        return res.status(500).json({
            success: false,
            error:   err && err.message ? err.message : String(err)
        });
    }
});

const server = app.listen(PORT, () => {
    console.log(`JusticeChain Backend running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\x1b[31m[ERROR] Port ${PORT} is already in use by another running process.\x1b[0m`);
    } else {
        console.error('Server error:', err);
    }
});
