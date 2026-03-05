
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key (first 10 chars):', supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
    try {
        console.log('\nChecking buckets...');
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.error('Error listing buckets:', bucketsError);
            return;
        }

        console.log('Buckets found:', buckets.map(b => b.name));

        const bucketName = 'public-uploads';
        const bucketExists = buckets.some(b => b.name === bucketName);

        if (!bucketExists) {
            console.error(`\nERROR: Bucket '${bucketName}' NOT FOUND!`);
            console.error('Please create this bucket in your Supabase Dashboard -> Storage.');
            console.error('Make sure it is set to "Public".');
            return;
        }

        console.log(`\nBucket '${bucketName}' exists.`);

        // Try to upload a small test file
        console.log('\nAttempting test upload...');
        const testContent = Buffer.from('Hello Supabase Storage!');
        const fileName = `test-upload-${Date.now()}.txt`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, testContent, {
                contentType: 'text/plain',
                upsert: false
            });

        if (uploadError) {
            console.error('Error uploading file:', uploadError);
            return;
        }

        console.log('Upload successful!', uploadData);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        console.log('Public URL:', publicUrl);

        // Clean up (delete the test file)
        console.log('\nCleaning up (deleting test file)...');
        const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove([fileName]);

        if (deleteError) {
            console.error('Error deleting file:', deleteError);
        } else {
            console.log('Test file deleted successfully.');
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testStorage();
