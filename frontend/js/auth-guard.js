// Client-side authentication guard for LifeQR
const API_BASE = '/api/v1';

window.verifyAuth = async function() {
  const token = localStorage.getItem('token');
  
  // We make a call to /verify route (which checks both Header and httpOnly cookies)
  try {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}/auth/verify`, {
      method: 'GET',
      headers
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
  } catch (error) {
    console.error('Auth verification error:', error);
  }
  
  // Clear token if invalid
  localStorage.removeItem('token');
  return null;
};

window.checkDashboardAccess = async function(allowedRoles = []) {
  const user = await window.verifyAuth();
  
  if (!user) {
    window.location.href = 'lifeqr_login.html';
    return;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to correct dashboard based on actual role
    redirectUserToDashboard(user.role);
    return;
  }
  
  return user;
};

window.checkAuthPagesAccess = async function() {
  const user = await window.verifyAuth();
  if (user) {
    redirectUserToDashboard(user.role);
  }
};

function redirectUserToDashboard(role) {
  if (role === 'patient') {
    window.location.href = 'patient_dashboard.html';
  } else if (role === 'doctor') {
    window.location.href = 'doctor_dashboard.html';
  } else if (role === 'crew') {
    window.location.href = 'CrewAmbulance_dashboard.html';
  } else if (role === 'admin') {
    window.location.href = 'admin_dashboard.html';
  } else {
    window.location.href = 'index.html';
  }
}

window.logout = async function() {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  } catch (err) {
    console.error('Logout request failed:', err);
  }
  localStorage.clear();
  window.location.href = 'index.html';
};
