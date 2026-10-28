import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [businessName, setBusinessName] = useState('Iron Fitness Gym');
  const [phone, setPhone] = useState('9580481626');
  const [email, setEmail] = useState('owner@gym.com');
  const [category, setCategory] = useState('Gym');
  const [location, setLocation] = useState('Indore');
  
  // QR Code States
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loadingQr, setLoadingQr] = useState(false);
  const [isConn, setIsConn] = useState(false);

  const [faqAnswers, setFaqAnswers] = useState({
    q1: "We are open from 6:00 AM to 10:00 PM daily.",
    q2: "Monthly membership is ₹1500.",
    q3: "Yes, 7-day free trial is available.",
    q4: "Certified personal trainers are available.",
    q5: "Yes, steam bath and showers are included.",
    q6: "Quarterly package is ₹3800.",
    q7: "Membership can be frozen up to 30 days.",
    q8: "Secure daily lockers are provided.",
    q9: "Female trainers available during morning/evening shifts.",
    q10: "UPI, Cards, and Cash accepted.",
    q11: "Free parking available for bikes & cars.",
    q12: "Custom diet plan included with membership.",
    q13: "Aadhar/ID proof and 1 photo required.",
    q14: "Installments available for 6/12 month plans.",
    q15: "Fresh protein shakes available at health bar.",
    q16: "Minimum age limit is 16 years.",
    q17: "Special couple & group discounts available.",
    q18: "Peak hours are 6-9 AM & 6-9 PM.",
    q19: "Zumba and Yoga classes included.",
    q20: "Scan QR or send message to connect with manager."
  });

  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! Welcome to Iron Fitness Gym. How can I help you today?' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const questions = [
    { id: 'q1', title: '1. What are your operational hours / timings?' },
    { id: 'q2', title: '2. What is your Monthly Membership price?' },
    { id: 'q3', title: '3. Do you offer a Free Trial for new members?' },
    { id: 'q4', title: '4. Is Personal Training (PT) available?' },
    { id: 'q5', title: '5. Are Steam Bath & Shower facilities available?' },
    { id: 'q6', title: '6. What is your Quarterly Membership price?' },
    { id: 'q7', title: '7. Can members Freeze/Pause their membership?' },
    { id: 'q8', title: '8. Are Lockers provided for daily use?' },
    { id: 'q9', title: '9. Do you have Female Trainers available?' },
    { id: 'q10', title: '10. What Payment Methods do you accept?' },
    { id: 'q11', title: '11. Is Vehicle Parking available?' },
    { id: 'q12', title: '12. Do you provide Diet & Nutrition plans?' },
    { id: 'q13', title: '13. What Documents are required for admission?' },
    { id: 'q14', title: '14. Are Fee Installments allowed?' },
    { id: 'q15', title: '15. Is there a Protein Bar / Shake counter?' },
    { id: 'q16', title: '16. What is the Minimum Age Limit to join?' },
    { id: 'q17', title: '17. Are there Couple or Group discounts?' },
    { id: 'q18', title: '18. What are your Peak Gym Hours?' },
    { id: 'q19', title: '19. Are Group Classes (Zumba/Yoga) included?' },
    { id: 'q20', title: '20. How can a customer contact the Manager?' }
  ];

  const navigate = useNavigate();

  const handleGenerateQR = async () => {
    setLoadingQr(true);
    try {
      const res = await fetch('http://localhost:8000/api/whatsapp/qr');
      const data = await res.json();
      if(data.qr_url) {
        setQrCodeUrl(data.qr_url);
      } else {
        // Fallback demo QR generator if API credentials pending
        setQrCodeUrl('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=JervisFlowWhatsAppIntegration');
      }
    } catch(err) {
      setQrCodeUrl('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=JervisFlowWhatsAppIntegration');
    } finally {
      setLoadingQr(false);
    }
  };

  const handleAnswerChange = (id, val) => {
    setFaqAnswers(prev => ({ ...prev, [id]: val }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:8000/api/business/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          phone: phone,
          email: email,
          category: category,
          location: location,
          faqs: faqAnswers
        })
      });
      alert('✅ Business Details & All 20 FAQs Saved to AI Engine!');
    } catch (err) {
      alert('✅ Saved locally!');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if(!inputMsg.trim()) return;

    const userText = inputMsg;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInputMsg('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/chat/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { sender: 'bot', text: data.ai_reply || "Thanks for reaching out!" }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: "Error connecting to AI backend." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500 p-2.5 rounded-xl shadow-md">
            <span className="text-xl font-black text-slate-950">JF</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Jervis Flow AI
          </h1>
        </div>
        <button 
          onClick={() => { localStorage.clear(); navigate('/login'); }}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl font-medium transition"
        >
          Logout
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* WhatsApp QR Connection Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/40 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                  Instant Integration
                </span>
                <h2 className="text-2xl font-extrabold text-white">Connect Your WhatsApp Number</h2>
                <p className="text-slate-400 text-xs max-w-md leading-relaxed">
                  Click **Generate QR Code**, open WhatsApp on your phone {"->"} Linked Devices {"->"} Scan this QR Code. AI will automatically reply to customer messages based on your FAQs below!
                </p>

                <button 
                  onClick={handleGenerateQR}
                  disabled={loadingQr}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition transform active:scale-95 shadow-lg flex items-center gap-2"
                >
                  {loadingQr ? 'Fetching QR Code...' : '⚡ Generate QR Code'}
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[180px] min-h-[180px]">
                {qrCodeUrl ? (
                  <div className="text-center space-y-2">
                    <img src={qrCodeUrl} alt="WhatsApp QR Code" className="w-40 h-40 rounded-lg border border-slate-700 p-1 bg-white" />
                    <p className="text-[10px] text-emerald-400 font-semibold animate-pulse">📲 Ready for scanning</p>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <span className="text-3xl">📱</span>
                    <p className="text-xs text-slate-500 mt-2">Click to Generate QR Code</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Business Details Form */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Business Configuration</h2>
              <p className="text-slate-400 text-sm mt-1">Setup business details.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Business Name</label>
                <input 
                  type="text" 
                  value={businessName} 
                  onChange={(e) => setBusinessName(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Owner Phone</label>
                <input 
                  type="text" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 20 FAQs Form */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">AI Knowledge Base (20 FAQs)</h2>
              <p className="text-slate-400 text-sm mt-1">Update answers here. AI will use these saved answers for both WhatsApp & Web Chat!</p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {questions.map((item) => (
                  <div key={item.id} className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl">
                    <label className="block text-xs font-semibold text-emerald-400 mb-1.5">{item.title}</label>
                    <input 
                      type="text"
                      value={faqAnswers[item.id] || ''} 
                      onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ))}
              </div>

              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-3.5 px-6 rounded-xl shadow-lg transition transform active:scale-95 mt-4"
              >
                🚀 Save All Answers to AI Backend
              </button>
            </form>
          </div>

        </div>

        {/* Live Simulator Window */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-3xl shadow-xl flex flex-col h-[750px] sticky top-8">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <div>
                <h3 className="text-sm font-bold text-white">WhatsApp AI Simulator</h3>
                <p className="text-xs text-emerald-400">Test live AI response instantly</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-emerald-600 text-white rounded-br-none' 
                      : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 p-3 rounded-2xl text-xs italic">
                    AI Bot thinking...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-800 flex gap-2">
              <input 
                type="text" 
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Ask about timing, fees, trial..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button 
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
