import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { createCanvas } from "canvas";

const API_URL = "http://localhost:5000/api/blog/create";
const TOKEN = "YOUR_TOKEN";
const DELAY_MS = 300;

// Ensure image dir exists
const IMAGE_DIR = "./scripts/images";
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}
// generateBlogs.js

import axios from "axios";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import { createCanvas } from "canvas";
// ================= CONFIG =================
const API_URL = "http://localhost:5000/api/blog/create"; // change if needed
const TOKEN = "YOUR_ADMIN_TOKEN"; // optional
const IMAGE_DIR = "./scripts/images"; // put images here
const DELAY_MS = 150; // avoid overload

// ================= CITIES =================
const cities = [
  // Tier 1
  "Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Kolkata","Pune","Ahmedabad",

  // Tier 2
  "Jaipur","Surat","Lucknow","Kanpur","Nagpur","Indore","Bhopal","Patna",
  "Chandigarh","Kochi","Coimbatore","Visakhapatnam","Vadodara","Ludhiana",
  "Agra","Nashik","Faridabad","Meerut","Rajkot","Varanasi","Srinagar",
  "Aurangabad","Dhanbad","Amritsar","Allahabad","Ranchi","Howrah",
  "Jabalpur","Gwalior","Vijayawada","Jodhpur","Madurai","Raipur",
  "Kota","Guwahati","Chandrapur","Solapur","Hubli","Bareilly",
  "Moradabad","Mysore","Gurgaon","Aligarh","Jalandhar","Tiruchirappalli",
  "Bhubaneswar","Salem","Warangal","Guntur","Bhiwandi","Saharanpur",
  "Gorakhpur","Bikaner","Amravati","Noida","Jamshedpur","Bhilai",
  "Cuttack","Firozabad","Koch Bihar","Nellore","Bhavnagar","Dehradun",
  "Durgapur","Asansol","Rourkela","Nanded","Kolhapur","Ajmer",
  "Akola","Gulbarga","Jamnagar","Ujjain","Loni","Siliguri",
  "Jhansi","Ulhasnagar","Jammu","Sangli","Mangalore","Erode",
  "Belgaum","Ambattur","Tirunelveli","Malegaon","Gaya","Jalgaon",
  "Udaipur","Maheshtala","Tiruppur","Davanagere","Kozhikode",
  "Kurnool","Rajahmundry","Bokaro","South Dumdum","Bellary",
  "Patiala","Gopalpur","Agartala","Bhagalpur","Muzaffarnagar"
];

