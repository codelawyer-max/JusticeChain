// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentRegistry {
    address public admin; // backend wallet — same role as "police" in FIR.sol

    struct DocumentRecord {
        string sha256Hash;
        string ipfsHash;
        address anchoredBy;
        uint256 timestamp;
        bool exists;
    }

    // documentId => record
    mapping(string => DocumentRecord) private records;

    event DocumentAnchored(
        string documentId,
        string sha256Hash,
        string ipfsHash,
        address indexed anchoredBy,
        uint256 timestamp
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function anchorDocument(
        string memory documentId,
        string memory sha256Hash,
        string memory ipfsHash
    ) external onlyAdmin {
        require(bytes(documentId).length > 0, "documentId required");
        require(bytes(sha256Hash).length > 0, "sha256Hash required");
        require(!records[documentId].exists, "Document already anchored");

        records[documentId] = DocumentRecord({
            sha256Hash: sha256Hash,
            ipfsHash: ipfsHash,
            anchoredBy: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        emit DocumentAnchored(
            documentId,
            sha256Hash,
            ipfsHash,
            msg.sender,
            block.timestamp
        );
    }

    function getDocument(string memory documentId)
        external
        view
        returns (
            string memory sha256Hash,
            string memory ipfsHash,
            address anchoredBy,
            uint256 timestamp
        )
    {
        require(records[documentId].exists, "Document not found");
        DocumentRecord memory r = records[documentId];
        return (r.sha256Hash, r.ipfsHash, r.anchoredBy, r.timestamp);
    }

    function isAnchored(string memory documentId) external view returns (bool) {
        return records[documentId].exists;
    }
}