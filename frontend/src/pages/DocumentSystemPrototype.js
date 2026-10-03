import React, { useState } from "react";

const roles = [
  {
    name: "Investigating Officer",
    shortName: "Investigation",
    accent: "#0f766e",
    description: "Build the case file, record evidence, and prepare the charge sheet.",
    permissions: ["Create case records", "Upload evidence", "Prepare charge sheets"],
  },
  {
    name: "Forensic Officer",
    shortName: "Forensics",
    accent: "#2563eb",
    description: "Attach laboratory findings and preserve the forensic chain of custody.",
    permissions: ["Upload forensic reports", "Verify evidence", "Add lab notes"],
  },
  {
    name: "Court Officer",
    shortName: "Court",
    accent: "#b45309",
    description: "Manage filings, hearing records, and court-facing case updates.",
    permissions: ["Add court filings", "Record hearings", "Upload judgements"],
  },
  {
    name: "Legal Officer",
    shortName: "Legal",
    accent: "#be123c",
    description: "Review legal notices, judgements, and the case record before release.",
    permissions: ["Draft legal notices", "Review documents", "Publish legal outcomes"],
  },
];

const documentTypes = [
  { name: "Charge Sheets", count: 12, status: "3 awaiting review", icon: "CS", color: "#0f766e" },
  { name: "Court Filings", count: 8, status: "2 hearings this week", icon: "CF", color: "#b45309" },
  { name: "Forensic Reports", count: 16, status: "4 new uploads", icon: "FR", color: "#2563eb" },
  { name: "Legal Notices & Judgements", count: 7, status: "1 requires approval", icon: "LJ", color: "#be123c" },
];

/* ──────────────────────────────────────────────────────────────────────
   Mock data for the Chain of Custody & DLT Audit Trail sections.
   In a full integration these would come from GET /api/audit-logs?documentId=...
   and GET /api/permissions/document/:docId.
   ────────────────────────────────────────────────────────────────────── */
const mockAuditTrail = [
  { action: "DOCUMENT_UPLOADED", description: 'Document "Charge Sheet CS-041" uploaded', officer: "IO R. Sharma", timestamp: "2025-09-15 09:12:34", status: "SUCCESS" },
  { action: "BLOCKCHAIN_REGISTERED", description: "SHA-256 hash anchored on-chain (tx 0x8a3f…c21b)", officer: "System", timestamp: "2025-09-15 09:12:47", status: "SUCCESS" },
  { action: "DOCUMENT_ACCESS_GRANTED", description: "View access granted to Forensic Officer K. Patel", officer: "SHO A. Kumar", timestamp: "2025-09-16 14:05:11", status: "SUCCESS" },
  { action: "DOCUMENT_VIEWED", description: "Document viewed by Forensic Officer K. Patel", officer: "FO K. Patel", timestamp: "2025-09-16 14:22:03", status: "SUCCESS" },
  { action: "INTEGRITY_VERIFIED", description: "Integrity check PASSED — stored hash matches on-chain record", officer: "IO R. Sharma", timestamp: "2025-09-18 11:44:59", status: "SUCCESS" },
];

const mockUploadResult = {
  documentId: "DOC-2025-384712",
  sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  ipfsHash: "QmT4AeWE9Q9EaoyLJiqaZuYQ8mMxmfBkaC943fLGnUg6nP",
  blockchainVerified: true,
  blockchainTxHash: "0x8a3f7bc0d912e6a4f5c8d27b394e061fa2dc21b",
};

