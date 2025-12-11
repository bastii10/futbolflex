import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Reservations from './pages/Reservations';
import Fields from './pages/Fields';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import AdminDashboard from './pages/AdminDashboard';
import UserHistory from './pages/UserHistory';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/canchas" element={<Fields />} />
            <Route path="/reservas" element={<Reservations />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/historial" element={<UserHistory />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
