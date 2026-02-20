import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Auth
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role?: string };
    (req as any).admin = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Types
interface Profile {
  id: string;
  pin: string;
  uniqueCode: string;
  profilePhoto?: string;
  fullName: string;
  email: string;
  status: string;
  jobTitle: string;
  companyName: string;
  mobilePrimary: string;
  landlineNumber: string;
  address: string;
  facebookLink: string;
  instagramLink: string;
  tiktokLink: string;
  whatsappNumber: string;
  websiteLink: string;
  createdAt?: string;
  updatedAt?: string;
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'KontactShare API is running' });
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
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

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ sub: admin.id, email: admin.email, role: admin.role || 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token });
  } catch (e) {
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

    // Convert database field names to frontend format
    const profile: Profile = {
      id: data.admin_id,
      pin: data.pin,
      uniqueCode: data.unique_code,
      profilePhoto: data.profile_photo_url,
      fullName: data.full_name,
      email: data.email,
      status: data.status,
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
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new profile (admin only)
// Utility functions for auto-generation
function generateUniqueCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateIdCard(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${year}${month}${day}-0000-${random}`;
}

function generatePin(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

app.post('/api/profiles', requireAdmin, async (req, res) => {
  try {
    const profileData = req.body;
    
    // Auto-generate fields if not provided
    const uniqueCode = profileData.uniqueCode || generateUniqueCode();
    const idCard = profileData.id || generateIdCard();
    const pin = profileData.pin || generatePin();
    
    // Set default profile photo if not provided
    const profilePhoto = profileData.profilePhoto || '/uploads/kontacksharelogo.png';
    
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
      mobile_primary: profileData.mobilePrimary || '000-000-0000',
      landline_number: profileData.landlineNumber || '000-000-0000',
      address: profileData.address || 'Default Address',
      facebook_link: profileData.facebookLink || 'Update your Facebook Link',
      instagram_link: profileData.instagramLink || 'Update your Instagram Link',
      tiktok_link: profileData.tiktokLink || 'Update your TikTok Link',
      whatsapp_number: profileData.whatsappNumber || 'Update your WhatsApp Number',
      website_link: profileData.websiteLink || 'Update your web link'
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
    const profileLink = `http://localhost:5173/myprofile/${uniqueCode}`;

    // Convert back to frontend format
    const profile: Profile = {
      id: data.admin_id,
      pin: data.pin,
      uniqueCode: data.unique_code,
      profilePhoto: data.profile_photo_url,
      fullName: data.full_name,
      email: data.email,
      status: data.status,
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

    res.status(201).json({
      ...profile,
      profileLink: profileLink
    });
  } catch (error) {
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
    const dbUpdateData: Record<string, any> = {
      profile_photo_url: updateData.profilePhoto,
      full_name: updateData.fullName,
      email: updateData.email,
      status: updateData.status,
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

    // Optional PIN update (5 digits)
    if (typeof updateData.pin === 'string' && /^\d{5}$/.test(updateData.pin)) {
      dbUpdateData.pin = updateData.pin;
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
    const profile: Profile = {
      id: data.admin_id,
      pin: data.pin,
      uniqueCode: data.unique_code,
      profilePhoto: data.profile_photo_url,
      fullName: data.full_name,
      email: data.email,
      status: data.status,
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
  } catch (error) {
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
    const profile: Profile = {
      id: data.admin_id,
      pin: data.pin,
      uniqueCode: data.unique_code,
      profilePhoto: data.profile_photo_url,
      fullName: data.full_name,
      email: data.email,
      status: data.status,
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
  } catch (error) {
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
  } catch (error) {
    console.error('Error verifying credentials:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify credentials by ID only (no uniqueCode in URL)
// Body: { id, pin }
// Responds with { success, message, uniqueCode }
app.post('/api/profiles/verify', async (req, res) => {
  try {
    const { id, pin } = req.body as { id?: string; pin?: string };
    if (!id || !pin) {
      return res.status(400).json({ error: 'id and pin are required' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('admin_id, pin, unique_code, status')
      .eq('admin_id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Optional banned check
     if (data.status === 'banned') return res.status(403).json({ error: 'Account is banned' });

    if (data.pin !== pin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.json({ success: true, message: 'Credentials verified', uniqueCode: data.unique_code });
  } catch (e) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (e) {
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
  } catch (e) {
    console.error('Unban error:', e);
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
  } catch (e) {
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
  } catch (e) {
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
    
    let updateData: any = {};
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
  } catch (e) {
    console.error('Bulk operation error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
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