// ================= CATEGORIES =================
const categories = [
  {
    "label": "Industrial Workers",
    "hindilabel": "औद्योगिक श्रमिक",
    "marathilabel": "औद्योगिक कामगार",
    "gujaratilabel": "ઔદ્યોગિક કામદાર",
    "value": "Industrial Workers",
    "subcategories": [
      {"label":"Helper","hindilabel":"हेल्पर","marathilabel":"हेल्पर","gujaratilabel":"હેલ્પર","value":"helper"},
      {"label":"Skilled Helper","hindilabel":"कुशल हेल्पर","marathilabel":"कुशल हेल्पर","gujaratilabel":"કુશળ હેલ્પર","value":"skilled helper"},
      {"label":"Machine Operator","hindilabel":"मशीन ऑपरेटर","marathilabel":"मशीन ऑपरेटर","gujaratilabel":"મશીન ઓપરેટર","value":"machine operator"},
      {"label":"CNC Operator","hindilabel":"सीएनसी ऑपरेटर","marathilabel":"CNC ऑपरेटर","gujaratilabel":"CNC ઓપરેટર","value":"cnc operator"},
      {"label":"VMC Operator","hindilabel":"वीएमसी ऑपरेटर","marathilabel":"VMC ऑपरेटर","gujaratilabel":"VMC ઓપરેટર","value":"vmc operator"},
      {"label":"Welder (MIG/TIG/ARC)","hindilabel":"वेल्डर","marathilabel":"वेल्डर","gujaratilabel":"વેલ્ડર","value":"welder"},
      {"label":"Fitter (Mechanical/Pipe)","hindilabel":"फिटर","marathilabel":"फिटर","gujaratilabel":"ફિટર","value":"fitter"},
      {"label":"Fabricator","hindilabel":"फैब्रिकेटर","marathilabel":"फॅब्रिकेटर","gujaratilabel":"ફેબ્રિકેટર","value":"fabricator"},
      {"label":"Quality Checker","hindilabel":"गुणवत्ता जांचकर्ता","marathilabel":"गुणवत्ता तपासणी","gujaratilabel":"ક્વોલિટી ચેકર","value":"quality checker"},
      {"label":"HVAC / AC Technician","hindilabel":"एचवीएसी तकनीशियन","marathilabel":"HVAC तंत्रज्ञ","gujaratilabel":"HVAC ટેકનિશિયન","value":"hvac technician"},
      {"label":"Other Industrial Work","hindilabel":"अन्य औद्योगिक कार्य","marathilabel":"इतर औद्योगिक काम","gujaratilabel":"અન્ય ઔદ્યોગિક કામ","value":"other industrial"}
    ]
  },
  {
    "label": "Construction Workers",
    "hindilabel": "निर्माण श्रमिक",
    "marathilabel": "बांधकाम कामगार",
    "gujaratilabel": "બાંધકામ કામદાર",
    "value": "Construction Workers",
    "subcategories": [
      {"label":"Mason","hindilabel":"राजमिस्त्री","marathilabel":"राजमिस्त्री","gujaratilabel":"મેસન","value":"mason"},
      {"label":"Carpenter","hindilabel":"बढ़ई","marathilabel":"सुतार","gujaratilabel":"કાર્પેન્ટર","value":"carpenter"},
      {"label":"Shuttering Carpenter","hindilabel":"शटरिंग बढ़ई","marathilabel":"शटरिंग सुतार","gujaratilabel":"શટરિંગ કાર્પેન્ટર","value":"shuttering carpenter"},
      {"label":"Steel Fixer","hindilabel":"स्टील फिक्सर","marathilabel":"स्टील फिक्सर","gujaratilabel":"સ્ટીલ ફિક્સર","value":"steel fixer"},
      {"label":"Bar Bender","hindilabel":"सरिया मोड़ने वाला","marathilabel":"बार बेंडर","gujaratilabel":"બાર બેન્ડર","value":"bar bender"},
      {"label":"Plumber","hindilabel":"प्लंबर","marathilabel":"प्लंबर","gujaratilabel":"પ્લમ્બર","value":"plumber"},
      {"label":"Electrician","hindilabel":"इलेक्ट्रीशियन","marathilabel":"इलेक्ट्रिशियन","gujaratilabel":"ઇલેક્ટ્રિશિયન","value":"electrician"},
      {"label":"Tile Fitter","hindilabel":"टाइल फिटर","marathilabel":"टाइल फिटर","gujaratilabel":"ટાઇલ ફિટર","value":"tile fitter"},
      {"label":"Painter (Building)","hindilabel":"पेंटर","marathilabel":"पेंटर","gujaratilabel":"પેઇન્ટર","value":"building painter"},
      {"label":"Civil Helper","hindilabel":"सिविल हेल्पर","marathilabel":"सिव्हिल हेल्पर","gujaratilabel":"સિવિલ હેલ્પર","value":"civil helper"},
      {"label":"Other Construction Work","hindilabel":"अन्य निर्माण कार्य","marathilabel":"इतर बांधकाम काम","gujaratilabel":"અન્ય બાંધકામ કામ","value":"other construction"}
    ]
  },
  {
    "label": "Logistics & Warehouse Workers",
    "hindilabel": "लॉजिस्टिक्स एवं वेयरहाउस श्रमिक",
    "marathilabel": "लॉजिस्टिक्स व वेअरहाऊस कामगार",
    "gujaratilabel": "લોજિસ્ટિક્સ અને વેરહાઉસ કામદાર",
    "value": "Logistics & Warehouse",
    "subcategories": [
      {"label":"Loader","hindilabel":"लोडर","marathilabel":"लोडर","gujaratilabel":"લોડર","value":"loader"},
      {"label":"Unloader","hindilabel":"अनलोडर","marathilabel":"अनलोडर","gujaratilabel":"અનલોડર","value":"unloader"},
      {"label":"Picker","hindilabel":"पिकर","marathilabel":"पिकर","gujaratilabel":"પિકર","value":"picker"},
      {"label":"Packer","hindilabel":"पैकर","marathilabel":"पॅकर","gujaratilabel":"પેકર","value":"packer"},
      {"label":"Warehouse Helper","hindilabel":"वेयरहाउस हेल्पर","marathilabel":"वेअरहाऊस हेल्पर","gujaratilabel":"વેરહાઉસ હેલ્પર","value":"warehouse helper"},
      {"label":"Parcel Sorting Worker","hindilabel":"पार्सल छंटाई कर्मचारी","marathilabel":"पार्सल सॉर्टिंग कामगार","gujaratilabel":"પાર્સલ સોર્ટિંગ વર્કર","value":"parcel sorter"},
      {"label":"Delivery Boy","hindilabel":"डिलीवरी बॉय","marathilabel":"डिलिव्हरी बॉय","gujaratilabel":"ડિલિવરી બોય","value":"delivery boy"},
      {"label":"Courier Boy","hindilabel":"कूरियर बॉय","marathilabel":"कुरिअर बॉय","gujaratilabel":"કુરિયર બોય","value":"courier boy"},
      {"label":"Dispatch Worker","hindilabel":"डिस्पैच कर्मचारी","marathilabel":"डिस्पॅच कामगार","gujaratilabel":"ડિસ્પેચ વર્કર","value":"dispatch worker"},
      {"label":"Inventory Assistant","hindilabel":"इन्वेंटरी सहायक","marathilabel":"इन्व्हेंटरी सहाय्यक","gujaratilabel":"ઇન્વેન્ટરી સહાયક","value":"inventory assistant"},
      {"label":"Other Logistics Work","hindilabel":"अन्य लॉजिस्टिक्स कार्य","marathilabel":"इतर लॉजिस्टिक्स काम","gujaratilabel":"અન્ય લોજિસ્ટિક્સ કામ","value":"other logistics"}
    ]
  },
  {
    "label": "Agriculture & Farm Workers",
    "hindilabel": "कृषि एवं खेत मजदूर",
    "marathilabel": "शेती व शेतमजूर",
    "gujaratilabel": "કૃષિ અને ખેત મજૂર",
    "value": "Agriculture & Farm Workers",
    "subcategories": [
      {"label":"Agriculture Worker","hindilabel":"कृषि मजदूर","marathilabel":"शेतमजूर","gujaratilabel":"કૃષિ કામદાર","value":"agriculture worker"},
      {"label":"Farm Labour","hindilabel":"खेत मजदूर","marathilabel":"फार्म लेबर","gujaratilabel":"ખેત મજૂર","value":"farm labour"},
      {"label":"Tractor Driver","hindilabel":"ट्रैक्टर चालक","marathilabel":"ट्रॅक्टर चालक","gujaratilabel":"ટ્રેક્ટર ડ્રાઈવર","value":"tractor driver"},
      {"label":"Dairy Worker","hindilabel":"डेयरी कर्मचारी","marathilabel":"डेअरी कामगार","gujaratilabel":"ડેરી વર્કર","value":"dairy worker"},
      {"label":"Poultry Worker","hindilabel":"पोल्ट्री कर्मचारी","marathilabel":"पोल्ट्री कामगार","gujaratilabel":"પોલ્ટ્રી વર્કર","value":"poultry worker"},
      {"label":"Animal Care Worker","hindilabel":"पशु देखभाल कर्मचारी","marathilabel":"प्राणी देखभाल कामगार","gujaratilabel":"પશુ સંભાળ કામદાર","value":"animal care"},
      {"label":"Irrigation Worker","hindilabel":"सिंचाई कर्मचारी","marathilabel":"सिंचन कामगार","gujaratilabel":"સિંચાઈ કામદાર","value":"irrigation worker"},
      {"label":"Crop Cutting Labour","hindilabel":"फसल कटाई मजदूर","marathilabel":"पीक कापणी कामगार","gujaratilabel":"પાક કાપણી મજૂર","value":"crop cutting"},
      {"label":"Pesticide Sprayer","hindilabel":"कीटनाशक छिड़काव","marathilabel":"कीटकनाशक फवारणी","gujaratilabel":"કીટનાશક સ્પ્રેયર","value":"pesticide sprayer"},
      {"label":"Farm Equipment Operator","hindilabel":"कृषि उपकरण ऑपरेटर","marathilabel":"शेती उपकरण ऑपरेटर","gujaratilabel":"ખેત સાધન ઓપરેટર","value":"farm equipment operator"},
      {"label":"Other Agriculture Work","hindilabel":"अन्य कृषि कार्य","marathilabel":"इतर शेती काम","gujaratilabel":"અન્ય કૃષિ કામ","value":"other agriculture"}
    ]
  },
  {
    "label": "Household / Domestic Workers",
    "hindilabel": "घरेलू कामगार",
    "marathilabel": "घरगुती कामगार",
    "gujaratilabel": "ઘરેલુ કામદાર",
    "value": "Household Workers",
    "subcategories": [
      {"label":"Maid","hindilabel":"नौकरानी","marathilabel":"मोलकरीण","gujaratilabel":"મેઇડ","value":"maid"},
      {"label":"Housekeeping Staff","hindilabel":"हाउसकीपिंग स्टाफ","marathilabel":"हाऊसकीपिंग स्टाफ","gujaratilabel":"હાઉસકિપિંગ સ્ટાફ","value":"housekeeping"},
      {"label":"Cook","hindilabel":"रसोइया","marathilabel":"स्वयंपाकी","gujaratilabel":"રસોઈયા","value":"cook"},
      {"label":"Cleaner","hindilabel":"सफाई कर्मचारी","marathilabel":"स्वच्छता कामगार","gujaratilabel":"ક્લીનર","value":"cleaner"},
      {"label":"Babysitter","hindilabel":"बच्चों की देखभाल","marathilabel":"बेबीसिटर","gujaratilabel":"બેબીસિટર","value":"babysitter"},
      {"label":"Nanny","hindilabel":"नैनी","marathilabel":"नॅनी","gujaratilabel":"નેની","value":"nanny"},
      {"label":"Elderly Caregiver","hindilabel":"वरिष्ठ देखभाल","marathilabel":"वृद्ध देखभाल","gujaratilabel":"વૃદ્ધ સંભાળ","value":"elder care"},
      {"label":"Patient Care Attendant","hindilabel":"मरीज देखभाल","marathilabel":"रुग्ण सेवक","gujaratilabel":"પેશન્ટ કેર","value":"patient care"},
      {"label":"Kitchen Helper","hindilabel":"रसोई सहायक","marathilabel":"किचन हेल्पर","gujaratilabel":"કિચન હેલ્પર","value":"kitchen helper"},
      {"label":"Dishwasher","hindilabel":"बर्तन धोने वाला","marathilabel":"भांडी धुणारा","gujaratilabel":"ડિશવોશર","value":"dishwasher"},
      {"label":"Other Household Work","hindilabel":"अन्य घरेलू कार्य","marathilabel":"इतर घरगुती काम","gujaratilabel":"અન્ય ઘરેલુ કામ","value":"other household"}
    ]
  },
  {
    "label": "Automobile & Workshop Workers",
    "hindilabel": "ऑटोमोबाइल वर्कशॉप कर्मचारी",
    "marathilabel": "ऑटोमोबाइल वर्कशॉप कामगार",
    "gujaratilabel": "ઓટોમોબાઇલ વર્કશોપ કામદાર",
    "value": "Automobile & Workshop Workers",
    "subcategories": [
      {"label":"Mechanic (2W/4W)","hindilabel":"मेकैनिक","marathilabel":"मेकॅनिक","gujaratilabel":"મેકેનિક","value":"mechanic"},
      {"label":"Helper Mechanic","hindilabel":"मेकैनिक हेल्पर","marathilabel":"मेकॅनिक हेल्पर","gujaratilabel":"મેકેનિક હેલ્પર","value":"helper mechanic"},
      {"label":"Denter","hindilabel":"डेंटर","marathilabel":"डेंटर","gujaratilabel":"ડેન્ટર","value":"denter"},
      {"label":"Automobile Painter","hindilabel":"ऑटो पेंटर","marathilabel":"ऑटो पेंटर","gujaratilabel":"ઓટો પેઇન્ટર","value":"auto painter"},
      {"label":"Tyre Mechanic","hindilabel":"टायर मैकेनिक","marathilabel":"टायर मेकॅनिक","gujaratilabel":"ટાયર મેકેનિક","value":"tyre mechanic"},
      {"label":"Battery Technician","hindilabel":"बैटरी तकनीशियन","marathilabel":"बॅटरी तंत्रज्ञ","gujaratilabel":"બેટરી ટેકનિશિયન","value":"battery technician"},
      {"label":"Wheel Alignment Technician","hindilabel":"व्हील अलाइनमेंट तकनीशियन","marathilabel":"व्हील अलाइनमेंट तंत्रज्ञ","gujaratilabel":"વ્હીલ એલાઇનમેન્ટ ટેકનિશિયન","value":"wheel alignment"},
      {"label":"AC Mechanic (Vehicle)","hindilabel":"वाहन एसी मैकेनिक","marathilabel":"वाहन AC मेकॅनिक","gujaratilabel":"વાહન AC મેકેનિક","value":"vehicle ac mechanic"},
      {"label":"Car Washer","hindilabel":"कार वॉशर","marathilabel":"कार वॉशर","gujaratilabel":"કાર વોશર","value":"car washer"},
      {"label":"Service Advisor Helper","hindilabel":"सर्विस सलाहकार सहायक","marathilabel":"सर्व्हिस सल्लागार सहाय्यक","gujaratilabel":"સર્વિસ એડવાઇઝર હેલ્પર","value":"service advisor helper"},
      {"label":"Other Automobile Work","hindilabel":"अन्य ऑटोमोबाइल कार्य","marathilabel":"इतर ऑटोमोबाइल काम","gujaratilabel":"અન્ય ઓટોમોબાઇલ કામ","value":"other automobile"}
    ]
  },
  {
    "label": "Retail & Service Workers",
    "hindilabel": "रिटेल एवं सेवा कर्मचारी",
    "marathilabel": "रिटेल व सेवा कामगार",
    "gujaratilabel": "રિટેલ અને સર્વિસ કામદાર",
    "value": "Retail & Service Workers",
    "subcategories": [
      {"label":"Sales Boy","hindilabel":"सेल्स बॉय","marathilabel":"सेल्स बॉय","gujaratilabel":"સેલ્સ બોય","value":"sales boy"},
      {"label":"Sales Girl","hindilabel":"सेल्स गर्ल","marathilabel":"सेल्स गर्ल","gujaratilabel":"સેલ્સ ગર્લ","value":"sales girl"},
      {"label":"Cashier","hindilabel":"कैशियर","marathilabel":"कॅशियर","gujaratilabel":"કેશિયર","value":"cashier"},
      {"label":"Store Helper","hindilabel":"स्टोर हेल्पर","marathilabel":"स्टोअर हेल्पर","gujaratilabel":"સ્ટોર હેલ્પર","value":"store helper"},
      {"label":"Cleaning Staff","hindilabel":"सफाई कर्मचारी","marathilabel":"स्वच्छता कर्मचारी","gujaratilabel":"ક્લીનિંગ સ્ટાફ","value":"cleaning staff"},
      {"label":"Billing Assistant","hindilabel":"बिलिंग सहायक","marathilabel":"बिलिंग सहाय्यक","gujaratilabel":"બિલિંગ સહાયક","value":"billing assistant"},
      {"label":"Delivery Executive","hindilabel":"डिलीवरी एग्जीक्यूटिव","marathilabel":"डिलिव्हरी एक्झिक्युटिव","gujaratilabel":"ડિલિવરી એક્ઝિક્યુટિવ","value":"delivery executive"},
      {"label":"Customer Support Helper","hindilabel":"ग्राहक सहायता सहायक","marathilabel":"ग्राहक सहाय्यक","gujaratilabel":"કસ્ટમર સપોર્ટ હેલ્પર","value":"customer support helper"},
      {"label":"Stock Boy","hindilabel":"स्टॉक बॉय","marathilabel":"स्टॉक बॉय","gujaratilabel":"સ્ટોક બોય","value":"stock boy"},
      {"label":"Visual Merchandiser Helper","hindilabel":"विजुअल मर्चेंडाइज़र हेल्पर","marathilabel":"व्हिज्युअल मर्चेंडायझर हेल्पर","gujaratilabel":"વિઝ્યુઅલ મર્ચેન્ડાઇઝર હેલ્પર","value":"visual merchandiser helper"},
      {"label":"Other Retail Work","hindilabel":"अन्य रिटेल कार्य","marathilabel":"इतर रिटेल काम","gujaratilabel":"અન્ય રિટેલ કામ","value":"other retail"}
    ]
  },
  {
    "label": "Hospitality Workers",
    "hindilabel": "हॉस्पिटैलिटी कर्मचारी",
    "marathilabel": "हॉस्पिटॅलिटी कामगार",
    "gujaratilabel": "હૉસ્પિટાલિટી કામદાર",
    "value": "Hospitality Workers",
    "subcategories": [
      {"label":"Waiter","hindilabel":"वेटर","marathilabel":"वेटर","gujaratilabel":"વેઇટર","value":"waiter"},
      {"label":"Room Service Boy","hindilabel":"रूम सर्विस बॉय","marathilabel":"रूम सर्व्हिस बॉय","gujaratilabel":"રૂમ સર્વિસ બોય","value":"room service"},
      {"label":"Reception Helper","hindilabel":"रिसेप्शन हेल्पर","marathilabel":"रिसेप्शन हेल्पर","gujaratilabel":"રિસેપ્શન હેલ્પર","value":"reception helper"},
      {"label":"Kitchen Staff","hindilabel":"रसोई स्टाफ","marathilabel":"किचन स्टाफ","gujaratilabel":"કિચન સ્ટાફ","value":"kitchen staff"},
      {"label":"Steward","hindilabel":"स्टूवर्ड","marathilabel":"स्टूवर्ड","gujaratilabel":"સ્ટેવર્ડ","value":"steward"},
      {"label":"Housekeeping (Hotel)","hindilabel":"होटल हाउसकीपिंग","marathilabel":"होटेल हाऊसकीपिंग","gujaratilabel":"હોટેલ હાઉસકિપિંગ","value":"hotel housekeeping"},
      {"label":"Dish Washer (Hotel)","hindilabel":"डिश वॉशर","marathilabel":"डिश वॉशर","gujaratilabel":"ડિશ વોશર","value":"dish washer"},
      {"label":"Banquet Helper","hindilabel":"बैंक्वेट हेल्पर","marathilabel":"बँक्वेट हेल्पर","gujaratilabel":"બેન્ક્વેટ હેલ્પર","value":"banquet helper"},
      {"label":"Cook Helper","hindilabel":"कुक हेल्पर","marathilabel":"कुक हेल्पर","gujaratilabel":"કુક હેલ્પર","value":"cook helper"},
      {"label":"Catering Worker","hindilabel":"कैटरिंग कर्मचारी","marathilabel":"केटरिंग कामगार","gujaratilabel":"કેટરિંગ વર્કર","value":"catering worker"},
      {"label":"Other Hospitality Work","hindilabel":"अन्य हॉस्पिटैलिटी कार्य","marathilabel":"इतर हॉस्पिटॅलिटी काम","gujaratilabel":"અન્ય હૉસ્પિટાલિટી કામ","value":"other hospitality"}
    ]
  },
  {
    "label": "Healthcare Support Workers",
    "hindilabel": "स्वास्थ्य सहायता कर्मचारी",
    "marathilabel": "आरोग्य सहाय्यक कामगार",
    "gujaratilabel": "હેલ્થકેર સપોર્ટ કામદાર",
    "value": "Healthcare Support Workers",
    "subcategories": [
      {"label":"Ward Boy","hindilabel":"वार्ड बॉय","marathilabel":"वार्ड बॉय","gujaratilabel":"વોર્ડ બોય","value":"ward boy"},
      {"label":"Nursing Helper","hindilabel":"नर्सिंग हेल्पर","marathilabel":"नर्सिंग हेल्पर","gujaratilabel":"નર્સિંગ હેલ્પર","value":"nursing helper"},
      {"label":"Patient Care","hindilabel":"मरीज देखभाल","marathilabel":"रुग्ण सेवा","gujaratilabel":"પેશન્ટ કેર","value":"patient care"},
      {"label":"Hospital Cleaner","hindilabel":"अस्पताल सफाई कर्मचारी","marathilabel":"रुग्णालय स्वच्छता कामगार","gujaratilabel":"હોસ્પિટલ ક્લીનર","value":"hospital cleaner"},
      {"label":"Medical Attendant","hindilabel":"मेडिकल अटेंडेंट","marathilabel":"मेडिकल अटेंडंट","gujaratilabel":"મેડિકલ એટેન્ડન્ટ","value":"medical attendant"},
      {"label":"Bedside Helper","hindilabel":"बेडसाइड हेल्पर","marathilabel":"बेडसाइड हेल्पर","gujaratilabel":"બેડસાઇડ હેલ્પર","value":"bedside helper"},
      {"label":"Dressing Helper","hindilabel":"ड्रेसिंग हेल्पर","marathilabel":"ड्रेसिंग हेल्पर","gujaratilabel":"ડ્રેસિંગ હેલ્પર","value":"dressing helper"},
      {"label":"OT Helper","hindilabel":"ओटी हेल्पर","marathilabel":"OT हेल्पर","gujaratilabel":"OT હેલ્પર","value":"ot helper"},
      {"label":"Ambulance Assistant","hindilabel":"एंबुलेंस सहायक","marathilabel":"ॲम्ब्युलन्स सहाय्यक","gujaratilabel":"એમ્બ્યુલન્સ સહાયક","value":"ambulance assistant"},
      {"label":"Pharmacy Helper","hindilabel":"फार्मेसी हेल्पर","marathilabel":"फार्मसी हेल्पर","gujaratilabel":"ફાર્મસી હેલ્પર","value":"pharmacy helper"},
      {"label":"Other Healthcare Support","hindilabel":"अन्य स्वास्थ्य सहायता","marathilabel":"इतर आरोग्य सहाय्य","gujaratilabel":"અન્ય હેલ્થ સપોર્ટ","value":"other healthcare"}
    ]
  },
  {
    "label": "Security & Facility Workers",
    "hindilabel": "सुरक्षा एवं सुविधा कर्मचारी",
    "marathilabel": "सुरक्षा व सुविधा कामगार",
    "gujaratilabel": "સિક્યુરિટી અને ફેસિલિટી કામદાર",
    "value": "Security & Facility Workers",
    "subcategories": [
      {"label":"Security Guard","hindilabel":"सिक्योरिटी गार्ड","marathilabel":"सिक्युरिटी गार्ड","gujaratilabel":"સિક્યુરિટી ગાર્ડ","value":"security guard"},
      {"label":"CCTV Operator","hindilabel":"सीसीटीवी ऑपरेटर","marathilabel":"CCTV ऑपरेटर","gujaratilabel":"CCTV ઓપરેટર","value":"cctv operator"},
      {"label":"Office Boy","hindilabel":"ऑफिस बॉय","marathilabel":"ऑफिस बॉय","gujaratilabel":"ઓફિસ બોય","value":"office boy"},
      {"label":"Facility Cleaner","hindilabel":"फैसिलिटी क्लीनर","marathilabel":"फॅसिलिटी क्लीनर","gujaratilabel":"ફેસિલિટી ક્લીનર","value":"facility cleaner"},
      {"label":"Sweeper","hindilabel":"सफाईकर्मी","marathilabel":"सफाई कामगार","gujaratilabel":"સ્વીપર","value":"sweeper"},
      {"label":"Building Maintenance Helper","hindilabel":"बिल्डिंग मेंटेनेंस हेल्पर","marathilabel":"बिल्डिंग मेंटेनन्स हेल्पर","gujaratilabel":"બિલ્ડિંગ મેન્ટેનન્સ હેલ્પર","value":"maintenance helper"},
      {"label":"Lift Operator","hindilabel":"लिफ्ट ऑपरेटर","marathilabel":"लिफ्ट ऑपरेटर","gujaratilabel":"લિફ્ટ ઓપરેટર","value":"lift operator"},
      {"label":"Pantry Boy","hindilabel":"पैंट्री बॉय","marathilabel":"पँट्री बॉय","gujaratilabel":"પેન્ટ્રી બોય","value":"pantry boy"},
      {"label":"Gatekeeper","hindilabel":"गेटकीपर","marathilabel":"गेटकीपर","gujaratilabel":"ગેટકીપર","value":"gatekeeper"},
      {"label":"Watchman","hindilabel":"चौकीदार","marathilabel":"वॉचमन","gujaratilabel":"વોચમેન","value":"watchman"},
      {"label":"Other Facility Work","hindilabel":"अन्य सुविधा कार्य","marathilabel":"इतर सुविधा काम","gujaratilabel":"અન્ય ફેસિલિટી કામ","value":"other facility"}
    ]
  },
  {
    "label": "Driving & Transport Workers",
    "hindilabel": "ड्राइविंग एवं परिवहन कर्मचारी",
    "marathilabel": "ड्रायव्हिंग व परिवहन कामगार",
    "gujaratilabel": "ડ્રાઇવિંગ અને ટ્રાન્સપોર્ટ કામદાર",
    "value": "Driving & Transport Workers",
    "subcategories": [
      {"label":"Driver (LMV)","hindilabel":"एलएमवी ड्राइवर","marathilabel":"LMV ड्रायव्हर","gujaratilabel":"LMV ડ્રાઇવર","value":"lmv driver"},
      {"label":"Driver (HMV)","hindilabel":"एचएमवी ड्राइवर","marathilabel":"HMV ड्रायव्हर","gujaratilabel":"HMV ડ્રાઇવર","value":"hmv driver"},
      {"label":"Auto Driver","hindilabel":"ऑटो चालक","marathilabel":"ऑटो चालक","gujaratilabel":"ઓટો ડ્રાઇવર","value":"auto driver"},
      {"label":"E-Rickshaw Driver","hindilabel":"ई-रिक्शा चालक","marathilabel":"ई-रिक्षा चालक","gujaratilabel":"ઈ-રિક્શા ડ્રાઇવર","value":"e-rickshaw driver"},
      {"label":"Delivery Driver","hindilabel":"डिलीवरी ड्राइवर","marathilabel":"डिलिव्हरी ड्रायव्हर","gujaratilabel":"ડિલિવરી ડ્રાઇવર","value":"delivery driver"},
      {"label":"Truck Driver Helper","hindilabel":"ट्रक ड्राइवर हेल्पर","marathilabel":"ट्रक ड्रायव्हर हेल्पर","gujaratilabel":"ટ્રક ડ્રાઇવર હેલ્પર","value":"truck helper"},
      {"label":"Bus Driver Helper","hindilabel":"बस ड्राइवर हेल्पर","marathilabel":"बस ड्रायव्हर हेल्पर","gujaratilabel":"બસ ડ્રાઇવર હેલ્પર","value":"bus helper"},
      {"label":"Crane Operator Helper","hindilabel":"क्रेन ऑपरेटर हेल्पर","marathilabel":"क्रेन ऑपरेटर हेल्पर","gujaratilabel":"ક્રેન ઓપરેટર હેલ્પર","value":"crane helper"},
      {"label":"Tempo Driver","hindilabel":"टेम्पो चालक","marathilabel":"टेम्पो चालक","gujaratilabel":"ટેમ્પો ડ્રાઇવર","value":"tempo driver"},
      {"label":"Tractor Driver (Transport)","hindilabel":"ट्रैक्टर चालक","marathilabel":"ट्रॅक्टर चालक","gujaratilabel":"ટ્રેક્ટર ડ્રાઇવર","value":"tractor transport"},
      {"label":"Other Driving Work","hindilabel":"अन्य ड्राइविंग कार्य","marathilabel":"इतर ड्रायव्हिंग काम","gujaratilabel":"અન્ય ડ્રાઇવિંગ કામ","value":"other driving"}
    ]
  }

]


