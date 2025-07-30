
// Supabase integration layer (converted from TypeScript types)

// Database types and utilities
class DatabaseTypes {
  static getDefaultProfile() {
    return {
      id: null,
      email: null,
      last_greeted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  static getDefaultNote() {
    return {
      id: null,
      user_id: null,
      title: '',
      content: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  static getDefaultDocumentUpload() {
    return {
      id: null,
      user_id: null,
      filename: '',
      file_type: '',
      file_size: 0,
      file_content: '',
      processed_content: null,
      uploaded_at: new Date().toISOString()
    };
  }
  
  static getDefaultUserHistory() {
    return {
      id: null,
      user_id: null,
      message: '',
      response: '',
      intent: null,
      metadata: null,
      created_at: new Date().toISOString()
    };
  }
}

// Supabase client wrapper
class SupabaseClient {
  constructor() {
    this.client = supabase;
  }
  
  // Auth methods
  async signUp(email, password) {
    return await this.client.auth.signUp({ email, password });
  }
  
  async signIn(email, password) {
    return await this.client.auth.signInWithPassword({ email, password });
  }
  
  async signOut() {
    return await this.client.auth.signOut();
  }
  
  async getSession() {
    return await this.client.auth.getSession();
  }
  
  onAuthStateChange(callback) {
    return this.client.auth.onAuthStateChange(callback);
  }
  
  // Database methods
  from(table) {
    return this.client.from(table);
  }
  
  // Edge functions
  async invokeFunction(functionName, options = {}) {
    return await this.client.functions.invoke(functionName, options);
  }
  
  // Storage methods
  storage() {
    return this.client.storage;
  }
}

// Initialize global Supabase client
window.SupabaseClient = new SupabaseClient();
window.DatabaseTypes = DatabaseTypes;
