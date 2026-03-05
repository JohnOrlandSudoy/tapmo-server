
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // This is usually too weak to create buckets

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
    try {
        console.log('Attempting to create bucket "public-uploads"...');
        const { data, error } = await supabase.storage.createBucket('public-uploads', {
            public: true,
            fileSizeLimit: 10485760, // 10MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
        });

        if (error) {
            console.error('Failed to create bucket:', error.message);
            console.log('You likely need to create this manually in the Supabase Dashboard.');
        } else {
            console.log('Bucket created successfully!');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

createBucket();
