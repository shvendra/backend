import path from "path";
import multer from "multer";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Define upload folder (production vs development)
const uploadDir =
  process.env.NODE_ENV === "production"
    ? "/var/www/uploads/blog_photos"
    : path.join(__dirname, "../../uploads/blog_photos");

console.log("[MULTER] Using upload directory:", uploadDir);

// ✅ Ensure folder exists
try {
  if (!fs.existsSync(uploadDir)) {
    console.log("[MULTER] Directory does not exist. Creating...");
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("[MULTER] Directory created successfully.");
  } else {
    console.log("[MULTER] Directory exists.");
  }
} catch (err) {
  console.error("[MULTER] Error creating upload directory:", err);
}

// ✅ Configure storage
const storage = multer.diskStorage({
  destination: (req, files, cb) => {
    console.log("[MULTER] Storing file in:", uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, files, cb) => {
    const safeName = files.originalname.replace(/\s+/g, "_");
    console.log("[MULTER] Saving file as:", `${Date.now()}_${safeName}`);
    cb(null, `${Date.now()}_${safeName}`);
  },
});

// ✅ File filter (only JPG/PNG)
const fileFilter = (req, files, cb) => {
  const ext = path.extname(files.originalname).toLowerCase();
  console.log("[MULTER] Received file:", files.originalname, "Extension:", ext);
  if (![".jpg", ".jpeg", ".png"].includes(ext)) {
    console.error("[MULTER] Invalid file type:", ext);
    return cb(new Error("Only JPG and PNG files allowed"), false);
  }
  cb(null, true);
};

// ✅ Create and export upload middleware
const uploadBlogPhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export default uploadBlogPhoto;
