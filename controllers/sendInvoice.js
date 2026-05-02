import puppeteer from "puppeteer";
import fs from "fs";
import path from "fs"; // Using fs for path logic as per your snippet
import pathLib from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import generateInvoiceHTML from "../utils/invoiceTemplate.js";
import uploadToS3 from "../utils/s3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathLib.dirname(__filename);

async function generatePDF(html, pdfPath) {
  const isDev = process.env.NODE_ENV !== "production";
  
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: isDev ? undefined : "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({ path: pdfPath, format: "A4" });
  } finally {
    await browser.close();
  }
}

export default async function sendInvoiceEmail(user, txn) {
  const html = generateInvoiceHTML(user, txn);
  const pdfPath = pathLib.join(__dirname, "../../invoices", `invoice-${txn._id}.pdf`);

  // Ensure directory exists
  if (!fs.existsSync(pathLib.dirname(pdfPath))) {
    fs.mkdirSync(pathLib.dirname(pdfPath), { recursive: true });
  }

  try {
    // 1. Generate the PDF
    await generatePDF(html, pdfPath);

    // 2. Read the file into a Buffer immediately
    // This ensures we have the data even if the local file is deleted later
    const fileBuffer = fs.readFileSync(pdfPath);

    // 3. Upload to S3 (Awaited to ensure it finishes)
    const s3Key = `invoices/${user._id}/invoice-${txn._id}.pdf`;
    let s3Url = null;
    
    try {
      s3Url = await uploadToS3(fileBuffer, s3Key, "application/pdf");
      console.log("✅ Invoice uploaded to S3:", s3Url);
    } catch (s3Err) {
      console.error("❌ S3 Upload Failed:", s3Err);
      // We don't throw here so the email still attempts to send
    }

    // 4. Configure Email
    const transporter = nodemailer.createTransport({
      host: "smtpout.secureserver.net",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: '"BookMyWorker" <support@bookmyworkers.com>',
      to: user.email,
      subject: "BookMyWorker GST Invoice",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <p>Dear ${user.name.split(" ")[0]},</p>
          <p>Please find your invoice attached.</p>
        </div>
      `,
      attachments: [
        {
          filename: `invoice-${txn._id}.pdf`,
          content: fileBuffer, // Use the Buffer instead of the file path for safety
        },
      ],
    };

    // 5. Send Email
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${user.email}`);

  } catch (error) {
    console.error("Critical error in sendInvoiceEmail:", error);
    throw error;
  } finally {
    // 6. Cleanup local file safely
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
  }
}