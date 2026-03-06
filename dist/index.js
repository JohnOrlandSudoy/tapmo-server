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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Auth
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.admin = decoded;
        return next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
// Ensure uploads directory exists
const uploadsDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// File upload configuration
const storage = multer_1.default.memoryStorage();
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
// Helper to upload to Supabase Storage
async function uploadToSupabase(file, folder = 'uploads') {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const extension = path_1.default.extname(file.originalname);
    const filename = `${folder}/${timestamp}-${random}${extension}`;
    const { data, error } = await supabase.storage
        .from('public-uploads') // Using 'public-uploads' bucket
        .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false
    });
    if (error) {
        throw error;
    }
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('public-uploads')
        .getPublicUrl(filename);
    return publicUrl;
}
// Routes
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'TapBoss API is running' });
});
// Admin login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const { data: admin, error } = await supabase
            .from('admins')
            .select('id, email, password_hash, role')
            .eq('email', email)
            .single();
        if (error || !admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const ok = await bcryptjs_1.default.compare(password, admin.password_hash);
        if (!ok) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ sub: admin.id, email: admin.email, role: admin.role || 'admin' }, JWT_SECRET, { expiresIn: '8h' });
        return res.json({ token });
    }
    catch (e) {
        console.error('Admin login error:', e);
        return res.status(500).json({ error: 'Server error' });
    }
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
        res.setHeader('Cache-Control', 'no-store');
        // Convert database field names to frontend format
        const profile = {
            id: data.admin_id,
            pin: data.pin,
            uniqueCode: data.unique_code,
            profilePhoto: data.profile_photo_url,
            fullName: data.full_name,
            email: data.email,
            status: data.status,
            jobTitle: data.job_title,
            companyName: data.company_name,
            location: data.location,
            mobilePrimary: data.mobile_primary,
            landlineNumber: data.landline_number,
            address: data.address,
            facebookLink: data.facebook_link,
            instagramLink: data.instagram_link,
            tiktokLink: data.tiktok_link,
            whatsappNumber: data.whatsapp_number,
            viberNumber: data.viber_number,
            googleMapLink: data.google_map_link,
            websiteLink: data.website_link,
            aboutText: data.about_text,
            themeColor: data.theme_color,
            logo: data.logo_url,
            is_pro: data.is_pro,
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
// Utility functions for auto-generation
function generateUniqueCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function generateIdCard() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}${month}${day}0000${random}`;
}
function generatePin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
app.post('/api/profiles', requireAdmin, async (req, res) => {
    try {
        const profileData = req.body;
        // Auto-generate fields if not provided
        const uniqueCode = profileData.uniqueCode || generateUniqueCode();
        const idCard = profileData.id || generateIdCard();
        const pin = profileData.pin || generatePin();
        // Set default profile photo if not provided
        const profilePhoto = profileData.profilePhoto || '/uploads/tapbos.png';
        // Convert frontend format to database format
        const dbProfile = {
            admin_id: idCard,
            pin: pin,
            unique_code: uniqueCode,
            profile_photo_url: profilePhoto,
            full_name: profileData.fullName || 'Default Name',
            email: profileData.email || 'default@example.com',
            job_title: profileData.jobTitle || 'Default Job Title',
            company_name: profileData.companyName || 'Default Company',
            location: profileData.location || 'Default Location',
            mobile_primary: profileData.mobilePrimary || '000-000-0000',
            landline_number: profileData.landlineNumber || '000-000-0000',
            address: profileData.address || 'Default Address',
            facebook_link: profileData.facebookLink || 'Update your Facebook Link',
            instagram_link: profileData.instagramLink || 'Update your Instagram Link',
            tiktok_link: profileData.tiktokLink || 'Update your TikTok Link',
            whatsapp_number: profileData.whatsappNumber || 'Update your WhatsApp Number',
            viber_number: profileData.viberNumber || 'Update your Viber Number',
            website_link: profileData.websiteLink || 'Update your web link',
            about_text: profileData.aboutText || 'Update your About text',
            theme_color: null,
            logo_url: profileData.logo || null
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
        // Generate profile link
        const profileLink = `https://www.tapboss.cards/myprofile/${uniqueCode}`;
        // Convert back to frontend format
        const profile = {
            id: data.admin_id,
            pin: data.pin,
            uniqueCode: data.unique_code,
            profilePhoto: data.profile_photo_url,
            fullName: data.full_name,
            email: data.email,
            status: data.status,
            jobTitle: data.job_title,
            companyName: data.company_name,
            location: data.location,
            mobilePrimary: data.mobile_primary,
            landlineNumber: data.landline_number,
            address: data.address,
            facebookLink: data.facebook_link,
            instagramLink: data.instagram_link,
            tiktokLink: data.tiktok_link,
            whatsappNumber: data.whatsapp_number,
            viberNumber: data.viber_number,
            googleMapLink: data.google_map_link,
            websiteLink: data.website_link,
            aboutText: data.about_text,
            themeColor: data.theme_color,
            logo: data.logo_url,
            is_pro: data.is_pro,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
        res.status(201).json({
            ...profile,
            profileLink: profileLink
        });
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
            status: updateData.status,
            job_title: updateData.jobTitle,
            company_name: updateData.companyName,
            location: updateData.location,
            mobile_primary: updateData.mobilePrimary,
            landline_number: updateData.landlineNumber,
            address: updateData.address,
            facebook_link: updateData.facebookLink,
            instagram_link: updateData.instagramLink,
            tiktok_link: updateData.tiktokLink,
            whatsapp_number: updateData.whatsappNumber,
            viber_number: updateData.viberNumber,
            website_link: updateData.websiteLink,
            about_text: updateData.aboutText,
            logo_url: updateData.logo,
            updated_at: new Date().toISOString()
        };
        // Optional PIN update (6 digits)
        if (typeof updateData.pin === 'string' && /^\d{6}$/.test(updateData.pin)) {
            dbUpdateData.pin = updateData.pin;
        }
        if (typeof updateData.themeColor === 'string' && updateData.themeColor) {
            const { data: proData, error: proError } = await supabase
                .from('profiles')
                .select('is_pro')
                .eq('unique_code', uniqueCode)
                .single();
            if (proError || !proData) {
                return res.status(404).json({ error: 'Profile not found' });
            }
            if (proData.is_pro === true) {
                dbUpdateData.theme_color = updateData.themeColor;
            }
        }
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
            status: data.status,
            jobTitle: data.job_title,
            companyName: data.company_name,
            location: data.location,
            mobilePrimary: data.mobile_primary,
            landlineNumber: data.landline_number,
            address: data.address,
            facebookLink: data.facebook_link,
            instagramLink: data.instagram_link,
            tiktokLink: data.tiktok_link,
            whatsappNumber: data.whatsapp_number,
            viberNumber: data.viber_number,
            websiteLink: data.website_link,
            aboutText: data.about_text,
            themeColor: data.theme_color,
            logo: data.logo_url,
            is_pro: data.is_pro,
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
        // Upload to Supabase Storage
        const fileUrl = await uploadToSupabase(file, 'profiles');
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
            status: data.status,
            jobTitle: data.job_title,
            companyName: data.company_name,
            location: data.location,
            mobilePrimary: data.mobile_primary,
            landlineNumber: data.landline_number,
            address: data.address,
            facebookLink: data.facebook_link,
            instagramLink: data.instagram_link,
            tiktokLink: data.tiktok_link,
            whatsappNumber: data.whatsapp_number,
            viberNumber: data.viber_number,
            websiteLink: data.website_link,
            aboutText: data.about_text,
            themeColor: data.theme_color,
            logo: data.logo_url,
            is_pro: data.is_pro,
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
// Upload logo
app.post('/api/profiles/:uniqueCode/upload-logo', upload.single('logo'), async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Upload to Supabase Storage
        const fileUrl = await uploadToSupabase(file, 'logos');
        const { data, error } = await supabase
            .from('profiles')
            .update({
            logo_url: fileUrl,
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
            status: data.status,
            jobTitle: data.job_title,
            companyName: data.company_name,
            location: data.location,
            mobilePrimary: data.mobile_primary,
            landlineNumber: data.landline_number,
            address: data.address,
            facebookLink: data.facebook_link,
            instagramLink: data.instagram_link,
            tiktokLink: data.tiktok_link,
            whatsappNumber: data.whatsapp_number,
            viberNumber: data.viber_number,
            googleMapLink: data.google_map_link,
            websiteLink: data.website_link,
            aboutText: data.about_text,
            themeColor: data.theme_color,
            logo: data.logo_url,
            is_pro: data.is_pro,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
        res.json(profile);
    }
    catch (error) {
        console.error('Error uploading logo:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Gallery endpoints
// Upload gallery image (flyer)
app.post('/api/profiles/:uniqueCode/gallery', upload.single('image'), async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Upload to Supabase Storage
        const fileUrl = await uploadToSupabase(file, 'gallery');
        // Insert into profile_gallery table
        const { data, error } = await supabase
            .from('profile_gallery')
            .insert({
            profile_unique_code: uniqueCode,
            image_url: fileUrl
        })
            .select()
            .single();
        if (error) {
            console.error('Database error:', error);
            return res.status(400).json({ error: error.message });
        }
        res.json(data);
    }
    catch (error) {
        console.error('Error uploading gallery image:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Get gallery images
app.get('/api/profiles/:uniqueCode/gallery', async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const { data, error } = await supabase
            .from('profile_gallery')
            .select('*')
            .eq('profile_unique_code', uniqueCode)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Database error:', error);
            return res.status(400).json({ error: error.message });
        }
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching gallery:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Delete gallery image
app.delete('/api/profiles/:uniqueCode/gallery/:id', async (req, res) => {
    try {
        const { uniqueCode, id } = req.params;
        // First get the image url to delete file
        const { data: imageData, error: fetchError } = await supabase
            .from('profile_gallery')
            .select('image_url')
            .eq('id', id)
            .eq('profile_unique_code', uniqueCode)
            .single();
        if (fetchError) {
            return res.status(404).json({ error: 'Image not found' });
        }
        // Delete from database
        const { error } = await supabase
            .from('profile_gallery')
            .delete()
            .eq('id', id)
            .eq('profile_unique_code', uniqueCode);
        if (error) {
            console.error('Database error:', error);
            return res.status(400).json({ error: error.message });
        }
        // Try to delete file from Supabase Storage (optional, non-blocking)
        if (imageData && imageData.image_url) {
            try {
                // Extract path from URL
                // Format: .../storage/v1/object/public/public-uploads/folder/filename
                const urlParts = imageData.image_url.split('/public-uploads/');
                if (urlParts.length > 1) {
                    const storagePath = urlParts[1];
                    supabase.storage
                        .from('public-uploads')
                        .remove([storagePath])
                        .then(({ error }) => {
                        if (error)
                            console.error('Error deleting file from storage:', error);
                    });
                }
            }
            catch (e) {
                console.error('Error parsing storage URL:', e);
            }
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting gallery image:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Verify credentials (ID + PIN)
app.post('/api/profiles/:uniqueCode/verify', async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const { id, pin } = req.body;
        if (!id || !pin) {
            return res.status(400).json({ error: 'id and pin are required' });
        }
        const digitsId = id.replace(/\D/g, '');
        const hyphenId = `${digitsId.slice(0, 8)}-0000-${digitsId.slice(12)}`;
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('unique_code', uniqueCode)
            .or(`admin_id.eq.${digitsId},admin_id.eq.${hyphenId}`)
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
// Verify credentials by ID only (no uniqueCode in URL)
// Body: { id, pin }
// Responds with { success, message, uniqueCode }
app.post('/api/profiles/verify', async (req, res) => {
    try {
        const { id, pin } = req.body;
        if (!id || !pin) {
            return res.status(400).json({ error: 'id and pin are required' });
        }
        const digitsId = id.replace(/\D/g, '');
        const hyphenId = `${digitsId.slice(0, 8)}-0000-${digitsId.slice(12)}`;
        const { data, error } = await supabase
            .from('profiles')
            .select('admin_id, pin, unique_code, status')
            .or(`admin_id.eq.${digitsId},admin_id.eq.${hyphenId}`)
            .single();
        if (error || !data) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        // Optional banned check
        if (data.status === 'banned')
            return res.status(403).json({ error: 'Account is banned' });
        if (data.pin !== pin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        return res.json({ success: true, message: 'Credentials verified', uniqueCode: data.unique_code });
    }
    catch (e) {
        console.error('Error verifying (by id):', e);
        return res.status(500).json({ error: 'Server error' });
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
app.delete('/api/profiles/:uniqueCode', requireAdmin, async (req, res) => {
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
// Admin: ban a profile
app.post('/api/admin/profiles/:uniqueCode/ban', requireAdmin, async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const { data, error } = await supabase
            .from('profiles')
            .update({ status: 'banned', updated_at: new Date().toISOString() })
            .eq('unique_code', uniqueCode)
            .select('unique_code, status')
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.json({ success: true, status: data.status });
    }
    catch (e) {
        console.error('Ban error:', e);
        return res.status(500).json({ error: 'Server error' });
    }
});
// Admin: unban a profile
app.post('/api/admin/profiles/:uniqueCode/unban', requireAdmin, async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const { data, error } = await supabase
            .from('profiles')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('unique_code', uniqueCode)
            .select('unique_code, status')
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.json({ success: true, status: data.status });
    }
    catch (e) {
        console.error('Unban error:', e);
        return res.status(500).json({ error: 'Server error' });
    }
});
// Admin: Toggle Pro status
app.post('/api/admin/profiles/:uniqueCode/toggle-pro', requireAdmin, async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        // First get current status
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('is_pro')
            .eq('unique_code', uniqueCode)
            .single();
        if (fetchError || !profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        // Toggle status
        const newStatus = !profile.is_pro;
        const { data, error } = await supabase
            .from('profiles')
            .update({ is_pro: newStatus })
            .eq('unique_code', uniqueCode)
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.json({ success: true, is_pro: data.is_pro });
    }
    catch (e) {
        console.error('Toggle Pro error:', e);
        return res.status(500).json({ error: 'Server error' });
    }
});
// Admin: get all profiles with pagination and search
app.get('/api/admin/profiles', requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = '' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let query = supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,id.ilike.%${search}%,unique_code.ilike.%${search}%`);
        }
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error, count } = await query
            .range(offset, offset + Number(limit) - 1);
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.json({
            profiles: data,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: count || 0,
                pages: Math.ceil((count || 0) / Number(limit))
            }
        });
    }
    catch (e) {
        console.error('Get profiles error:', e);
        return res.status(500).json({ error: 'Server error' });
    }
});
// Admin: get dashboard statistics
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        // Get total profiles
        const { count: totalProfiles } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        // Get active profiles
        const { count: activeProfiles } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        // Get banned profiles
        const { count: bannedProfiles } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'banned');
        // Get profiles created today
        const today = new Date().toISOString().split('T')[0];
        const { count: todayProfiles } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${today}T00:00:00`);
        // Get profiles created this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: weekProfiles } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekAgo.toISOString());
        return res.json({
            totalProfiles: totalProfiles || 0,
            activeProfiles: activeProfiles || 0,
            bannedProfiles: bannedProfiles || 0,
            todayProfiles: todayProfiles || 0,
            weekProfiles: weekProfiles || 0
        });
    }
    catch (e) {
        console.error('Stats error:', e);
        return res.status(500).json({ error: 'Server error' });
    }
});
// Admin: bulk operations
app.post('/api/admin/profiles/bulk', requireAdmin, async (req, res) => {
    try {
        const { action, uniqueCodes } = req.body;
        if (!action || !Array.isArray(uniqueCodes) || uniqueCodes.length === 0) {
            return res.status(400).json({ error: 'Invalid bulk operation parameters' });
        }
        let updateData = {};
        let operation = '';
        switch (action) {
            case 'ban':
                updateData = { status: 'banned', updated_at: new Date().toISOString() };
                operation = 'banned';
                break;
            case 'unban':
                updateData = { status: 'active', updated_at: new Date().toISOString() };
                operation = 'unbanned';
                break;
            case 'delete':
                const { error: deleteError } = await supabase
                    .from('profiles')
                    .delete()
                    .in('unique_code', uniqueCodes);
                if (deleteError) {
                    return res.status(400).json({ error: deleteError.message });
                }
                return res.json({
                    success: true,
                    message: `${uniqueCodes.length} profiles deleted successfully`,
                    count: uniqueCodes.length
                });
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .in('unique_code', uniqueCodes);
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.json({
            success: true,
            message: `${uniqueCodes.length} profiles ${operation} successfully`,
            count: uniqueCodes.length
        });
    }
    catch (e) {
        console.error('Bulk operation error:', e);
        return res.status(500).json({ error: 'Server error' });
    }
});
// 404 Handler
app.use((req, res, next) => {
    console.log(`[404] Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
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
    console.log(`🚀 TapBoss API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
});
//# sourceMappingURL=index.js.map