"use client";

import { useEffect, useState } from "react";
import { getAdmins, addAdmin, deleteAdmin } from "@/services/admin.service";
import { notifyError, notifySuccess } from "@/lib/notify";
import { openConfirmDialog } from "@/lib/dialog";

export default function AdminsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [adding, setAdding] = useState(false);

  const loadAdmins = async () => {
    try {
      const data = await getAdmins();
      setAdmins(data);
    } catch (err) {
      console.error("Failed to load admins", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setAdding(true);
    try {
      await addAdmin({ email, full_name: fullName });
      setEmail("");
      setFullName("");
      await loadAdmins();
      notifySuccess("Admin added successfully. Temporary password is: admin123");
    } catch (err: unknown) {
      console.error("Failed to add admin", err);
      const message = err instanceof Error ? err.message : "Failed to add admin";
      notifyError(message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    const confirmed = await openConfirmDialog({
      title: "Delete Admin",
      message: "Are you sure you want to delete this admin? They will lose all access.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteAdmin(id);
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
      await loadAdmins();
      notifySuccess("Admin deleted successfully");
    } catch (err: unknown) {
      console.error("Failed to delete admin", err);
      notifyError("Failed to delete admin");
    }
  };

  const handleBulkDeleteAdmins = async (ids: string[]) => {
    if (ids.length === 0) return;
    const confirmed = await openConfirmDialog({
      title: "Delete Administrators",
      message: `Are you sure you want to delete ${ids.length} administrator(s)?`,
      confirmText: "Delete All",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await Promise.all(ids.map((id) => deleteAdmin(id)));
      setSelectedIds([]);
      await loadAdmins();
      notifySuccess("Selected administrators deleted successfully");
    } catch (err: unknown) {
      console.error("Failed to delete selected administrators", err);
      notifyError("Failed to delete selected administrators");
    }
  };

  const handleDeleteAllAdmins = async () => {
    if (admins.length === 0) return;
    const allIds = admins.map((admin) => admin.id);
    await handleBulkDeleteAdmins(allIds);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === admins.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(admins.map((admin) => admin.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <p className="text-gray-900 text-lg animate-pulse">Loading admins...</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Manage Administrators</h1>

        <div className="mb-8">
          {/* Add Admin Form */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg max-w-xl">
            <h2 className="text-xl font-semibold mb-4 text-yellow-500">Add New Administrator</h2>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Admin Name"
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <button
                type="submit"
                disabled={adding}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add Admin"}
              </button>
              <p className="text-xs text-gray-500 italic text-center">
                New admins will be created with the default password: <span className="font-mono font-bold">admin123</span>
              </p>
            </form>
          </div>
        </div>

        {/* Admins List */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Administrators 
            <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{admins.length}</span>
          </h2>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={() => handleBulkDeleteAdmins(selectedIds)}
                className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-lg border border-red-500/50 transition-all font-bold text-sm flex items-center gap-2"
              >
                🗑️ Delete Selected ({selectedIds.length})
              </button>
            )}
            {admins.length > 0 && (
              <button
                onClick={handleDeleteAllAdmins}
                className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-lg border border-red-500/50 transition-all font-bold text-sm flex items-center gap-2"
              >
                🗑️ Delete All Admins
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-600 text-[10px] uppercase tracking-widest font-black">
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={admins.length > 0 && selectedIds.length === admins.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 bg-white text-yellow-500 focus:ring-yellow-500 focus:ring-offset-white"
                  />
                </th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Added On</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                    No administrators found.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className={`hover:bg-gray-100/30 transition-colors ${selectedIds.includes(admin.id) ? "bg-yellow-500/5" : ""}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(admin.id)}
                        onChange={() => toggleSelectOne(admin.id)}
                        className="w-4 h-4 rounded border-gray-300 bg-white text-yellow-500 focus:ring-yellow-500 focus:ring-offset-white"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{admin.email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{admin.full_name || "-"}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm font-mono">
                      {new Date(admin.created_at || admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        className="text-red-500/50 hover:text-red-500 transition-colors p-2"
                        title="Delete Admin"
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
    </>
  );
}
