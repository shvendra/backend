export default function generateInvoiceHTML(user, txn) {
  const platformCharges = Number(txn.platformCharges || 0);
  const subscriptionAmount = Number(txn.amount || 0);
  const gstCharges = +(subscriptionAmount * 18 / 118).toFixed(2);
const baseAmount = +(subscriptionAmount - gstCharges).toFixed(2); // Remaining is base amount

  const total =
    user?.role === "Employer"
      ? (subscriptionAmount).toFixed(2)
      : subscriptionAmount.toFixed(2);

  const invoiceDate = new Date(txn.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f7fa;
            color: #333;
          }

          .invoice-container {
            max-width: 800px;
            margin: auto;
            background: #ffffff;
            padding: 30px;
            border: 1px solid #cce4f7;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.05);
          }

          .header {
            text-align: center;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
            margin-bottom: 30px;
          }

          .header img {
            max-height: 60px;
            margin-bottom: 10px;
          }

          .header h2 {
            margin: 0;
            color: #1976d2;
          }

          .info {
            margin-bottom: 20px;
            line-height: 1;
          }

          .info strong {
            color: #555;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }

          th, td {
            border: 1px solid #dee2e6;
            padding: 12px;
            text-align: left;
          }

          th {
            background-color: #f1f1f1;
            font-weight: 600;
          }

          td:last-child,
          th:last-child {
            text-align: right;
          }

          .total-row {
            font-weight: bold;
            background-color: #e8f4fd;
          }

          .note {
            margin-top: 10px;
            font-size: 12px;
            color: #555;
            text-align: right;
          }

          .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 12px;
            color: #777;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <h2>BookMyWorker</h2>
            <p>Khasara No 34/1/33, Rewa Semariya Road, Karahiya, Rewa, MP - 486450<br/>
            Email: support@bookmyworkers.com | GSTIN: 23NBJPS3070R1ZQ</p>
          </div>

          <div class="info">
            <p><strong>Invoice No:</strong> INV-${user.phone}</p>
            <p><strong>Date:</strong> ${invoiceDate}</p>
            <p><strong>To:</strong> ${user.name} (${user.email})</p>
            <p><strong>TX ID:</strong> ${txn.creditTransactionId || "N/A"}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Subscription Amount</td>
                <td>${baseAmount.toFixed(2)}</td>
              </tr>
              ${
                user?.role === "Employer"
                  ? `
                <tr>
                  <td>GST Charges</td>
                  <td>${gstCharges.toFixed(2)}</td>
                </tr>
              `
                  : ""
              }
              <tr class="total-row">
                <td>Total</td>
                <td>${total}</td>
              </tr>
            </tbody>
          </table>

          <p class="note">*Total includes applicable GST</p>

          <div class="footer">
            This is a system-generated invoice and does not require a signature.<br/>
            For any queries, contact us at <a href="mailto:support@bookmyworkers.com">support@bookmyworkers.com</a>
          </div>
        </div>
      </body>
    </html>
  `;
}
