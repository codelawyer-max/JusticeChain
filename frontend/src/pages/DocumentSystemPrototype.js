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

function DocumentSystemPrototype() {
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [activeDocument, setActiveDocument] = useState(null);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-700">Prototype workspace</p>
            <p className="text-2xl font-bold tracking-tight text-slate-950">JusticeChain</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Legal &amp; Investigation Document System</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">One controlled case record for investigation, forensics, court filings, and legal outcomes.</p>
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
              onClick={() => setActiveDocument(document)}
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
              <button type="button" onClick={() => setActiveDocument(documentTypes[0])} className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800">Create document</button>
              <button type="button" onClick={() => setActiveDocument(documentTypes[1])} className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-700">View activity</button>
            </div>
          </section>

          <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-300">Case CL-2025-00418</p>
            <h2 className="mt-2 text-2xl font-bold">Evidence-to-court timeline</h2>
            <div className="mt-8 space-y-6">
              {["Case registered", "Forensic report attached", "Charge sheet drafted", "Court filing pending"].map((event, index) => (
                <div className="flex items-start gap-4" key={event}>
                  <span className={`mt-1 h-3 w-3 rounded-full ${index < 3 ? "bg-teal-400" : "border-2 border-amber-300"}`} />
                  <div><p className="font-semibold">{event}</p><p className="mt-1 text-sm text-slate-400">{index < 3 ? "Verified record" : "Assigned to Court Officer"}</p></div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {activeDocument && (
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
