import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ksvllgzsnzyahqsjuove.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzdmxsZ3pzbnp5YWhxc2p1b3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMjIwNTYsImV4cCI6MjEwMTc5ODA1Nn0.cD7h94JJ8mFBuf7OuB6ioVK6zEoDLbnDHc0t5FdQfis';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearDatabase() {
  try {
    // First sign out any existing session
    await supabase.auth.signOut();
    
    console.log('Clearing database...');
    
    // Delete in order to respect foreign key constraints
    const tables = [
      'listing_comments',
      'listing_photos', 
      'listing_disclosures',
      'listings',
      'profiles'
    ];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (error) {
        console.log(`Note: Could not clear ${table}: ${error.message}`);
      } else {
        console.log(`✓ Cleared ${table}`);
      }
    }
    
    console.log('\nDatabase cleared successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

clearDatabase();