// ================= UTILS =================
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const slugify = (text) =>
  text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

// ================= IMAGE GENERATOR =================
const generateImage = (city, category, sub) => {
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 1200, 630);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px Arial";
  ctx.fillText("BookMyWorker", 50, 100);

  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 40px Arial";
  ctx.fillText(category.label, 50, 200);

  ctx.fillStyle = "#fff";
  ctx.font = "32px Arial";
  ctx.fillText(sub.label, 50, 280);

  ctx.fillStyle = "#cbd5f5";
  ctx.font = "28px Arial";
  ctx.fillText(`in ${city}`, 50, 340);

  const fileName = `${Date.now()}-${slugify(sub.value)}.jpg`;
  const filePath = path.join(IMAGE_DIR, fileName);

  fs.writeFileSync(filePath, canvas.toBuffer("image/jpeg"));

  return filePath;
};

// ================= BLOG GENERATOR =================
const generateBlog = (city, category, sub) => {
  const worker = sub.label;

  return {
    title: `Hire ${worker} in ${city} | BookMyWorker`,
    subtitle: `Find Verified ${worker} in ${city} Quickly`,
    body: `
Looking to hire ${worker.toLowerCase()} in ${city}? BookMyWorker helps you connect with trusted and verified workers.

### Why Hire ${worker} in ${city}?
${city} is growing rapidly and demand for ${category.label.toLowerCase()} is increasing.

### Services Available:
- Skilled ${worker}
- Semi-skilled workers
- Daily wage workers
- Contract workers

### Why Choose BookMyWorker?
- Verified Workers
- Fast Hiring
- Affordable Pricing

Start hiring ${worker.toLowerCase()} today!
`,
    link: slugify(`${city}-${sub.value}-${Date.now()}`)
  };
};

// ================= API CALL =================
const createBlog = async (city, category, sub) => {
  try {
    const blog = generateBlog(city, category, sub);

    const imagePath = generateImage(city, category, sub);

    const form = new FormData();
    form.append("title", blog.title);
    form.append("subtitle", blog.subtitle);
    form.append("body", blog.body);
    form.append("link", blog.link);
    form.append("photo", fs.createReadStream(imagePath));

    await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    // delete image after upload
    fs.unlinkSync(imagePath);

    console.log("✅ Created:", blog.title);

  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  }
};

// ================= MAIN =================
const run = async () => {
  let total = 0;

  for (const city of cities) {
    for (const category of categories) {
      for (const sub of category.subcategories) {
        await createBlog(city, category, sub);

        total++;
        console.log(`📊 Total Created: ${total}`);

        await delay(DELAY_MS);
      }
    }
  }

  console.log("🚀 ALL BLOGS CREATED!");
};

run();