import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SessionUsageReport = ({ sessionId = "60d5ec49f1b2c81128d4e567" }) => {
  const [usageData, setUsageData] = useState({ applications: [], websites: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/usage/session/${sessionId}`);
        if (response.data.success) {
          setUsageData(response.data.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to load usage data.');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchUsage();
    }
  }, [sessionId]);

  if (loading) return <div style={{ padding: '20px' }}>Loading session usage activity...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h2>SmartLab Guardian - Session Usage Report</h2>
      <p style={{ color: '#555' }}><strong>Session ID:</strong> {sessionId}</p>

      <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #ddd' }} />

      {/* Application Usage Table */}
      <h3>Application Activity</h3>
      {usageData.applications.length === 0 ? (
        <p>No application activity recorded for this session.</p>
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
        <p>No website activity recorded for this session.</p>
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
    </div>
  );
};

export default SessionUsageReport;