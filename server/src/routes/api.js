import express from 'express';
import mongoose from 'mongoose';
import { TaskModel } from '../models/Task.js';
import { PersonModel } from '../models/Person.js';
import { MoneyTransactionModel } from '../models/MoneyTransaction.js';
import { NoteModel } from '../models/Note.js';
import { ActivityModel } from '../models/Activity.js';
import { UserProfileModel } from '../models/UserProfile.js';
import { UserModel } from '../models/User.js';
import { PushSubscriptionModel } from '../models/PushSubscription.js';
import { getVapidPublicKey, isPushConfigured } from '../services/pushService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if MongoDB is connected
const checkDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database unavailable',
      message: 'MongoDB is currently not connected. Please verify mongodb://localhost:27017 is running.',
    });
  }
  next();
};

// Helper to filter by authenticated user
const getUserQuery = (req) => {
  return { userId: req.userId };
};

// Health Check (Public endpoint for uptime monitors)
router.get('/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isConnected ? 'connected' : 'disconnected',
    database: isConnected ? mongoose.connection.name : null,
    host: isConnected ? mongoose.connection.host : null,
  });
});

// GET /api/push/status - Public endpoint to check Web Push VAPID configuration
router.get('/push/status', (req, res) => {
  const configured = isPushConfigured();
  const publicKey = getVapidPublicKey();
  res.json({
    pushConfigured: configured,
    hasPublicKey: Boolean(publicKey),
  });
});

// GET /api/push/public-key - Retrieve VAPID public key for browser PushManager subscription (Public endpoint)
router.get('/push/public-key', (req, res) => {
  const publicKey = getVapidPublicKey();
  res.json({
    publicKey,
    configured: Boolean(publicKey),
  });
});

// Require valid JWT authentication on all subsequent data endpoints
router.use(requireAuth);

