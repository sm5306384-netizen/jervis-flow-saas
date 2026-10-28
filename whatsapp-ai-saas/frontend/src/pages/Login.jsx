import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/v1/auth/signup`, { phone, password, email });
      }
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/v1/auth/login`, { phone, password });
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user_id', response.data.user.id);
      navigate('/dashboard');
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h1>{isSignup ? 'Sign Up' : 'Login'}</h1>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
        {isSignup && <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />}
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>{loading ? 'Loading...' : (isSignup ? 'Sign Up' : 'Login')}</button>
      </form>
      <p style={{ marginTop: '10px' }}><button onClick={() => setIsSignup(!isSignup)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}>{isSignup ? 'Login' : 'Sign Up'}</button></p>
    </div>
  );
}

