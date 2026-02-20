"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const supabase_js_1 = require("@supabase/supabase-js");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Supabase setup
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Ensure uploads directory exists
const uploadsDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// File upload configuration
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});
// Routes
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'KontactShare API is running' });
});
// Get profile by unique code (public access)
app.get('/api/profiles/:uniqueCode', async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('unique_code', uniqueCode)
            .single();
        if (error || !data) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        // Convert database field names to frontend format
        const profile = {
            id: data.admin_id,
            pin: data.pin,
            uniqueCode: data.unique_code,
            profilePhoto: data.profile_photo_url,
            fullName: data.full_name,
            email: data.email,
            jobTitle: data.job_title,
            companyName: data.company_name,
            mobilePrimary: data.mobile_primary,
            landlineNumber: data.landline_number,
            address: data.address,
            facebookLink: data.facebook_link,
            instagramLink: data.instagram_link,
            tiktokLink: data.tiktok_link,
            whatsappNumber: data.whatsapp_number,
            websiteLink: data.website_link,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
        res.json(profile);
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Create new profile (admin only)
app.post('/api/profiles', async (req, res) => {
    try {
        const profileData = req.body;
        // Convert frontend format to database format
        const dbProfile = {
            admin_id: profileData.id,
            pin: profileData.pin,
            unique_code: profileData.uniqueCode,
            profile_photo_url: profileData.profilePhoto,
            full_name: profileData.fullName,
            email: profileData.email,
            job_title: profileData.jobTitle,
            company_name: profileData.companyName,
            mobile_primary: profileData.mobilePrimary,
            landline_number: profileData.landlineNumber,
            address: profileData.address,
            facebook_link: profileData.facebookLink,
            instagram_link: profileData.instagramLink,
            tiktok_link: profileData.tiktokLink,
            whatsapp_number: profileData.whatsappNumber,
            website_link: profileData.websiteLink
        };
        const { data, error } = await supabase
            .from('profiles')
            .insert([dbProfile])
            .select()
            .single();
        if (error) {
            console.error('Database error:', error);
            return res.status(400).json({ error: error.message });
        }
        // Convert back to frontend format
        const profile = {
            id: data.admin_id,
            pin: data.pin,
            uniqueCode: data.unique_code,
            profilePhoto: data.profile_photo_url,
            fullName: data.full_name,
            email: data.email,
            jobTitle: data.job_title,
            companyName: data.company_name,
            mobilePrimary: data.mobile_primary,
            landlineNumber: data.landline_number,
            address: data.address,
            facebookLink: data.facebook_link,
            instagramLink: data.instagram_link,
            tiktokLink: data.tiktok_link,
            whatsappNumber: data.whatsapp_number,
            websiteLink: data.website_link,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
        res.status(201).json(profile);
    }
    catch (error) {
        console.error('Error creating profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Update profile (owner only)
app.put('/api/profiles/:uniqueCode', async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const updateData = req.body;
        // Convert frontend format to database format
        const dbUpdateData = {
            profile_photo_url: updateData.profilePhoto,
            full_name: updateData.fullName,
            email: updateData.email,
            job_title: updateData.jobTitle,
            company_name: updateData.companyName,
            mobile_primary: updateData.mobilePrimary,
            landline_number: updateData.landlineNumber,
            address: updateData.address,
            facebook_link: updateData.facebookLink,
            instagram_link: updateData.instagramLink,
            tiktok_link: updateData.tiktokLink,
            whatsapp_number: updateData.whatsappNumber,
            website_link: updateData.websiteLink,
            updated_at: new Date().toISOString()
        };
        const { data, error } = await supabase
            .from('profiles')
            .update(dbUpdateData)
            .eq('unique_code', uniqueCode)
            .select()
            .single();
        if (error) {
            console.error('Database error:', error);
            return res.status(400).json({ error: error.message });
        }
        // Convert back to frontend format
        const profile = {
            id: data.admin_id,
            pin: data.pin,
            uniqueCode: data.unique_code,
            profilePhoto: data.profile_photo_url,
            fullName: data.full_name,
            email: data.email,
            jobTitle: data.job_title,
            companyName: data.company_name,
            mobilePrimary: data.mobile_primary,
            landlineNumber: data.landline_number,
            address: data.address,
            facebookLink: data.facebook_link,
            instagramLink: data.instagram_link,
            tiktokLink: data.tiktok_link,
            whatsappNumber: data.whatsapp_number,
            websiteLink: data.website_link,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
        res.json(profile);
    }
    catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Upload profile photo
app.post('/api/profiles/:uniqueCode/upload', upload.single('photo'), async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const fileUrl = `/uploads/${file.filename}`;
        const { data, error } = await supabase
            .from('profiles')
            .update({
            profile_photo_url: fileUrl,
            updated_at: new Date().toISOString()
        })
            .eq('unique_code', uniqueCode)
            .select()
            .single();
        if (error) {
            console.error('Database error:', error);
            return res.status(400).json({ error: error.message });
        }
        // Convert back to frontend format
        const profile = {
            id: data.admin_id,
            pin: data.pin,
            uniqueCode: data.unique_code,
            profilePhoto: data.profile_photo_url,
            fullName: data.full_name,
            email: data.email,
            jobTitle: data.job_title,
            companyName: data.company_name,
            mobilePrimary: data.mobile_primary,
            landlineNumber: data.landline_number,
            address: data.address,
            facebookLink: data.facebook_link,
            instagramLink: data.instagram_link,
            tiktokLink: data.tiktok_link,
            whatsappNumber: data.whatsapp_number,
            websiteLink: data.website_link,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
        res.json(profile);
    }
    catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Verify credentials (ID + PIN)
app.post('/api/profiles/:uniqueCode/verify', async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const { id, pin } = req.body;
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('unique_code', uniqueCode)
            .eq('admin_id', id)
            .eq('pin', pin)
            .single();
        if (error || !data) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        res.json({ success: true, message: 'Credentials verified' });
    }
    catch (error) {
        console.error('Error verifying credentials:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Change PIN
app.put('/api/profiles/:uniqueCode/pin', async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const { newPin, currentPin } = req.body;
        // First verify current PIN
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('pin')
            .eq('unique_code', uniqueCode)
            .single();
        if (fetchError || !profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        if (profile.pin !== currentPin) {
            return res.status(401).json({ error: 'Current PIN is incorrect' });
        }
        // Update PIN
        const { data, error } = await supabase
            .from('profiles')
            .update({
            pin: newPin,
            updated_at: new Date().toISOString()
        })
            .eq('unique_code', uniqueCode)
            .select()
            .single();
        if (error) {
            console.error('Database error:', error);
            return res.status(400).json({ error: error.message });
        }
        res.json({ success: true, message: 'PIN updated successfully' });
    }
    catch (error) {
        console.error('Error updating PIN:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Delete profile (admin only)
app.delete('/api/profiles/:uniqueCode', async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('unique_code', uniqueCode);
        if (error) {
            console.error('Database error:', error);
            return res.status(400).json({ error: error.message });
        }
        res.json({ success: true, message: 'Profile deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
    }
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 KontactShare API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
});
//# sourceMappingURL=index.js.map