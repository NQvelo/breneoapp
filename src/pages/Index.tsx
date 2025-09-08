
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to landing page
    navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-breneo-lightgray px-3">
      <div className="text-center">
        <img src="/lovable-uploads/6bee4aa6-3a7f-4806-98bd-dc73a1955812.png" alt="Breneo Logo" className="h-16 mx-auto mb-4" />
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    </div>
  );
};

export default Index;
