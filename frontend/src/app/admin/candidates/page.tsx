"use client";

import { useEffect, useState } from "react";
import { getCandidates, addCandidate, bulkAddCandidates, deleteCandidate, bulkDeleteCandidates } from "@/services/admin.service";
import { Candidate } from "@/types";
import { notifyError, notifySuccess } from "@/lib/notify";
import { openConfirmDialog } from "@/lib/dialog";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<(Candidate & { created_at: string })[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);

  const filteredCandidates = candidates.filter(c => 
    c.email.toLowerCase().includes(search.toLowerCase()) || 
    (c.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const loadCandidates = async () => {
    try {
      const data = await getCandidates();
      setCandidates(data);
    } catch (err) {
      console.error("Failed to load candidates", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setAdding(true);
    try {
      await addCandidate({ email, full_name: fullName });
      setEmail("");
      setFullName("");
      await loadCandidates();
      notifySuccess("Candidate added successfully");
    } catch (err: unknown) {
      console.error("Failed to add candidate", err);
      const message = err instanceof Error ? err.message : "Failed to add candidate";
      notifyError(message);
    } finally {
      setAdding(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      
      // Use a more robust CSV parser that handles multi-line fields properly
      const parseCSV = (csvText: string) => {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
          const char = csvText[i];
          const nextChar = csvText[i + 1];

          if (inQuotes) {
            if (char === '"' && nextChar === '"') {
              currentField += '"';
              i++; // skip next quote
            } else if (char === '"') {
              inQuotes = false;
            } else {
              currentField += char;
            }
          } else {
            if (char === '"') {
              inQuotes = true;
            } else if (char === ',') {
              currentRow.push(currentField.trim());
              currentField = '';
            } else if (char === '\r' || char === '\n') {
              if (currentField || currentRow.length > 0) {
                currentRow.push(currentField.trim());
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
              }
              if (char === '\r' && nextChar === '\n') i++; // skip \n
            } else {
              currentField += char;
            }
          }
        }
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          rows.push(currentRow);
        }
        return rows;
      };

      const allRows = parseCSV(text);
      if (allRows.length === 0) {
        notifyError("The CSV file is empty.");
        setUploading(false);
        return;
      }

      const headers = allRows[0];
      let emailIdx = -1;
      let nameIdx = -1;

      // Try to find indices based on header names
      headers.forEach((header, idx) => {
        const h = header.toLowerCase();
        // Look for "email address" specifically first
        if (h === "email address" && emailIdx === -1) {
          emailIdx = idx;
        }
        // Then look for "full name"
        if (h.includes("full name") && nameIdx === -1) {
          nameIdx = idx;
        }
      });

      // Fallback if exact match failed
      if (emailIdx === -1) {
        headers.forEach((header, idx) => {
          const h = header.toLowerCase();
          if (h.includes("email") && !h.includes("resume") && emailIdx === -1) {
            emailIdx = idx;
          }
        });
      }
      if (nameIdx === -1) {
        headers.forEach((header, idx) => {
          const h = header.toLowerCase();
          if ((h.includes("name") || h.includes("candidate")) && nameIdx === -1) {
            nameIdx = idx;
          }
        });
      }

      const dataRows = allRows.slice(1);
      const parsedCandidates: { email: string; full_name: string }[] = [];

      dataRows.forEach((cols) => {
        let email = "";
        let name = "";

        if (emailIdx !== -1 && cols[emailIdx]) {
          email = cols[emailIdx];
        }
        if (nameIdx !== -1 && cols[nameIdx]) {
          name = cols[nameIdx];
        }

        // Final fallback: if email is still missing, look for anything with @
        if (!email) {
          for (const col of cols) {
            if (col.includes("@") && !col.includes("/") && col.length < 100) {
              email = col;
              break;
            }
          }
        }

        if (email && email.includes("@")) {
          parsedCandidates.push({ email, full_name: name });
        }
      });

      if (parsedCandidates.length === 0) {
        notifyError("No valid candidates found. Please ensure the CSV has 'Email' and 'Name' columns.");
        setUploading(false);
        return;
      }

      try {
        const res = await bulkAddCandidates(parsedCandidates);
        notifySuccess(`Bulk upload completed! Added: ${res.insertedCount}, Skipped: ${res.skippedCount}`);
        await loadCandidates();
      } catch (err: unknown) {
        console.error("Failed to upload CSV", err);
        const message = err instanceof Error ? err.message : "Failed to upload CSV";
        notifyError(message);
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteIndividual = async (id: string) => {
    const confirmed = await openConfirmDialog({
      title: "Delete Candidate",
      message: "Are you sure you want to delete this candidate?",
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteCandidate(id);
      setSelectedIds(selectedIds.filter(sid => sid !== id));
      await loadCandidates();
    } catch (err: unknown) {
      console.error("Failed to delete candidate", err);
      notifyError("Failed to delete candidate");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await openConfirmDialog({
      title: "Delete Candidates",
      message: `Are you sure you want to delete ${selectedIds.length} candidates?`,
      confirmText: "Delete All",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await bulkDeleteCandidates(selectedIds);
      setSelectedIds([]);
      await loadCandidates();
    } catch (err: unknown) {
      console.error("Failed to delete candidates", err);
      notifyError("Failed to delete candidates");
    }
  };

  const handleDeleteAllCandidates = async () => {
    if (candidates.length === 0) return;
    const confirmed = await openConfirmDialog({
      title: "Delete All Candidates",
      message: "This will permanently delete all candidates. Continue?",
      confirmText: "Delete All",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      const allIds = candidates.map((candidate) => candidate.id);
      await bulkDeleteCandidates(allIds);
      setSelectedIds([]);
      await loadCandidates();
      notifySuccess("All candidates deleted successfully");
    } catch (err: unknown) {
      console.error("Failed to delete all candidates", err);
      notifyError("Failed to delete all candidates");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === candidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(candidates.map(c => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <p className="text-gray-900 text-lg animate-pulse">Loading candidates...</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Manage Candidates</h1>
            <p className="text-gray-500 mt-1">Add, import, and manage your assessment participants.</p>
          </div>
          <div className="flex items-center gap-3">
             {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl border border-red-200 transition-all font-bold text-sm flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete Selected ({selectedIds.length})
              </button>
            )}
            {candidates.length > 0 && (
              <button
                onClick={handleDeleteAllCandidates}
                className="bg-white hover:bg-red-50 text-red-500 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-red-200 transition-all font-bold text-sm flex items-center gap-2 shadow-sm"
              >
                Clear Database
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Candidate Form */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold mb-5 text-gray-800 flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </span>
              Add New Candidate
            </h2>
            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                />
              </div>
              <button
                type="submit"
                disabled={adding}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
              >
                {adding ? "Adding..." : "Add Candidate"}
              </button>
            </form>
          </div>

          {/* Bulk Upload CSV */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold mb-5 text-gray-800 flex items-center gap-2">
              <span className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </span>
              Bulk Import (CSV)
            </h2>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Import multiple candidates at once. Our system will automatically detect <span className="font-semibold text-gray-900">Name</span> and <span className="font-semibold text-gray-900">Email</span> columns even from complex sheets.
                </p>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Supported Format</h3>
                  <div className="flex gap-2">
                    <code className="text-[11px] bg-white border border-gray-200 px-2 py-1 rounded text-indigo-600 font-mono">name,email</code>
                    <code className="text-[11px] bg-white border border-gray-200 px-2 py-1 rounded text-indigo-600 font-mono">email,name</code>
                    <code className="text-[11px] bg-white border border-gray-200 px-2 py-1 rounded text-indigo-600 font-mono">multi-column</code>
                  </div>
                </div>
              </div>
              <div className="md:w-64">
                <div className="group relative border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl p-4 transition-all h-full flex items-center justify-center bg-gray-50/50 hover:bg-indigo-50/30">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                  />
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      {uploading ? (
                        <svg className="w-6 h-6 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-700">{uploading ? "Uploading..." : "Click to Upload"}</p>
                    <p className="text-[10px] text-gray-400 mt-1">CSV files only</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Candidates List Header with Bulk Actions */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-gray-900">
                All Candidates
              </h2>
              <span className="bg-blue-50 text-blue-600 text-xs font-black px-2.5 py-1 rounded-lg border border-blue-100">
                {candidates.length} TOTAL
              </span>
            </div>
            <div className="relative w-full md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase tracking-widest font-black border-b border-gray-100">
                  <th className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={candidates.length > 0 && selectedIds.length === candidates.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4">Candidate Information</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <p className="text-gray-500 font-medium">No candidates found</p>
                        <p className="text-gray-400 text-sm mt-1">Try adjusting your search or add a new candidate.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-blue-50/30 transition-colors group ${selectedIds.includes(c.id) ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="px-6 py-5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelectOne(c.id)}
                          className="w-4 h-4 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 leading-none mb-1">{c.full_name || "Unnamed Candidate"}</span>
                          <span className="text-sm text-gray-500">{c.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight bg-green-100 text-green-700 border border-green-200">
                          Verified
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-700 font-medium">{new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className="text-[10px] text-gray-400 font-mono uppercase">at {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleDeleteIndividual(c.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg group-hover:text-gray-400"
                          title="Delete Candidate"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
