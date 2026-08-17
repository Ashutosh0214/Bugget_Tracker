import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { run, get } from '../config/db.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET || 'spendzy_secret_key',
    { expiresIn: '30d' }
  );
};

// @route POST /api/auth/signup
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Check if user already exists
    const existingUser = await get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const result = await run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email.toLowerCase(), hashedPassword]
    );

    const user = { id: result.id, name, email: email.toLowerCase() };
    const token = generateToken(user);

    return res.status(201).json({
      user,
      token,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error during signup' });
  }
};

// @route POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const userData = { id: user.id, name: user.name, email: user.email };
    const token = generateToken(userData);

    return res.json({
      user: userData,
      token,
      message: 'Logged in successfully'
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// @route GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await get('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ message: 'Server error fetching user profile' });
  }
};
