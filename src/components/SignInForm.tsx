
interface SignInFormProps {
  email: string;
  password: string;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggle: () => void;
}

const SignInForm = ({ 
  email, 
  password, 
  loading, 
  onEmailChange, 
  onPasswordChange, 
  onSubmit, 
  onToggle 
}: SignInFormProps) => {
  return (
    <div className="auth-form-container" role="region" aria-label="Sign in form">
      <h1 className="auth-title">Sign in</h1>
      <form onSubmit={onSubmit} className="auth-form">
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
        </div>
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? "Loading..." : "Let's go!"}
        </button>
      </form>
      <div className="auth-toggle-link">
        New user?
        <span onClick={onToggle}>Sign up</span>
      </div>
    </div>
  );
};

export default SignInForm;
