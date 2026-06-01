import { useState, useRef, useEffect } from "react";
import "./index.css";

const API_URL = "http://localhost:8000/chat";

function App() {
  const [messages, setMessages] = useState([
    {
      text: "Welcome to Travixa! I'm your multilingual assistant. I can help you book transport, reserve a table at top restaurants, or arrange exclusive city tours. How can I assist you today?",
      isUser: false,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' or 'bookings'
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState("en-US");
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => prev + (prev ? " " : "") + transcript);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(
        "Speech recognition is not supported in your browser. Please use Chrome or Edge.",
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.lang = speechLang;
      recognitionRef.current.start();
    }
  };

  const handleSend = async (messageOverride = null) => {
    const text = messageOverride || inputText;
    if (!text.trim()) return;

    // Fast path: append user message locally immediately
    setMessages((prev) => [...prev, { text, isUser: true }]);
    if (!messageOverride) setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.session_id) {
        setSessionId(data.session_id);
      }

      if (data.booking) {
        setBookings((prev) => [...prev, data.booking]);
      }

      const botMessage = {
        text: data.reply,
        isUser: false,
        booking: data.booking || null,
        mapData: data.map_data || null,
        placesData: (data.places_data && data.places_data.length > 0) ? data.places_data : null,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, the concierge service is currently offline. Please check your connection to the server.",
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isLoading) {
      handleSend();
    }
  };

  const currentHour = new Date().getHours();
  let greeting = "Good evening";
  if (currentHour < 12) greeting = "Good morning";
  else if (currentHour < 18) greeting = "Good afternoon";

  const quickActions = [
    {
      title: "Airport Transfer",
      subtitle: "Book a luxury car",
      icon: "🚕",
      prompt: "I need to book an airport transfer for my flight tomorrow.",
    },
    {
      title: "Dining Reservation",
      subtitle: "Find local cuisine",
      icon: "🍽️",
      prompt: "Can you recommend and book a high-end local restaurant?",
    },
    {
      title: "City Tour",
      subtitle: "Explore the highlights",
      icon: "🗺️",
      prompt: "What are the best guided city tours available today?",
    },
  ];

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleEmergencyClick = () => {
    // Switch to chat view if not already there
    setActiveTab("chat");

    // Immediately send the emergency prompt message as the user
    handleSend(
      "EMERGENCY: I need help right now. Please ask for my location so you can provide the nearest police station immediately.",
    );
  };

  return (
    <div className={`dashboard-container ${isDarkMode ? "dark" : ""}`}>
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">🌍</span>
          <span>Travixa</span>
        </div>

        <nav className="nav-menu">
          <div
            className={`nav-item ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            <span>💬</span> Concierge Chat
          </div>
          <div
            className={`nav-item ${activeTab === "bookings" ? "active" : ""}`}
            onClick={() => setActiveTab("bookings")}
          >
            <span>📅</span> My Bookings
            {bookings.length > 0 && (
              <span className="booking-badge">{bookings.length}</span>
            )}
          </div>
          <div className="nav-item">
            <span>🏨</span> Hotel Info
          </div>
          <div className="nav-item">
            <span>⚙️</span> Settings
          </div>
        </nav>

        <div className="user-profile">
          <div className="avatar">G</div>
          <div className="user-info">
            <span className="user-name">Guest User</span>
            <span className="user-status">● Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content Dashboard */}
      <main className="main-content">
        <header className="top-bar">
          <div className="greeting">
            <h1>{greeting}, Guest!</h1>
          </div>
          <div className="weather-widget">
            <button
              className="emergency-button"
              title="Emergency Assistance"
              onClick={handleEmergencyClick}
            >
              🚨 Emergency
            </button>
            <span>☀️ 24°C Local Time</span>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title="Toggle Theme"
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        <section className="workspace">
          {activeTab === "chat" ? (
            <>
              {/* Quick Actions Panel */}
              <div className="quick-actions">
                {quickActions.map((action, idx) => (
                  <div
                    key={idx}
                    className="action-card"
                    onClick={() => handleSend(action.prompt)}
                  >
                    <div className="action-icon">{action.icon}</div>
                    <div className="action-text">
                      <span className="action-title">{action.title}</span>
                      <span className="action-subtitle">{action.subtitle}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Interface Container */}
              <div className="chat-board">
                <div className="messages-area">
                  {messages.map((msg, index) => (
                    <div key={index} className="message-group">
                      <div
                        className={`message-wrapper ${msg.isUser ? "user" : "bot"}`}
                      >
                        <div
                          className={`message-avatar ${msg.isUser ? "user" : "bot"}`}
                        >
                          {msg.isUser ? "G" : "🤵"}
                        </div>
                        <div className="message-bubble">{msg.text}</div>
                      </div>

                      {/* Display booking confirmation card if present on this message */}
                      {!msg.isUser && msg.booking && (
                        <div className="booking-confirm-card">
                          <div className="booking-confirm-header">
                            <span className="confirm-icon">🎉</span>
                            <div className="confirm-header-text">
                              <h4>Booking Confirmed!</h4>
                              <span className="booking-id-tag">#{msg.booking.booking_id}</span>
                            </div>
                          </div>
                          <div className="booking-confirm-details">
                            <div className="confirm-row">
                              <span className="label">Service:</span>
                              <span className="val">{msg.booking.service}</span>
                            </div>
                            <div className="confirm-row">
                              <span className="label">Guest Name:</span>
                              <span className="val">{msg.booking.name}</span>
                            </div>
                            <div className="confirm-row">
                              <span className="label">Date & Time:</span>
                              <span className="val">{msg.booking.date}</span>
                            </div>
                            <div className="confirm-row">
                              <span className="label">Price:</span>
                              <span className="val">{msg.booking.price}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Display places data if present on this message */}
                      {!msg.isUser && msg.placesData && (
                        <div className="places-carousel">
                          {msg.placesData.map((place, pIdx) => (
                            <div key={pIdx} className="place-card">
                              <div className="place-header">
                                <h4>{place.name}</h4>
                                <span className="place-rating">
                                  ⭐ {place.rating}
                                </span>
                              </div>
                              <span className="place-type">{place.type}</span>
                              <p className="place-desc">
                                {place.description}
                              </p>
                              <p className="place-address">
                                📍 {place.address}
                              </p>
                              <button
                                className="directions-btn"
                                onClick={() =>
                                  handleSend(
                                    `Get directions to ${place.name} at ${place.address}`,
                                  )
                                }
                              >
                                🧭 Get Directions
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Display map data if present on this message */}
                      {!msg.isUser && msg.mapData && (
                        <div className="message-wrapper bot inline-map-wrapper">
                          <div className="message-avatar bot">🗺️</div>
                          <div className="message-bubble map-bubble">
                            <h4>Directions to {msg.mapData.destination}</h4>
                            <iframe
                              width="100%"
                              height="250"
                              style={{
                                border: 0,
                                borderRadius: "8px",
                                marginTop: "12px",
                              }}
                              loading="lazy"
                              allowFullScreen
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(msg.mapData.dest_lon) - 0.02}%2C${parseFloat(msg.mapData.dest_lat) - 0.02}%2C${parseFloat(msg.mapData.dest_lon) + 0.02}%2C${parseFloat(msg.mapData.dest_lat) + 0.02}&layer=mapnik&marker=${msg.mapData.dest_lat}%2C${msg.mapData.dest_lon}`}
                            ></iframe>
                            <div style={{ marginTop: "12px", textAlign: "center" }}>
                              <a
                                href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${msg.mapData.origin_lat}%2C${msg.mapData.origin_lon}%3B${msg.mapData.dest_lat}%2C${msg.mapData.dest_lon}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-block",
                                  background: "#3b82f6",
                                  color: "white",
                                  padding: "8px 16px",
                                  borderRadius: "20px",
                                  textDecoration: "none",
                                  fontWeight: "600",
                                  fontSize: "0.9rem",
                                }}
                              >
                                📍 View Full Route on OSM ↗
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="message-wrapper bot">
                      <div className="message-avatar bot">🤵</div>
                      <div className="message-bubble typing-indicator">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="input-panel">
                  <div className="input-container">
                    <select
                      className="lang-select"
                      value={speechLang}
                      onChange={(e) => setSpeechLang(e.target.value)}
                      title="Speech Language"
                    >
                      <option value="en-US">EN</option>
                      <option value="es-ES">ES</option>
                      <option value="fr-FR">FR</option>
                      <option value="de-DE">DE</option>
                      <option value="hi-IN">HI</option>
                      <option value="ja-JP">JA</option>
                      <option value="zh-CN">ZH</option>
                      <option value="ar-SA">AR</option>
                      <option value="te-IN">TE</option>
                    </select>
                    <button
                      className={`mic-button ${isListening ? "listening" : ""}`}
                      onClick={toggleListening}
                      title="Voice Input"
                    >
                      {isListening ? "🛑" : "🎤"}
                    </button>
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask the concierge for anything..."
                      disabled={isLoading}
                    />
                    <button
                      className="send-button"
                      onClick={() => handleSend()}
                      disabled={isLoading || !inputText.trim()}
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bookings-view">
              <h2 className="view-title">My Confirmed Bookings</h2>
              {bookings.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📂</span>
                  <p>No bookings yet.</p>
                  <span>Ask the concierge to book something for you!</span>
                </div>
              ) : (
                <div className="bookings-list">
                  {bookings.map((b, idx) => (
                    <div key={idx} className="booking-card">
                      <div className="booking-header">
                        <h3>{b.service}</h3>
                        <span className="booking-id-tag">#{b.booking_id}</span>
                      </div>
                      <div className="booking-details">
                        <p>
                          <strong>Name:</strong> {b.name}
                        </p>
                        <p>
                          <strong>Date & Time:</strong> {b.date}
                        </p>
                        <p>
                          <strong>Price:</strong> {b.price}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
