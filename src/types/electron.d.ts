
interface Window {
  electronAPI?: {
    startPythonServer: () => Promise<void>;
    getServerStatus: () => Promise<boolean>;
  };
}
