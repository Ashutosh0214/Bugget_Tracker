import { query, run, get } from '../config/db.js';

// @route GET /api/transactions
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await query(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC',
      [userId]
    );
    return res.json({ transactions });
  } catch (error) {
    console.error('Fetch transactions error:', error);
    return res.status(500).json({ message: 'Server error fetching transactions' });
  }
};

// @route POST /api/transactions
export const addTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, category, amount, date, status, icon } = req.body;

    if (!name || amount === undefined) {
      return res.status(400).json({ message: 'Name and amount are required' });
    }

    const txDate = date || new Date().toISOString().split('T')[0];
    const txCategory = category || 'General';
    const txStatus = status || 'Completed';
    const txIcon = icon || (amount < 0 ? '💸' : '💰');

    const result = await run(
      `INSERT INTO transactions (user_id, name, category, amount, date, status, icon) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, txCategory, amount, txDate, txStatus, txIcon]
    );

    const created = await get('SELECT * FROM transactions WHERE id = ?', [result.id]);
    return res.status(201).json({ transaction: created });
  } catch (error) {
    console.error('Add transaction error:', error);
    return res.status(500).json({ message: 'Server error adding transaction' });
  }
};

// @route DELETE /api/transactions/:id
export const deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await get('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existing) {
      return res.status(404).json({ message: 'Transaction not found or unauthorized' });
    }

    await run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
    return res.json({ message: 'Transaction deleted successfully', id: Number(id) });
  } catch (error) {
    console.error('Delete transaction error:', error);
    return res.status(500).json({ message: 'Server error deleting transaction' });
  }
};
