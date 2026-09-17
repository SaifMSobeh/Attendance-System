import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function TeamAccountsView() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const { toast } = useToast();

  const loadAccounts = async () => {
    try {
      const data = await api("/team");
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      toast(err.message, false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const createAccount = async (event) => {
    event.preventDefault();
    try {
      await api("/team", { method: "POST", body: form });
      setForm({ name: "", username: "", password: "" });
      toast("Co-admin account created.");
      loadAccounts();
    } catch (err) {
      toast(err.message, false);
    }
  };

  const removeAccount = async (account) => {
    if (!window.confirm(`Remove ${account.name}'s account?`)) return;
    try {
      await api(`/team/${account.id}`, { method: "DELETE" });
      toast("Co-admin account removed.");
      loadAccounts();
    } catch (err) {
      toast(err.message, false);
    }
  };

  return (
    <section className="view">
      <div className="page-header">
        <div>
          <h2>Team accounts</h2>
          <div className="sub">Create staff access without exposing monthly financial totals.</div>
        </div>
      </div>

      <div className="panel card" style={{ marginBottom: "18px" }}>
        <div className="card-header"><h3>Add co-admin</h3></div>
        <form onSubmit={createAccount}>
          <div className="toolbar">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="co-admin-name">Name</label>
              <input id="co-admin-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="co-admin-username">Username</label>
              <input id="co-admin-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="co-admin-password">Password</label>
              <input id="co-admin-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength="4" required />
            </div>
            <button className="btn btn-primary" type="submit">Create account</button>
          </div>
        </form>
      </div>

      <div className="panel card">
        <div className="card-header"><h3>Co-admin accounts</h3></div>
        {accounts.length === 0 ? (
          <div className="empty-state">No co-admin accounts yet.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Username</th><th></th></tr></thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td className="mono muted">{account.username}</td>
                  <td><button className="btn btn-danger" onClick={() => removeAccount(account)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}