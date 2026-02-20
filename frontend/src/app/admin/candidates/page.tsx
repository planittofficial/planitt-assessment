"use client";

import { useEffect, useState } from "react";
import { getCandidates, addCandidate, bulkAddCandidates, deleteCandidate, bulkDeleteCandidates } from "@/services/admin.service";
import Link from "next/link";
import { Candidate } from "@/types";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { openConfirmDialog } from "@/lib/dialog";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<(Candidate & { created_at: string })[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      const rows = text.split("\n");
      const parsedCandidates: { email: string; full_name: string }[] = [];

      // Assume CSV format: name,email OR email,name
      // We'll try to detect based on @ in the string
      rows.forEach((row, index) => {
        if (index === 0 && (row.toLowerCase().includes("email") || row.toLowerCase().includes("name"))) {
          return; // Skip header
        }
        
        const cols = row.split(",").map(c => c.trim());
        if (cols.length >= 2) {
          let email = "";
          let name = "";
          
          if (cols[0].includes("@")) {
            email = cols[0];
            name = cols[1];
          } else if (cols[1].includes("@")) {
            name = cols[0];
            email = cols[1];
          }

          if (email) {
            parsedCandidates.push({ email, full_name: name });
          }
        }
      });

      if (parsedCandidates.length === 0) {
        notifyError("No valid candidates found in CSV. Please ensure format is 'name,email' or 'email,name'.");
        setUploading(false);
        return;
      }

      try {
        const res = await bulkAddCandidates(parsedCandidates);
        notifySuccess(`Bulk upload completed! Added: ${res.insertedCount}, Skipped (already exists): ${res.skippedCount}`);
        await loadCandidates();
      } catch (err: unknown) {
        console.error("Failed to upload CSV", err);
        const message = err instanceof Error ? err.message : "Failed to upload CSV";
        notifyError(message);
      } finally {
        setUploading(false);
        // Clear input
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
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <p className="text-white text-lg animate-pulse">Loading candidates...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/admin"
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-black/40 transition-all hover:-translate-y-0.5 hover:bg-neutral-800 active:translate-y-0"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mb-8 text-white">Manage Candidates</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Add Candidate Form */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-yellow-500">Add New Candidate</h2>
            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <button
                type="submit"
                disabled={adding}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add Candidate"}
              </button>
            </form>
          </div>

          {/* Bulk Upload CSV */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-yellow-500">Bulk Upload (CSV)</h2>
            <p className="text-sm text-gray-400 mb-4">
              Upload a CSV file with candidates. Format: <code className="text-yellow-500">name,email</code> or <code className="text-yellow-500">email,name</code>. Header row is optional.
            </p>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-neutral-700 rounded-lg p-8 text-center hover:border-yellow-500 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col items-center">
                  <svg className="w-10 h-10 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-300 font-medium">
                    {uploading ? "Processing..." : "Click or drag CSV file to upload"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Maximum 5MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Candidates List Header with Bulk Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Candidates 
            <span className="text-sm bg-neutral-800 text-gray-400 px-3 py-1 rounded-full">{candidates.length}</span>
          </h2>
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-lg border border-red-500/50 transition-all font-bold text-sm flex items-center gap-2"
            >
              🗑️ Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-800 border-b border-neutral-700 text-gray-400 text-[10px] uppercase tracking-widest font-black">
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={candidates.length > 0 && selectedIds.length === candidates.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-neutral-900"
                  />
                </th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Added On</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                    No candidates found.
                  </td>
                </tr>
              ) : (
                candidates.map((c) => (
                  <tr key={c.id} className={`hover:bg-neutral-800/30 transition-colors ${selectedIds.includes(c.id) ? 'bg-yellow-500/5' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelectOne(c.id)}
                        className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-neutral-900"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{c.email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{c.full_name || "-"}</td>
                    <td className="px-6 py-4 text-neutral-500 text-sm font-mono">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteIndividual(c.id)}
                        className="text-red-500/50 hover:text-red-500 transition-colors p-2"
                        title="Delete Candidate"
                      >
                        🗑️
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
  );
}
