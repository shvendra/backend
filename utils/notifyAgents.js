// utils/notifyAgents.js
import axios from "axios";
import { User } from "../models/userSchema.js";

export const notifyAgents = async ({ state, district, workType }) => {
  try {
    // ✅ Only select agents whose status is "Verified"
    const filter = { role: "Agent", status: "Verified" };
    if (state) filter.state = state;
    if (district) filter.district = district;

    const agents = await User.find(filter)
      .select("name phone district email status")
      .sort({ createdAt: -1 });

    console.log(`👥 Found ${agents.length} verified agent(s).`);
    const phoneSet = new Set();
    const recipients = agents
      .filter((agent) => {
        const isValid = /^\d{10}$/.test(agent.phone);
        return isValid && !phoneSet.has(agent.phone) && phoneSet.add(agent.phone);
      })
      .map((agent) => {
        const fullName = agent?.name ?? "Agent";
        const [firstName = "Agent", lastName = ""] = fullName.trim().split(" ");
        return {
          whatsapp_number: `+91${agent.phone}`,
          first_name: firstName,
          last_name: lastName,
          attributes: {
            custom_attribute_1: "New Work Requirement",
            custom_attribute_2: workType ?? "General",
            custom_attribute_3: `${state ?? "N/A"}, ${district ?? "N/A"}`,
          },
          lists: ["Default"],
          tags: ["new lead", "notification sent"],
          replace: false,
        };
      });

    if (recipients.length === 0) {
      console.warn("⚠️ No verified agents with valid phone numbers to notify.");
      return;
    }

    const wanotifierUrl =
      "https://app.wanotifier.com/api/v1/notifications/bahi5pFb01?key=Kvnrzau1GMzI925TmjR3Jl8MWZbKWZ";

    console.log(`📤 Sending messages to ${recipients.length} verified agent(s)...`);

    for (const recipient of recipients) {
      try {
        const payload = { recipients: [recipient] };
        const response = await axios.post(wanotifierUrl, payload);
        console.log(`✅ Sent to ${recipient.whatsapp_number}`, response.data);
      } catch (err) {
        console.error(
          `❌ Failed for ${recipient.whatsapp_number}:`,
          err.response?.data || err.message
        );
      }
    }

    console.log("🎉 All notifications attempted.");
  } catch (error) {
    console.error("❌ Error in notifyAgents:", error.message);
  }
};
export const sendWhatsappMessageAgent = async (name, type, location, phone) => {
  try {
    if (!name || !type || !location || !phone) {
      throw new Error("All parameters are required.");
    }

    const payload = {
      data: {
        body_variables: [name, type, location], // These are {{1}}, {{2}}, {{3}}
      },
      recipients: [
        {
          whatsapp_number: `+91${phone}`,
        },
      ],
    };

    const wanotifierUrl =
      "https://app.wanotifier.com/api/v1/notifications/MZkjE3d52c?key=Kvnrzau1GMzI925TmjR3Jl8MWZbKWZ";

    const response = await axios.post(wanotifierUrl, payload);

    console.log(`✅ Message sent to ${phone} successfully.`);
    return response.data;
  } catch (error) {
    console.error("❌ Error sending WhatsApp message:", error.message);
    throw error;
  }
};



// export const kycApproved = async (name, type, location, phone) => {
//   try {
//     if (!name || !type || !location || !phone) {
//       throw new Error("All parameters are required.");
//     }

//     const payload = {
//       data: {
//         body_variables: [name, type, location], 
//       },
//       recipients: [
//         {
//           whatsapp_number: `+91${phone}`,
//         },
//       ],
//     };

//     const wanotifierUrl =
//       "https://app.wanotifier.com/api/v1/notifications/MZkjE3d52c?key=Kvnrzau1GMzI925TmjR3Jl8MWZbKWZ";

//     const response = await axios.post(wanotifierUrl, payload);

//     console.log(`✅ Message sent to ${phone} successfully.`);
//     return response.data;
//   } catch (error) {
//     console.error("❌ Error sending WhatsApp message:", error.message);
//     throw error;
//   }
// };
