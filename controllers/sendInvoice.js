import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import generateInvoiceHTML from "../utils/invoiceTemplate.js";
import uploadToS3 from "../utils/s3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generatePDF(html, pdfPath) {
  const isDev = process.env.NODE_ENV !== "production";
  
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: isDev ? undefined : "/usr/bin/google-chrome",
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

  if (!fs.existsSync(path.dirname(pdfPath))) {
    fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  }

  await generatePDF(html, pdfPath);

  // ================== ✅ ADD THIS BLOCK ==================
  try {
    const fileBuffer = fs.readFileSync(pdfPath);

    const s3Key = `invoices/${user._id}/invoice-${txn._id}.pdf`;

    const s3Url = await uploadToS3(
      fileBuffer,
      s3Key,
      "application/pdf"
    );

    console.log("Invoice uploaded to S3:", s3Url);

    // OPTIONAL: save in DB
    // await Transaction.updateOne(
    //   { _id: txn._id },
    //   { invoice_url: s3Url }
    // );

  } catch (err) {
    console.error("S3 Upload Failed:", err);
  }
  // =======================================================

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
        filename: "invoice.pdf",
        path: pdfPath,
      },
    ],
  };

  await transporter.sendMail(mailOptions);

  // delete local file
  fs.unlinkSync(pdfPath);
}