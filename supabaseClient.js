// Importa a função de criação do client Supabase via CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Cria o cliente com a URL e a chave fornecidas
export const supabase = createClient(
  'https://senlgkvwljqfrduvncov.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbmxna3Z3bGpxZnJkdXZuY292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTQwOTEsImV4cCI6MjA4NzY5MDA5MX0.skGnoVlZsuDSVqQI7EM-mRFRWyn-8lBYbqIJRxslqPs'

)