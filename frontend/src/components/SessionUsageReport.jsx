import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SessionUsageReport = () => {
  // Default sample session ID, user-editable via input
  const [inputSessionId, setInputSessionId] = useState("60d5ec49f1b2c81128d4e567");
  const [activeSessionId, setActiveSessionId] = useState("60d5ec49f1b2c81128d4e567");
  
  const [usageData, setUsageData] = useState({ applications: [], websites: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsage = async () => {
      setLoading(true);
      setError(null);
      
      // Clean up whitespace to prevent routing/network errors
      const cleanId = activeSessionId.trim();
      const requestUrl = `http://localhost:5000/api/usage/session/${cleanId}`;
      
      console.log("Attempting to fetch from:", requestUrl);

      try {
        const response = await axios.get(requestUrl);
        if (response.data.success) {
          setUsageData(response.data.data);
        }
      } catch (err) {
        console.error("Axios Error Details:", err);
        setError(err.response?.data?.message || err.message || 'Failed to load usage data.');
        setUsageData({ applications: [], websites: [] });
      } finally {
        setLoading(false);
      }
    };

    if (activeSessionId) {
      fetchUsage();
    }
  }, [activeSessionId]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (inputSessionId.trim()) {
      setActiveSessionId(inputSessionId.trim());
    }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h2>SmartLab Guardian - Session Usage Report</h2>

      {/* Dynamic Session Input Form */}
      <form onSubmit={handleSearch} style={{ margin: '20px 0', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={inputSessionId}
          onChange={(e) => setInputSessionId(e.target.value)}
          placeholder="Enter Session ID (e.g., 60d5ec49f1b2c...)"
          style={{ flex: '1', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button 
          type="submit" 
          style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Load Report
        </button>
      </form>

      <p style={{ color: '#555' }}><strong>Active Session ID:</strong> {activeSessionId}</p>

      <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #ddd' }} />

      {/* Loading & Error States */}
      {loading && <div style={{ padding: '20px', color: '#2563eb' }}>Loading session usage activity...</div>}
      {error && <div style={{ padding: '20px', color: 'red', backgroundColor: '#fee2e2', borderRadius: '4px' }}>Error: {error}</div>}

      {!loading && !error && (
        <>
          {/* Application Usage Table */}
          <h3>Application Activity</h3>
          {usageData.applications.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No application activity recorded for this session.</p>
          ) : (
            <table border="1" cellPadding="12" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f4f6f8', textAlign: 'left' }}>
                  <th>Application Name</th>
                  <th>Start Time</th>
                  <th>Duration (Mins)</th>
                </tr>
              </thead>
              <tbody>
                {usageData.applications.map((app) => (
                  <tr key={app._id}>
                    <td>{app.app_name}</td>
                    <td>{new Date(app.start_time).toLocaleString()}</td>
                    <td>{app.duration} mins</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Website Activity Table */}
          <h3>Web Browsing History</h3>
          {usageData.websites.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No website activity recorded for this session.</p>
          ) : (
            <table border="1" cellPadding="12" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f4f6f8', textAlign: 'left' }}>
                  <th>Visited URL</th>
                  <th>Visit Time</th>
                </tr>
              </thead>
              <tbody>
                {usageData.websites.map((site) => (
                  <tr key={site._id}>
                    <td>
                      <a href={site.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc' }}>
                        {site.url}
                      </a>
                    </td>
                    <td>{new Date(site.visit_time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default SessionUsageReport;