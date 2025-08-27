
import { useState } from 'react';

interface SignUpFormProps {
  email: string;
  password: string;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggle: () => void;
}

const SignUpForm = ({ 
  email, 
  password, 
  loading, 
  onEmailChange, 
  onPasswordChange, 
  onSubmit, 
  onToggle 
}: SignUpFormProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('');
  const [businessType, setBusinessType] = useState('');

  return (
    <div className="auth-form-container" role="region" aria-label="Sign up form">
      <h1 className="auth-title">Sign up</h1>
      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-row">
          <input 
            type="text" 
            placeholder="First Name" 
            className="auth-input" 
            aria-label="First Name" 
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required 
          />
          <input 
            type="text" 
            placeholder="Last Name" 
            className="auth-input" 
            aria-label="Last Name" 
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required 
          />
        </div>
        <div className="auth-row">
          <input 
            type="text" 
            placeholder="Company Name" 
            className="auth-input" 
            aria-label="Company Name" 
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required 
          />
          <input 
            type="text" 
            placeholder="Job Title" 
            className="auth-input" 
            aria-label="Job Title" 
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            required 
          />
        </div>
        <div className="auth-row">
          <input 
            type="email" 
            placeholder="Email" 
            className="auth-input" 
            aria-label="Email" 
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required 
          />
          <input 
            type="tel" 
            placeholder="Phone" 
            className="auth-input" 
            aria-label="Phone number" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required 
          />
        </div>
        <div className="auth-row">
          <input 
            type="password" 
            placeholder="Password" 
            className="auth-input" 
            aria-label="Password" 
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required 
          />
          <input 
            type="password" 
            placeholder="Confirm password" 
            className="auth-input" 
            aria-label="Confirm password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required 
          />
        </div>
        <div className="auth-select-row">
          <select 
            className="auth-select" 
            aria-label="Select country" 
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          >
            <option value="" disabled>Select country</option>
            <option value="us">United States</option>
            <option value="ca">Canada</option>
            <option value="gb">United Kingdom</option>
            <option value="au">Australia</option>
            <option value="de">Germany</option>
            <option value="fr">France</option>
            <option value="in">India</option>
            <option value="jp">Japan</option>
            <option value="cn">China</option>
            <option value="br">Brazil</option>
          </select>
          <select 
            className="auth-select" 
            aria-label="Select business type" 
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
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? "Loading..." : "Confirm!"}
        </button>
      </form>
      <div className="auth-toggle-link">
        Existing user?
        <span onClick={onToggle}>Sign in</span>
      </div>
    </div>
  );
};

export default SignUpForm;
