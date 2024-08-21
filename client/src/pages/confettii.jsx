import React, { useEffect, useState } from 'react';
import axios from 'axios'; // Ensure axios is installed for making HTTP requests

const Confettii = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/check',{ withCredentials: true });
        setData(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array means this runs once on component mount

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      Confettii
      {/* Render the data if needed */}
      {data && <div>Data: {JSON.stringify(data)}</div>}
    </div>
  );
};

export default Confettii;
