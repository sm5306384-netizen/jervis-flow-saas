import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

export default function WhatsAppConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const location = useLocation();
  const businessId = location.state?.businessId;

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_WHATSAPP_BRIDGE}/qr-status`);
        setIsConnected(response.data.connected);
        if (response.data.phone_number) setPhoneNumber(response.data.phone_number);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    if (isConnected && phoneNumber && businessId) {
      try {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/v1/whatsapp/connect`, { business_id: businessId, phone_number: phoneNumber });
        alert('WhatsApp connected!');
      } catch (error) {
        alert('Error');
      }
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Connect WhatsApp</h1>
      {isConnected ? (
        <>
          <h2 style={{ color: 'green' }}>? Connected!</h2>
          <button onClick={handleConnect} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>Confirm</button>
        </>
      ) : (
        <h2 style={{ color: 'orange' }}>? Waiting...</h2>
      )}
    </div>
  );
}

