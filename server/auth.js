const crypto = require("crypto");

// In-memory authentication storage
const authUsers = new Map();

// Create a safe password hash
function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
}

// Register a new user
function registerUser({ name, email, password }) {
  if (!name || !email || !password) {
    return {
      success: false,
      message: "Name, email and password are required."
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (authUsers.has(normalizedEmail)) {
    return {
      success: false,
      message: "User already exists."
    };
  }

  const user = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    trustedDevices: [],
    loginHistory: []
  };

  authUsers.set(normalizedEmail, user);

  return {
    success: true,
    message: "Registration successful.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  };
}

// Login an existing user
function loginUser({ email, password, ip, userAgent }) {
  if (!email || !password) {
    return {
      success: false,
      message: "Email and password are required."
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = authUsers.get(normalizedEmail);

  if (!user) {
    return {
      success: false,
      message: "Invalid email or password."
    };
  }

  const passwordHash = hashPassword(password);

  if (user.passwordHash !== passwordHash) {
    return {
      success: false,
      message: "Invalid email or password."
    };
  }

  const loginRecord = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    ip: ip || "Unknown",
    userAgent: userAgent || "Unknown"
  };

  user.loginHistory.unshift(loginRecord);

  // Keep only the latest 20 login records
  user.loginHistory = user.loginHistory.slice(0, 20);

  return {
    success: true,
    message: "Login successful.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    loginInfo: loginRecord
  };
}

// Get user information
function getAuthUser(email) {
  if (!email) {
    return null;
  }

  return authUsers.get(email.trim().toLowerCase()) || null;
}

// Get login history
function getLoginHistory(email) {
  const user = getAuthUser(email);

  if (!user) {
    return [];
  }

  return user.loginHistory;
}

// Export authentication functions
module.exports = {
  registerUser,
  loginUser,
  getAuthUser,
  getLoginHistory
};