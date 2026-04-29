import { useNavigate } from 'react-router-dom';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>Access Denied</h1>
      <p>You don't have permission to view this page.</p>
      <button onClick={() => navigate('/login')}>Go to Login</button>
    </div>
  );
}