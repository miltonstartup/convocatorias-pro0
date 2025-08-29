// Database connection test utility
import { supabase } from './supabase'

export async function testDatabaseConnection() {
  console.log('🔍 Testing Supabase database connection...')
  
  try {
    // Test 1: Basic connection
    console.log('📡 Testing basic connection...')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      console.error('❌ Connection test failed:', connectionError)
      return {
        success: false,
        error: connectionError.message,
        details: 'Failed to connect to Supabase database'
      }
    }
    
    console.log('✅ Basic connection successful')
    
    // Test 2: Authentication
    console.log('🔐 Testing authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('ℹ️ No authenticated user (this is normal for initial load)')
    } else if (user) {
      console.log('✅ User authenticated:', user.email)
    } else {
      console.log('ℹ️ No user session (this is normal for initial load)')
    }
    
    // Test 3: Check tables exist
    console.log('📋 Testing table access...')
    const tableTests = [
      { name: 'profiles', query: supabase.from('profiles').select('count').limit(1) },
      { name: 'plans', query: supabase.from('plans').select('count').limit(1) },
      { name: 'convocatorias', query: supabase.from('convocatorias').select('count').limit(1) }
    ]
    
    const tableResults = []
    for (const test of tableTests) {
      try {
        const { error } = await test.query
        if (error) {
          console.log(`⚠️ Table ${test.name}: ${error.message}`)
          tableResults.push({ table: test.name, status: 'error', error: error.message })
        } else {
          console.log(`✅ Table ${test.name}: accessible`)
          tableResults.push({ table: test.name, status: 'success' })
        }
      } catch (err) {
        console.log(`❌ Table ${test.name}: ${err}`)
        tableResults.push({ table: test.name, status: 'error', error: String(err) })
      }
    }
    
    // Test 4: Environment variables
    console.log('🔧 Testing environment variables...')
    const envVars = {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      VITE_OPEN_ROUTER_KEY: import.meta.env.VITE_OPEN_ROUTER_KEY ? '✅ Set' : '❌ Missing',
      VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY ? '✅ Set' : '❌ Missing'
    }
    
    console.log('Environment variables status:', envVars)
    
    return {
      success: true,
      message: 'Database connection test completed',
      results: {
        connection: 'success',
        authentication: user ? 'authenticated' : 'no_session',
        tables: tableResults,
        environment: envVars
      }
    }
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Unexpected error during connection test'
    }
  }
}

// Auto-run test in development
if (import.meta.env.DEV) {
  testDatabaseConnection().then(result => {
    if (result.success) {
      console.log('🎉 Database connection test passed!')
    } else {
      console.error('💥 Database connection test failed:', result.error)
    }
  })
}