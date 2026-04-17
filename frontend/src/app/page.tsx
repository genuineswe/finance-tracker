'use client';

import { useState, useEffect, FormEvent } from 'react';
import { transactionService, Transaction } from '@/services/api';

export default function Home() {
    // Memberikan type pada states
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [amount, setAmount] = useState<string>('');
    const [description, setDescription] = useState<string>('');

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await transactionService.getAll();
            setTransactions(data.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal mengambil data dari server');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    // Type untuk event submit form
    const handleAddTransaction = async (e: FormEvent) => {
        e.preventDefault();
        if (!amount || !description) return;

        try {
            setIsSubmitting(true);
            setError(null);

            await transactionService.create({
                amount: Number(amount),
                description,
                category_id: 1, //TODO: fix this later
                date: new Date().toISOString(),
            });

            setAmount('');
            setDescription('');
            await fetchTransactions();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal menyimpan transaksi');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            setIsSubmitting(true);
            await transactionService.delete(id);
            setTransactions((prev) => prev.filter(t => t.id !== id));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal menghapus transaksi');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="max-w-3xl mx-auto p-6 font-sans text-slate-900">
            <h1 className="text-3xl font-bold mb-6">Daftar Transaksi</h1>

            {error && (
                <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6 border border-red-200">
                    {error}
                </div>
            )}

            <form onSubmit={handleAddTransaction} className="bg-white p-6 rounded-lg shadow-sm border mb-8">
                <h2 className="text-xl font-semibold mb-4">Tambah Transaksi</h2>
                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Deskripsi (ex: Gaji)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="flex-1 p-2 border rounded"
                        disabled={isSubmitting}
                    />
                    <input
                        type="number"
                        placeholder="Nominal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="md:w-40 p-2 border rounded"
                        disabled={isSubmitting}
                    />
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                    >
                        {isSubmitting ? '...' : 'Simpan'}
                    </button>
                </div>
            </form>

            <div>
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500">Belum ada transaksi ditemukan.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="flex justify-between items-center p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                <div>
                                    <h3 className="font-medium">{tx.description}</h3>
                                    <p className="text-blue-600 font-bold">
                                        Rp {tx.amount.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(tx.id)}
                                    disabled={isSubmitting}
                                    className="text-red-500 hover:bg-red-50 px-3 py-1 rounded transition-colors text-sm border border-transparent hover:border-red-100"
                                >
                                    Hapus
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
