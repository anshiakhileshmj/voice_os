
; NSIS installer script for MJAK Automation
; This script ensures Python dependencies are installed

!macro customInstall
  ; Install Python dependencies during installation
  DetailPrint "Installing Python dependencies..."
  ExecWait '"$INSTDIR\resources\python-dist\install_dependencies.bat"'
!macroend
