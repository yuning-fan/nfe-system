import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { IconLock, IconMail, IconLoader2, IconAlertCircle } from '@tabler/icons-react';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message.includes('Invalid login credentials') 
        ? '邮箱或密码不正确' 
        : error.message);
      setLoading(false);
    } else {
      // Successfully logged in, navigate to where they came from
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="login-container">
      <div className="login-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="login-logo">
            <span className="logo-icon">NFE</span>
          </div>
          <h2>系统登录</h2>
          <p>欢迎回到新西兰留学生教务管理系统</p>
        </div>

        {errorMsg && (
          <div className="login-error">
            <IconAlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>邮箱账号</label>
            <div className="input-with-icon">
              <IconMail className="input-icon" size={18} />
              <input
                type="email"
                required
                placeholder="admin@nfe.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label>密码</label>
            <div className="input-with-icon">
              <IconLock className="input-icon" size={18} />
              <input
                type="password"
                required
                placeholder="输入您的密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary login-btn" 
            disabled={loading}
          >
            {loading ? <IconLoader2 className="spinner" size={20} /> : '立即登录'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>如有账号问题请联系技术支持。</p>
        </div>
      </div>
    </div>
  );
}
