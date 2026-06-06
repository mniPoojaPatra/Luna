const fs = require('fs');
const path = require('path');

// Simple helper to load a .env file into process.env manually without external dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      process.env[key] = value;
    });
    console.log('Loaded local .env file variables.');
  }
}

loadEnv();

const configPath = path.join(__dirname, 'js', 'config.js');
if (fs.existsSync(configPath)) {
  let content = fs.readFileSync(configPath, 'utf8');
  
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  
  if (url && url.trim() !== '') {
    content = content.replace('YOUR_SUPABASE_URL', url.trim());
    console.log('Injected SUPABASE_URL.');
  }
  if (anonKey && anonKey.trim() !== '') {
    content = content.replace('YOUR_SUPABASE_ANON_KEY', anonKey.trim());
    console.log('Injected SUPABASE_ANON_KEY.');
  }
  
  fs.writeFileSync(configPath, content, 'utf8');
} else {
  console.error('config.js file not found at:', configPath);
  process.exit(1);
}

console.log('Build script execution completed.');