function DocumentSystemPrototype() {
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [showUploadResult, setShowUploadResult] = useState(false);
  const [showChainOfCustody, setShowChainOfCustody] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(null); // null | 'verifying' | 'verified' | 'mismatch'

  const handleSimulateUpload = () => {
    setShowUploadResult(true);
    setShowChainOfCustody(false);
    setVerifyStatus(null);
  };

  const handleVerifyIntegrity = () => {
    setVerifyStatus("verifying");
    // Simulate a verification call — in production this calls GET /api/documents/:id/verify
    setTimeout(() => {
      setVerifyStatus("verified");
    }, 1500);
  };

  const getAuditActionColor = (action) => {
    switch (action) {
      case "DOCUMENT_UPLOADED": return "bg-blue-500";
      case "BLOCKCHAIN_REGISTERED": return "bg-emerald-500";
      case "DOCUMENT_ACCESS_GRANTED": return "bg-amber-500";
      case "DOCUMENT_ACCESS_REVOKED": return "bg-red-500";
      case "DOCUMENT_VIEWED": return "bg-slate-400";
      case "INTEGRITY_VERIFIED": return "bg-green-500";
      case "INTEGRITY_FAILED": return "bg-red-600";
      default: return "bg-gray-400";
    }
  };

  const getAuditActionLabel = (action) => {
    switch (action) {
      case "DOCUMENT_UPLOADED": return "Uploaded";
      case "BLOCKCHAIN_REGISTERED": return "Anchored on DLT";
      case "DOCUMENT_ACCESS_GRANTED": return "Access Granted";
      case "DOCUMENT_ACCESS_REVOKED": return "Access Revoked";
      case "DOCUMENT_VIEWED": return "Viewed";
      case "INTEGRITY_VERIFIED": return "Integrity Verified";
      case "INTEGRITY_FAILED": return "Integrity Failed";
      default: return action;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-700">DLT Integrity workspace</p>
            <p className="text-2xl font-bold tracking-tight text-slate-950">JusticeChain</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">DLT-Based Legal Document Integrity &amp; Provenance</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">Prevent document tampering and provide verifiable provenance for legal and investigation records.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Preview role</p>
            <select
              value={selectedRole.name}
              onChange={(event) => setSelectedRole(roles.find((role) => role.name === event.target.value))}
              className="min-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            >
              {roles.map((role) => <option key={role.name}>{role.name}</option>)}
            </select>
          </div>
        </div>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {documentTypes.map((document) => (
            <button
              type="button"
              key={document.name}
              onClick={() => { setActiveDocument(document); setShowUploadResult(false); setShowChainOfCustody(false); setVerifyStatus(null); }}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ backgroundColor: document.color }}>{document.icon}</span>
                <span className="text-3xl font-bold text-slate-900">{document.count}</span>
              </div>
              <h2 className="font-bold text-slate-900">{document.name}</h2>
              <p className="mt-2 text-sm text-slate-500">{document.status}</p>
              <span className="mt-5 inline-block text-sm font-semibold text-teal-700 group-hover:underline">Open register -&gt;</span>
            </button>
          ))}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Role-based access</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">{selectedRole.name}</h2>
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: selectedRole.accent }}>Active preview</span>
            </div>
            <p className="max-w-xl text-slate-600">{selectedRole.description}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {selectedRole.permissions.map((permission) => (
                <div key={permission} className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">{permission}</div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={handleSimulateUpload} className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800">Upload &amp; Anchor Document</button>
              <button type="button" onClick={() => { setShowChainOfCustody(true); setShowUploadResult(false); }} className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-700">DLT Audit Trail</button>
            </div>
          </section>

          <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-300">Case CL-2025-00418</p>
            <h2 className="mt-2 text-2xl font-bold">Evidence-to-court timeline</h2>
            <div className="mt-8 space-y-6">
              {["Case registered", "Forensic report attached", "Charge sheet drafted", "Court filing pending"].map((event, index) => (
                <div className="flex items-start gap-4" key={event}>
                  <span className={`mt-1 h-3 w-3 rounded-full ${index < 3 ? "bg-teal-400" : "border-2 border-amber-300"}`} />
                  <div><p className="font-semibold">{event}</p><p className="mt-1 text-sm text-slate-400">{index < 3 ? "DLT-verified record" : "Assigned to Court Officer"}</p></div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Upload Result: Document Hash & DLT Registration Status ──────── */}
        {showUploadResult && (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6" role="status">
            <h3 className="mb-4 text-lg font-bold text-emerald-900">✓ Document Uploaded — DLT Anchoring Complete</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Document ID</p>
                <p className="mt-1 font-mono text-sm text-emerald-950">{mockUploadResult.documentId}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">IPFS CID</p>
                <p className="mt-1 font-mono text-sm text-emerald-950 break-all">{mockUploadResult.ipfsHash}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Document Hash (SHA-256)</p>
                <p className="mt-1 font-mono text-sm text-emerald-950 break-all">{mockUploadResult.sha256Hash}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">DLT Registration Status</p>
                <span className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${mockUploadResult.blockchainVerified ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"}`}>
                  <span className={`mr-1.5 h-2 w-2 rounded-full ${mockUploadResult.blockchainVerified ? "bg-emerald-600" : "bg-amber-600"}`}></span>
                  {mockUploadResult.blockchainVerified ? "Confirmed" : "Pending"}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Blockchain Tx Hash</p>
                <p className="mt-1 font-mono text-sm text-emerald-950 break-all">{mockUploadResult.blockchainTxHash || "—"}</p>
              </div>
            </div>

            {/* Verify Document Integrity Button */}
            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-emerald-200 pt-4">
              <button
                type="button"
                onClick={handleVerifyIntegrity}
                disabled={verifyStatus === "verifying"}
                className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
              >
                {verifyStatus === "verifying" ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" /></svg>
                    Verifying…
                  </span>
                ) : "Verify Document Integrity"}
              </button>
              {verifyStatus === "verified" && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-4 py-1.5 text-sm font-bold text-green-800">
                  <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Integrity Verified — Hash matches on-chain record
                </span>
              )}
              {verifyStatus === "mismatch" && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-4 py-1.5 text-sm font-bold text-red-800">
                  <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Integrity Mismatch — Stored hash does not match on-chain record
                </span>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setShowUploadResult(false)} className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-white">Dismiss</button>
            </div>
          </div>
        )}

        {/* ── Chain of Custody / DLT Audit Trail ─────────────────────────── */}
        {showChainOfCustody && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-950">Chain of Custody</h3>
                <p className="mt-1 text-sm text-slate-500">DLT Audit Trail — every access, anchoring, and verification event for this document</p>
              </div>
              <button type="button" onClick={() => setShowChainOfCustody(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200"></div>

              <div className="space-y-6">
                {mockAuditTrail.map((entry, index) => (
                  <div key={index} className="relative flex items-start gap-4 pl-10">
                    {/* Timeline dot */}
                    <span className={`absolute left-[9px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${getAuditActionColor(entry.action)}`}></span>

                    <div className="flex-1 rounded-xl bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${getAuditActionColor(entry.action)}`}>
                          {getAuditActionLabel(entry.action)}
                        </span>
                        <span className="text-xs text-slate-400">{entry.timestamp}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800">{entry.description}</p>
                      <p className="mt-1 text-xs text-slate-500">Officer: {entry.officer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeDocument && !showUploadResult && !showChainOfCustody && (
          <div className="mt-8 rounded-2xl border border-teal-200 bg-teal-50 p-5 text-teal-950" role="status">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <p><span className="font-bold">{activeDocument.name}</span> register selected. This prototype action is ready to connect to the document API.</p>
              <button type="button" onClick={() => setActiveDocument(null)} className="self-start rounded-lg border border-teal-300 px-3 py-2 text-sm font-semibold hover:bg-white sm:self-auto">Dismiss</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentSystemPrototype;
