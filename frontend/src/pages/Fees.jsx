import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, Select, Table, Modal, Spinner, ErrorBanner, Badge } from '../components/ui';

const STATUS_COLOR = { PAID: 'green', PARTIAL: 'amber', UNPAID: 'red' };

export default function Fees() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const [classes, setClasses] = useState([]);
  const [invoices, setInvoices] = useState(null);
  const [showStructure, setShowStructure] = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [error, setError] = useState('');

  function loadInvoices() {
    api.get('/fees/invoices').then((res) => setInvoices(res.data));
  }
  useEffect(() => {
    loadInvoices();
    if (isAdmin) api.get('/classes').then((res) => setClasses(res.data));
  }, []);

  async function handleCreateStructure(e) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.target);
    try {
      await api.post('/fees/structures', {
        classId: form.get('classId'),
        title: form.get('title'),
        amount: form.get('amount'),
        dueDate: form.get('dueDate'),
      });
      setShowStructure(false);
      loadInvoices();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create fee structure');
    }
  }

  async function handlePay(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    await api.post(`/fees/invoices/${payInvoice.id}/pay`, { amount: form.get('amount') });
    setPayInvoice(null);
    loadInvoices();
  }

  if (!invoices) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{isAdmin ? 'Fee Management' : 'My Fees'}</h1>
        {isAdmin && <Button onClick={() => setShowStructure(true)}>+ Define Fee Structure</Button>}
      </div>

      <Card>
        <Table
          columns={['Student', 'Fee', 'Due', 'Paid', 'Status', '']}
          rows={invoices}
          renderRow={(inv) => (
            <>
              <td className="py-2 pr-4 font-medium text-slate-700">{inv.student.firstName} {inv.student.lastName}</td>
              <td className="py-2 pr-4">{inv.feeStructure.title}</td>
              <td className="py-2 pr-4">{inv.amountDue.toLocaleString()}</td>
              <td className="py-2 pr-4">{inv.amountPaid.toLocaleString()}</td>
              <td className="py-2 pr-4"><Badge color={STATUS_COLOR[inv.status]}>{inv.status}</Badge></td>
              <td className="py-2 pr-4 space-x-2">
                <a href={`/api/fees/invoices/${inv.id}/receipt.pdf`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline text-sm">
                  Receipt
                </a>
                {isAdmin && inv.status !== 'PAID' && (
                  <button className="text-emerald-600 hover:underline text-sm" onClick={() => setPayInvoice(inv)}>
                    Record Payment
                  </button>
                )}
              </td>
            </>
          )}
        />
      </Card>

      <Modal open={showStructure} onClose={() => setShowStructure(false)} title="Define Fee Structure">
        <ErrorBanner message={error} />
        <form onSubmit={handleCreateStructure} className="space-y-3">
          <Select name="classId" label="Class" required>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
            ))}
          </Select>
          <Input name="title" label="Fee title (e.g. Tuition Fee - Term 1)" required />
          <Input name="amount" type="number" label="Amount" required />
          <Input name="dueDate" type="date" label="Due date" required />
          <p className="text-xs text-slate-400">This will generate an invoice for every student currently in the class.</p>
          <Button type="submit" className="w-full">Create &amp; Generate Invoices</Button>
        </form>
      </Modal>

      <Modal open={!!payInvoice} onClose={() => setPayInvoice(null)} title="Record Payment">
        <form onSubmit={handlePay} className="space-y-3">
          <p className="text-sm text-slate-600">
            Outstanding: {payInvoice && (payInvoice.amountDue - payInvoice.amountPaid).toLocaleString()}
          </p>
          <Input name="amount" type="number" label="Amount received" required />
          <Button type="submit" className="w-full">Save Payment</Button>
        </form>
      </Modal>
    </div>
  );
}
