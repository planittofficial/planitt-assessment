"use client";

import { useEffect, useState } from "react";
import { getCandidates, addCandidate, bulkAddCandidates } from "@/services/admin.service";
import Link from "next/link";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
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
      alert("Candidate added successfully");
    } catch (err: any) {
      console.error("Failed to add candidate", err);
      alert(err.message || "Failed to add candidate");
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
        alert("No valid candidates found in CSV. Please ensure format is 'name,email' or 'email,name'.");
        setUploading(false);
        return;
      }

      try {
        const res = await bulkAddCandidates(parsedCandidates);
        alert(`Bulk upload completed! Added: ${res.insertedCount}, Skipped (already exists): ${res.skippedCount}`);
        await loadCandidates();
      } catch (err: any) {
        console.error("Failed to upload CSV", err);
        alert(err.message || "Failed to upload CSV");
      } finally {
        setUploading(false);
        // Clear input
        e.target.value = "";
      }
    };
    reader.readAsText(file);
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
        <Link href="/admin" className="text-gray-400 hover:text-white mb-4 inline-block">
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

        {/* Candidates List */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-800 border-b border-neutral-700 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Email</th>
                <th className="px-6 py-4 font-bold">Full Name</th>
                <th className="px-6 py-4 font-bold">Added On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No candidates found.
                  </td>
                </tr>
              ) : (
                candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{c.email}</td>
                    <td className="px-6 py-4 text-gray-300">{c.full_name || "-"}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(c.created_at).toLocaleDateString()}
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