// GET /api/all - Fast bulk loader for application state
router.get('/all', checkDB, async (req, res) => {
  try {
    const query = getUserQuery(req);
    const [tasks, people, transactions, notes, activities, userDoc, profileDoc] = await Promise.all([
      TaskModel.find(query).sort({ createdAt: -1 }),
      PersonModel.find(query).sort({ createdAt: -1 }),
      MoneyTransactionModel.find(query).sort({ date: -1 }),
      NoteModel.find(query).sort({ isPinned: -1, updatedAt: -1 }),
      ActivityModel.find(query).sort({ timestamp: -1 }).limit(50),
      req.userId && mongoose.Types.ObjectId.isValid(req.userId)
        ? UserModel.findById(req.userId).select('-password')
        : null,
      UserProfileModel.findOne(),
    ]);

    const profile = userDoc
      ? {
          name: userDoc.name,
          email: userDoc.email,
          currency: userDoc.currency || '₹',
          currencyCode: userDoc.currencyCode || 'INR',
          avatarSeed: userDoc.avatarSeed || userDoc.name,
        }
      : profileDoc || {
          name: 'User',
          email: 'user@dayledger.app',
          currency: '₹',
          currencyCode: 'INR',
          avatarSeed: 'User',
        };

    res.json({
      tasks,
      people,
      transactions,
      notes,
      activities,
      profile,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TASKS ====================
router.get('/tasks', checkDB, async (req, res) => {
  try {
    const tasks = await TaskModel.find(getUserQuery(req)).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks', checkDB, async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.userId && !body.userId) body.userId = req.userId;
    const task = new TaskModel(body);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/tasks/:id', checkDB, async (req, res) => {
  try {
    const filter = { id: req.params.id, ...getUserQuery(req) };
    const updates = { ...req.body };

    // If deadline, time, or reminder was updated, reset reminder sent flags
    if (
      updates.deadline !== undefined ||
      updates.dueDate !== undefined ||
      updates.dueTime !== undefined ||
      updates.remindMe !== undefined
    ) {
      updates.reminder5MinSent = false;
      updates.reminderDueSent = false;
    }

    const task = await TaskModel.findOneAndUpdate(filter, updates, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/tasks/:id/complete', checkDB, async (req, res) => {
  try {
    const filter = { id: req.params.id, ...getUserQuery(req) };
    const task = await TaskModel.findOneAndUpdate(
      filter,
      { status: 'completed', completedAt: new Date().toISOString() },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/tasks/:id', checkDB, async (req, res) => {
  try {
    const filter = { id: req.params.id, ...getUserQuery(req) };
    const result = await TaskModel.findOneAndDelete(filter);
    if (!result) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PEOPLE ====================
router.get('/people', checkDB, async (req, res) => {
  try {
    const people = await PersonModel.find(getUserQuery(req)).sort({ createdAt: -1 });
    res.json(people);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/people', checkDB, async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.userId && !body.userId) body.userId = req.userId;
    const person = new PersonModel(body);
    await person.save();
    res.status(201).json(person);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/people/:id', checkDB, async (req, res) => {
  try {
    const person = await PersonModel.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!person) return res.status(404).json({ error: 'Person not found' });
    if (req.body.name) {
      await MoneyTransactionModel.updateMany({ personId: req.params.id }, { personName: req.body.name });
    }
    res.json(person);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/people/:id', checkDB, async (req, res) => {
  try {
    const result = await PersonModel.findOneAndDelete({ id: req.params.id });
    if (!result) return res.status(404).json({ error: 'Person not found' });
    res.json({ success: true, message: 'Person removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TRANSACTIONS ====================
router.get('/transactions', checkDB, async (req, res) => {
  try {
    const transactions = await MoneyTransactionModel.find(getUserQuery(req)).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transactions', checkDB, async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.userId && !body.userId) body.userId = req.userId;
    const tx = new MoneyTransactionModel(body);
    await tx.save();
    res.status(201).json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/transactions/:id', checkDB, async (req, res) => {
  try {
    const tx = await MoneyTransactionModel.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    res.json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/transactions/:id', checkDB, async (req, res) => {
  try {
    const result = await MoneyTransactionModel.findOneAndDelete({ id: req.params.id });
    if (!result) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transactions/:id/payment', checkDB, async (req, res) => {
  try {
    const { amount, note, date } = req.body;
    const tx = await MoneyTransactionModel.findOne({ id: req.params.id });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const newPaidAmount = Math.min(tx.amount, tx.paidAmount + Number(amount));
    const isFullyPaid = newPaidAmount >= tx.amount;
    const status = isFullyPaid ? 'paid' : 'partially_paid';

    const paymentItem = {
      id: `pay-${Date.now()}`,
      amount: Number(amount),
      date: date || new Date().toISOString().split('T')[0],
      note: note || (isFullyPaid ? 'Settled in full' : 'Partial payment'),
    };

    tx.paidAmount = newPaidAmount;
    tx.status = status;
    tx.paymentHistory.unshift(paymentItem);

    await tx.save();
    res.json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==================== NOTES ====================
router.get('/notes', checkDB, async (req, res) => {
  try {
    const notes = await NoteModel.find(getUserQuery(req)).sort({ isPinned: -1, updatedAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notes', checkDB, async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.userId && !body.userId) body.userId = req.userId;
    const note = new NoteModel(body);
    await note.save();
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/notes/:id', checkDB, async (req, res) => {
  try {
    const note = await NoteModel.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date().toISOString() },
      { new: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/notes/:id', checkDB, async (req, res) => {
  try {
    const result = await NoteModel.findOneAndDelete({ id: req.params.id });
    if (!result) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ACTIVITIES ====================
router.get('/activities', checkDB, async (req, res) => {
  try {
    const activities = await ActivityModel.find(getUserQuery(req)).sort({ timestamp: -1 }).limit(50);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/activities', checkDB, async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.userId && !body.userId) body.userId = req.userId;
    const act = new ActivityModel(body);
    await act.save();
    res.status(201).json(act);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==================== PROFILE ====================
router.get('/profile', checkDB, async (req, res) => {
  try {
    if (req.userId && mongoose.Types.ObjectId.isValid(req.userId)) {
      const user = await UserModel.findById(req.userId).select('-password');
      if (user) {
        return res.json({
          name: user.name,
          email: user.email,
          currency: user.currency || '₹',
          currencyCode: user.currencyCode || 'INR',
          avatarSeed: user.avatarSeed || user.name,
        });
      }
    }
    let profile = await UserProfileModel.findOne();
    if (!profile) {
      profile = await UserProfileModel.create({
        name: 'User',
        email: 'user@dayledger.app',
        currency: '₹',
        currencyCode: 'INR',
      });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', checkDB, async (req, res) => {
  try {
    if (req.userId && mongoose.Types.ObjectId.isValid(req.userId)) {
      const user = await UserModel.findByIdAndUpdate(req.userId, req.body, { new: true });
      if (user) {
        return res.json({
          name: user.name,
          email: user.email,
          currency: user.currency || '₹',
          currencyCode: user.currencyCode || 'INR',
          avatarSeed: user.avatarSeed || user.name,
        });
      }
    }
    let profile = await UserProfileModel.findOne();
    if (!profile) {
      profile = new UserProfileModel(req.body);
    } else {
      Object.assign(profile, req.body);
    }
    await profile.save();
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==================== SEED / RESET ====================
router.post('/seed', checkDB, async (req, res) => {
  try {
    const { tasks, people, transactions, notes, activities, profile } = req.body;
    const userQuery = getUserQuery(req);

    await Promise.all([
      TaskModel.deleteMany(userQuery),
      PersonModel.deleteMany(userQuery),
      MoneyTransactionModel.deleteMany(userQuery),
      NoteModel.deleteMany(userQuery),
      ActivityModel.deleteMany(userQuery),
    ]);

    if (tasks?.length) await TaskModel.insertMany(tasks.map(t => ({ ...t, ...(req.userId ? { userId: req.userId } : {}) })));
    if (people?.length) await PersonModel.insertMany(people.map(p => ({ ...p, ...(req.userId ? { userId: req.userId } : {}) })));
    if (transactions?.length) await MoneyTransactionModel.insertMany(transactions.map(tx => ({ ...tx, ...(req.userId ? { userId: req.userId } : {}) })));
    if (notes?.length) await NoteModel.insertMany(notes.map(n => ({ ...n, ...(req.userId ? { userId: req.userId } : {}) })));
    if (activities?.length) await ActivityModel.insertMany(activities.map(a => ({ ...a, ...(req.userId ? { userId: req.userId } : {}) })));
    if (profile && !req.userId) await UserProfileModel.create(profile);

    res.json({ success: true, message: 'Database state updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== WEB PUSH NOTIFICATIONS ====================

// POST /api/push/subscribe - Store Web Push subscription for authenticated user
router.post('/push/subscribe', checkDB, async (req, res) => {
  try {
    const { endpoint, keys, userAgent } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid push subscription payload' });
    }

    await PushSubscriptionModel.findOneAndUpdate(
      { endpoint },
      {
        userId: req.userId,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent: userAgent || req.headers['user-agent'] || '',
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, message: 'Push subscription registered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/push/unsubscribe - Remove Web Push subscription
router.post('/push/unsubscribe', checkDB, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    await PushSubscriptionModel.deleteOne({ endpoint, userId: req.userId });
    res.json({ success: true, message: 'Push subscription removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
