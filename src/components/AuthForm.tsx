
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';

const AuthForm = () => {
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all fields.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email, password);
        toast({
          title: "Sign Up Successful",
          description: "You have successfully signed up. Redirecting...",
        });
      } else {
        await signIn(email, password);
        toast({
          title: "Sign In Successful",
          description: "You have successfully signed in. Redirecting...",
        });
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate. Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    setIsSignUp(!isSignUp);
    // Reset form fields when switching
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setCompanyName('');
    setJobTitle('');
    setPhone('');
    setCountry('');
    setBusinessType('');
  };

  return (
    <div className="auth-form-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap');
        
        .auth-form-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          font-family: 'Fredoka One', cursive, sans-serif;
        }
        
        .flip-card__back {
          width: 550px;
          min-width: 320px;
          max-width: 95vw;
          height: auto;
          padding: 20px 18px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: white;
          gap: 16px;
          border-radius: 5px;
          border: 2px solid #323232;
          box-shadow: 4px 4px #323232;
          color: #323232;
          box-sizing: border-box;
          margin: 0 auto;
        }
        
        .title {
          margin: 20px 0;
          font-size: 25px;
          font-weight: 900;
          text-align: center;
          color: #323232;
        }
        
        .auth-form {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 100%;
        }
        
        .row-top {
          display: flex;
          gap: 12px;
          justify-content: center;
          width: 100%;
        }
        
        .phone-country-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          width: 100%;
          align-items: center;
        }
        
        .flip-card__input, .phone-number, .country-select {
          height: 40px;
          border-radius: 5px;
          border: 2px solid #323232;
          background-color: white;
          box-shadow: 4px 4px #323232;
          font-size: 15px;
          font-weight: 600;
          color: #323232;
          padding: 5px 10px;
          outline: none;
          box-sizing: border-box;
          flex: 1;
          min-width: 0;
          max-width: 250px;
        }
        
        .flip-card__input::placeholder, .phone-number::placeholder {
          color: #666;
          opacity: 0.8;
        }
        
        .flip-card__input:focus, .phone-number:focus, .country-select:focus {
          border: 2px solid #666;
          outline: none;
        }
        
        .button-confirm {
          margin: 18px auto 6px auto;
          width: 120px;
          height: 40px;
          border-radius: 5px;
          border: 2px solid #323232;
          background-color: white;
          box-shadow: 4px 4px #323232;
          font-size: 17px;
          font-weight: 600;
          color: #323232;
          cursor: pointer;
          display: block;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        
        .button-confirm:active {
          box-shadow: 0 0 #323232;
          transform: translate(3px, 3px);
        }
        
        .button-confirm:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .signin-signup-link {
          text-align: center;
          margin-top: 2px;
          margin-bottom: 2px;
          font-size: 16px;
        }
        
        .signin-signup-link span {
          color: #666;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
        }
        
        @media (max-width: 700px) {
          .flip-card__back {
            width: 98vw;
            min-width: 0;
            padding: 12px;
          }
          .button-confirm {
            width: 100%;
          }
        }
      `}</style>
      
      <div className="flip-card__back">
        <h1 className="title">{isSignUp ? 'Sign up' : 'Sign in'}</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignUp ? (
            <>
              <div className="row-top">
                <input
                  type="text"
                  placeholder="First Name"
                  className="flip-card__input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  className="flip-card__input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div className="row-top">
                <input
                  type="text"
                  placeholder="Company Name"
                  className="flip-card__input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Job Title"
                  className="flip-card__input"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                />
              </div>
              <div className="row-top">
                <input
                  type="email"
                  placeholder="Email"
                  className="flip-card__input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  className="phone-number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="row-top">
                <input
                  type="password"
                  placeholder="Password"
                  className="flip-card__input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm password"
                  className="flip-card__input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div className="phone-country-row">
                <select 
                  className="country-select" 
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                >
                  <option value="" disabled>Select country</option>
                  <option value="af">Afghanistan</option>
                  <option value="al">Albania</option>
                  <option value="dz">Algeria</option>
                  <option value="us">United States</option>
                  <option value="gb">United Kingdom</option>
                  <option value="ca">Canada</option>
                  <option value="au">Australia</option>
                  <option value="in">India</option>
                  <option value="de">Germany</option>
                  <option value="fr">France</option>
                  <option value="jp">Japan</option>
                  <option value="br">Brazil</option>
                  <option value="mx">Mexico</option>
                  <option value="cn">China</option>
                  <option value="ru">Russia</option>
                </select>
                <select 
                  className="country-select"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  required
                >
                  <option value="" disabled>Select business type</option>
                  <option value="cryptocurrency-exchange">Cryptocurrency Exchange</option>
                  <option value="payment-processor">Payment Processor</option>
                  <option value="digital-wallet-provider">Digital Wallet Provider</option>
                  <option value="defi-protocol">DeFi Protocol</option>
                  <option value="banking-institution">Banking Institution</option>
                  <option value="fintech-startup">Fintech Startup</option>
                  <option value="compliance-firm">Compliance Firm</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="row-top">
                <input
                  type="email"
                  placeholder="Email"
                  className="flip-card__input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="row-top">
                <input
                  type="password"
                  placeholder="Password"
                  className="flip-card__input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}
          
          <button 
            type="submit" 
            className="button-confirm" 
            disabled={loading}
          >
            {loading ? "Loading..." : (isSignUp ? "Confirm!" : "Let's go")}
          </button>
        </form>
        
        <div className="signin-signup-link">
          {isSignUp ? "Existing user?" : "New user?"}
          <span onClick={handleToggle}>
            {isSignUp ? "Sign in" : "Sign up"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
