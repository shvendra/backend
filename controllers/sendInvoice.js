import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import generateInvoiceHTML from "../utils/invoiceTemplate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generatePDF(html, pdfPath) {
  const isDev = process.env.NODE_ENV !== "production";
  
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: isDev ? undefined : "/usr/bin/google-chrome", // undefined → Puppeteer uses its Chromium
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({ path: pdfPath, format: "A4" });
  await browser.close();
}

export default async function sendInvoiceEmail(user, txn) {
  const html = generateInvoiceHTML(user, txn);
  const pdfPath = path.join(
    __dirname,
    "../../invoices",
    `invoice-${txn._id}.pdf`
  );

  // Ensure invoice folder exists
  if (!fs.existsSync(path.dirname(pdfPath))) {
    fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  }

  await generatePDF(html, pdfPath);

  // Send email using nodemailer
  const transporter = nodemailer.createTransport({
    host: "smtpout.secureserver.net", // Recommended hostname
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
  <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="https://bookmyworkers.com/hero-3.jpg" alt="BookMyWorker Banner" style="width: 100%; max-width: 600px; height: auto; border-radius: 6px;" />
    </div>

    <p style="font-size: 16px;">Dear ${user.name.split(" ")[0]},</p>

    <p style="font-size: 15px; line-height: 1.6;">
      Thank you for choosing <strong>BookMyWorker</strong>. Please find your GST invoice attached for the recent transaction you made with us.
    </p>

    <p style="font-size: 15px; line-height: 1.6;">
      If you have any questions or need further assistance, feel free to reply to this email or contact our support team.
    </p>

    <p style="font-size: 15px; margin-top: 30px;">
      Best regards,<br />
      <strong>BookMyWorker Team</strong><br />
      <a href="mailto:support@bookmyworkers.com" style="color: #1976d2;">support@bookmyworkers.com</a>
    </p>

    <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;" />

    <div style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
      BookMyWorker Pvt. Ltd. | GSTIN: 23NBJPS3070R1ZQ<br />
      Khasara No 34/1/33, Rewa Semariya Road, Karahiya, Rewa, MP - 486450
    </div>
  </div>
`,
    attachments: [
      {
        filename: "invoice.pdf",
        path: pdfPath,
      },
    ],
  };

  await transporter.sendMail(mailOptions);

  // Optional: delete file after send
  fs.unlinkSync(pdfPath);
}
