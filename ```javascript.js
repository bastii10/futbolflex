```javascript
// ...existing code...

const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: nombre, email, contraseña y teléfono.' });
    }
    // ...existing code...
    return res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone, 
        role: user.role 
      } 
    });
  } catch (err) {
    // ...existing code...
  }
};

const login = async (req, res) => {
  try {
    // ...existing code...
    return res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone, 
        role: user.role 
      } 
    });
  } catch (err) {
    // ...existing code...
  }
};

// ...existing code...
```