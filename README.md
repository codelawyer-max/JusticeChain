# JusticeChain – DLT-Based Legal Document Integrity

**Smart India Hackathon 2026 · Problem Statement 26190 · Team CodeMonks**
Secure Digital Document Management System for Legal and Investigation Documents (Blockchain & Cybersecurity)

🔗 **Live prototype:** https://justice-chain-eight.vercel.app/
> The backend runs on a free hosting tier. The first request after idle time can take 30–50 seconds to wake up.

## Problem
Legal and investigation records (FIRs, charge sheets, forensic reports, court filings) can be tampered with, and there is rarely verifiable proof of who handled a document and when.

## Solution
JusticeChain prevents document tampering and provides verifiable provenance for legal and investigation records.

1. A document is uploaded and stored on IPFS.
2. Its SHA-256 hash is computed and shown with its DLT registration status.
3. An authorised officer reviews it and anchors the hash on-chain, which moves it from *Pending Verification* to *Verified*.
4. Every action is recorded in a DLT Audit Trail, and anyone can re-check the document using **Verify Document Integrity**.

## Key features
- **Document hash and DLT registration status** shown right after upload
- **Chain of Custody** view for every document
- **DLT Audit Trail** of uploads, views, case actions and on-chain registration, with user, IP and timestamp
- **Verify Document Integrity** button that re-hashes the file and compares it with the on-chain record
- **Blockchain Verified Documents** dashboard card
- **Officer-only verification**: only an authorised admin or officer can anchor a document on-chain
- **Role-based access control** with document-level permissions
- Citizen portal to file FIRs and submit documents, plus case management

## Architecture
| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React, Vite, Tailwind CSS | Vercel |
| API | Node.js, Express, JWT | Render |
| Blockchain service | Node.js, ethers v6 | Render |
| Database | MongoDB Atlas | Atlas |
| File storage | IPFS via Pinata | Pinata |
| Ledger | Solidity smart contracts on Ethereum Sepolia | Sepolia testnet |

**DocumentRegistry smart contract (Sepolia):** `0x796fA576178d9c185Ec97756F65A107cE4960D3d`
https://sepolia.etherscan.io/address/0x796fA576178d9c185Ec97756F65A107cE4960D3d

The contract stores `documentId → (SHA-256 hash, IPFS hash, anchoring wallet, timestamp)`. Records cannot be edited or deleted, and a document ID can only be anchored once.

## Why a hash alone is not enough
A hash proves a file has not changed since it was recorded. It does not prove the file was genuine at the start. JusticeChain therefore anchors a document only after an authorised officer reviews it. That deliberate action, tied to an accountable identity, is recorded on-chain and in the audit trail.

## Run locally
Requires Node.js 18+, a MongoDB URI, a Pinata account and a Sepolia wallet with test ETH.

1. Clone the repo and open it.
2. Backend: `cd backend`, then `npm install`, then `npm start` (port 5000).
3. Blockchain service: `cd blockchainbackend`, then `npm install`, then `node index.js` (port 3000).
4. Frontend: `cd frontend`, then `npm install`, then `npm run dev` (port 5173).

**Environment variables** (create a `.env` in each folder; never commit it):
- `backend`: `MONGO_URL`, `JWT_SECRET`, `PORT`, `PINATA_API_KEY`, `PINATA_SECRET_API_KEY`, `PINATA_GATEWAY`, `BLOCKCHAIN_BACKEND_URL`
- `blockchainbackend`: `PRIVATE_KEY`, `RPC_URL`, `CONTRACT_ADDRESS`, `COMPLAINT_CONTRACT_ADDRESS`, `DOCUMENT_CONTRACT_ADDRESS`, `PORT`
- `frontend` (optional): `VITE_API_URL`

## Repository structure
- `backend/` – REST API (auth, cases, documents, audit logs, permissions)
- `blockchainbackend/` – service that talks to the Sepolia contracts
- `contracts/` – Solidity contracts (`FIR.sol`, `DocumentRegistry.sol`)
- `frontend/` – React application
- `AI/` – FIR severity classification service
- `zk-fabric/` – zero-knowledge proof prototype (not yet integrated)

## Planned / future work
- Zero-knowledge proofs for privacy-preserving verification
- AI-based document classification and smart search
- Officer digital signatures and DSC integration for stronger attestation
- Hyperledger Fabric permissioned deployment for production use

## Team
**CodeMonks** – SIH 2026
