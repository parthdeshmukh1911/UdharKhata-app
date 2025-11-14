// src/screens/UserManualScreen.js

import React, { useState, useContext } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SimpleLanguageContext } from '../contexts/SimpleLanguageContext';
import { 
  FontSizes, 
  Spacing, 
  IconSizes, 
  ButtonSizes, 
  BorderRadius 
} from '../Utils/Responsive';

export default function UserManualScreen() {
  const { theme } = useTheme();
  const [expandedSections, setExpandedSections] = useState({});

  const languageContext = useContext(SimpleLanguageContext);
  const langKey = languageContext?.currentLanguage || 'en';

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // ✅ Use the correct structure from your file
  const manualContentByLanguage = {
    en: [
      {
        id: 'intro',
        title: 'Introduction',
        content: `UdharKhataPlus is a digital accounting app designed for small shopkeepers, traders, and local business owners in India. It helps you maintain customer ledgers, track money given and received efficiently - both online and offline.

Key Features:
1. Manage unlimited customers (with Premium)
2. Track credit/debit transactions
3. Automatic balance calculation
4. WhatsApp and SMS alerts
5. 100% offline capability
6. Multi-device cloud sync (with Premium)
7. Hindi & Marathi support
8. PDF/Excel reports`,
      },
      {
        id: 'getting-started',
        title: 'Getting Started',
        content: `Installation:
1. Download the APK file.
2. Install on your Android phone
3. Open the app and start using immediately (no login required for offline mode)

First-Time Setup:
Option 1: OFFLINE MODE (No internet needed)
→ Open app → Start adding customers → Done!

Option 2: WITH CLOUD SYNC (For multi-device access)
→ Open app → Profile → Sign Up → Enter business details ,email & password → Done!
(Cloud sync will be enabled with premium subscription only)`,
      },
      {
        id: 'managing-customers',
        title: 'Managing Customers',
        content: `Add a New Customer:
• Tap the "+" button on Customer Screen
• Fill in customer details:
  - Name (required)
  - Phone number (required)
  - Address (optional)
• Tap "Save Customer"

Edit Customer:
• Tap on customer name from the list
• Modify details
• Tap "Update"

Features:
1. Only customers with active balance are shown on screen.
2. Send WhatsApp/SMS reminders directly from customer screen by tapping on "chat" icon.
3. Call customer by tapping "phone" icon.
4. Customer sorting avaialble: Sort by Name or Balance.`,
      },
      {
        id: 'transactions',
        title: 'Recording Transactions',
        content: `Add Credit (Money Given to Customer):
• Tap "+" or "Add Transaction"
• Select "Credit" or "Debit" option
• Select customer
• Enter amount
• Enter date
• Add notes/reason (Optional)
• Add photo (Optional)
• Tap "Save"
Balance updates automatically

Example:
1. You give ₹500 to Rajesh → Record as Credit
2. Rajesh gives back ₹500 → Record as Debit

View Transaction History:
• Select customer
• Scroll down to see all transactions
• Each transaction shows:
  - Date
  - Credit given/Payment received amount
  - Running balance after transaction

Edit Transaction:
• Tap on transaction
• Modify Details
• Click save changes

Features:
1. Automatic balance calculation after each transaction.
2. Photo attachment for proof of transaction.
3. Notes for each transaction for better record-keeping.
4. Filter transactions by Credit/Debit type.
5. Sort transactions by Date or Amount.
6. Download transaction history as PDF report.`,
      },
      {
        id: 'dashboard',
        title: 'Dashboard & Analytics',
        content: `Summary Statistics:
• Total Customers: Number of customers
• Total Outstanding: Total money owed by customers
• Total Credit Given: Total money given out
• Total Payment: Total money received
• Total customers with credit
• Fully settled customers

Financial Overview:
• Visual breakdown of credit vs debit transactions
• Helps identify if you're giving too much or collecting well

Top Outstanding Customers:
• Shows top 5 customers with highest current balance
• Tap on message icon to send payment reminder`,
      },
      {
        id: 'cloud-sync',
        title: 'Cloud Sync & Multi-Device',
        content: `What is Cloud Sync?
Backup your data to secure cloud servers so you can access it from multiple phones/tablets.

Enable Cloud Sync:
• Go to profile → Sign In / Sign Up
• Enter email & password
✅ Sync automatically starts (if premium is active)
• Your data is backed up to cloud

Multi-Device Access:
• Install app on another phone
• Go to profile → Sign In
• Enter same email & password
✅ All your customers & transactions appear!

How Often Does It Sync?
• Automatically when you add/edit customers or transactions
• Periodic sync every 30 seconds if internet is available
• Manual sync button

Is My Data Safe?
✅ Yes! Only you can access your data. Password encrypted.`,
      },
      {
        id: 'subscriptions',
        title: 'Subscription Plans',
        content: `Free Plan (Forever Free):
✅ Manage up to 20 customers
✅ All offline features
❌ NO cloud sync
❌ NO multi-device access
Cost: ₹0

Premium Plans:
Once you add 51st customer, upgrade to premium:

💎 1️⃣ Starter — 6 Months (₹799)
Duration: 6 Months
Monthly Equivalent: ₹133.17
Discount: Base reference (0%)
Tagline: Kickstart your journey — perfect for exploring all features before committing long-term.

🌟 2️⃣ Growth — 1 Year (₹1,299)
Duration: 12 Months
Monthly Equivalent: ₹108.25
Discount: 18.7% off compared to the 6-month plan
Tagline: Our most popular plan — double the duration, save almost 20%!

⚡ 3️⃣ Trust — 18 Months (₹1,799)
Duration: 18 Months
Monthly Equivalent: ₹99.94
Discount: 24.9% off compared to the 6-month plan
Tagline: For dedicated users — go longer, save more, and enjoy extended convenience.

Premium Features:
✅ Unlimited customers (no 20 limit)
✅ Cloud sync (all devices)
✅ Multi-device access
✅ Data backup
✅ All future features
✅ Active customer support

How to Upgrade:
• Choose your plan
• Contact us with payment
• We'll enable Premium for you`,
      },
      {
        id: 'offline-mode',
        title: 'Offline Mode',
        content: `Works Without Internet:
✅ Add customers - works offline
✅ Add transactions - works offline
✅ View balance - works offline
✅ Export data - works offline
❌ Cloud sync - needs internet

What Happens to Offline Data?
• All data stored locally on your phone
• Safe & secure on your device
• When internet available, syncs to cloud (if Premium)

Tips for Offline Use:
• Store data regularly (backup to cloud when possible)
• Don't delete the app without backup
• Phone storage should have ~180MB free space`,
      },
      {
        id: 'settings',
        title: 'Settings & Preferences',
        content: `Theme:
• Light Mode: Eye-friendly for daytime
• Dark Mode: Battery-saving, night-friendly
• Tap toggle at bottom on Profile Screen to switch

Language:
• First page on app launch
• Choose: English, हिंदी (Hindi), मराठी (Marathi)
• Restart app to change language

Account:
• Login: Sign in to create profile and enable cloud sync
• Logout: Sign out (local data remains safe)
• Reset Password: Use "Forgot Password" with OTP

Data Management:
• Export to Excel: Download all customers & transactions
• Import from Excel: Add bulk customers from spreadsheet
• Monthly pdf report generation
• Outstanding customers report`,
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        content: `Q: App crashes when I open it
A: Apply any of the below solution:
• Force close the app: Settings → Apps → UdharKhataPlus → Force Stop
• Clear cache: Settings → Apps → UdharKhataPlus → Clear Cache
• Restart phone
• Reopen app again

Q: Sync is not working
A:
• Check internet connection (WiFi or mobile data)
• Make sure you're logged in: Settings → Check if email shows
• Go to summary screen and pull down to refresh
• Restart app
• Make sure Premium subscription is active

Q: I can't login / getting "Invalid credentials"
A:
• Check email spelling (case-sensitive)
• Check internet connection
• Use "Forgot Password" to reset
• Contact support if email is invalid

Q: Data not showing on second phone
A:
• Make sure Premium subscription is active
• Login with same email on both phones
• Pull down on customer list to refresh
• Wait 1-2 minutes for sync to complete
• Restart app if still not working

Q: Balance is showing wrong
A:
• Check if all transactions are properly saved
• Tap on customer to see all transactions
• If wrong, edit/delete incorrect transaction
• Balance recalculates automatically
• If issue persists, export data and contact support

Q: Can't add more than 20 active customers
A:
• You've reached free tier limit
• Upgrade to Premium plan
• After upgrade, you can add unlimited customers

Q: What if I lose my phone?
A:
• If Premium: Install app on new phone and login (data recovered from cloud!)
• If Free tier: Data is lost (only on old phone) - backup regularly!`,
      },
      {
        id: 'faq',
        title: 'FAQ (Frequently Asked Questions)',
        content: `🔐 Security & Privacy

Q1: Is my data safe in the cloud?
A: Yes! We use military-grade encryption. Only you can access your data with your password. We cannot see or access your customer information.

Q2: What happens if I forget my password?
A: Go to Login → "Forgot Password" → Enter email → We'll send OTP (One-Time Password) → Use OTP to reset password → Create new password.

Q3: Can someone else access my account?
A: No. Only your email + password combination can access your account. Don't share your credentials!

Q4: Is there a backup system?
A: Yes! With Premium, automatic daily backup happens. Free tier: only local backup on your phone.

💰 Subscriptions & Pricing

Q5: Do I have to pay for the app?
A: No! App is free forever. Free tier allows 20 active customers. If you need more, upgrade to Premium (₹1,299/year for unlimited).

Q6: Can I change my subscription plan later?
A: Yes. Contact us anytime to upgrade/downgrade. Changes take effect immediately.

Q7: What if my subscription expires?
A: Cloud sync stops working automatically. Local data stays safe on phone. Renew subscription to resume syncing.

Q8: Can I get lifetime subscription?
A: Yes! 5-Year plan (₹4,499) = Pay once, use forever. Best for long-term use.

Q9: What payment methods do you accept?
A: Cash (if meeting in person), Bank transfer, UPI.

📱 Offline vs Online

Q10: Can I use the app without internet?
A: Yes! All offline features work: add customers, add transactions, view balance. Only cloud sync needs internet.

Q12: Will I lose data if phone turns off?
A: No! Data is saved locally on phone storage. Even after restart, data is safe.

Q13: How many devices can I sync to?
A: With Premium: Unlimited! Add same email on as many phones as you want.

Q14: If I delete the app, does data disappear?
A:
• With Premium: Data stays in cloud! Reinstall app and login to recover.
• Without Premium: Data is lost (only stored locally). Backup before deleting!

🔄 Sync & Multi-Device

Q15: How long does sync take?
A: Usually 1-2 seconds. If internet is slow, can take up to 1 minute.

Q16: What if I add same customer on two phones?
A: App detects duplicates by name + phone number. Automatically merges into one customer.

Q17: What if two people add transactions to same customer at same time?
A: Both transactions are recorded. Balance updates correctly. No conflicts!

Q18: Can I sync between Android and iPhone?
A: Currently only Android. iOS version coming soon!

👥 Customer Management

Q19: Can I delete a customer?
A: Yes, but all their transactions also delete. Better to just keep them (won't affect balance if locked customer).

Q20: Can I edit past transactions?
A: Yes! Tap on transaction and edit amount/date. Balance recalculates automatically.

Q21: How many customers can I add?
A:
• Free tier: 20 active customers max
• Premium tier: Unlimited (1000+, 10000+, no limit!)

Q22: Can I search for customers?
A: Yes! Use search bar at top. Search by name, phone number, or shop name.

📊 Reports & Data

Q23: Can I export my data?
A: Yes! Go to Summary Screen → "Export to Excel" → All customers and transactions downloaded as Excel file.

Q24: Can I import customers from Excel?
A: Yes! Go to Summary Screen → "Import" → Select Excel file → Review duplicates → Confirm import.

Q25: Can I print receipts?
A: Not in-app yet. But you download PDF report of complete customer ledger.

⚙️ Technical

Q26: What's the minimum Android version needed?
A: Android 6.0 and above. Most phones made in last 5 years support this.

Q27: How much storage does the app use?
A: About 150MB for the app. Local database can use 10-100MB depending on transaction volume.

Q28: Does the app drain the battery fast?
A: No! Very optimized. Background sync is minimal. Uses <5% battery per hour.

Q29: Can I use the app on a tablet?
A: Yes! Works on any Android device (phone or tablet).

👨‍💼 Support & Help

Q30: How do I contact support?
A:
Email: parthdeshmukh293@gmail.com
Response time: 24 hours

Q31: Can I use the app for business other than retail?
A: Absolutely! Works for any business with customer ledgers: restaurants, services, trading, etc.

🎓 Learning & Tips

Q32: How do I use the app efficiently?
A:
• Add customers with correct phone (for duplicate detection)
• Record transactions immediately (not later)
• Review balance weekly
• Enable cloud sync to avoid data loss
• Export data monthly as backup

Q33: What's the difference between Credit and Debit?
A:
• Credit = You give money to customer (customer owes you)
• Debit = Customer gives money to you (you owe them less)

Q34: How do I know if a customer owes me money?
A:
• Check Customer Screen → Outstanding amount
• Tap customer name → If balance is positive, they owe you

Q35: Can I add notes to transactions?
A: Yes! When adding transaction, tap "Add Notes" to record reason/details.

Q36: How often should I backup my data?
A: Weekly if possible. Go to Summary screen → "Export to Excel" to backup.`,
      },
     {
      id: 'support',
      title: 'Support & Contact',
      content: `Support & Contact

Example format:
📧 Email: parthdeshmukh293@gmail.com
⏰ Support Hours: 11 AM - 8 PM (Sat-Sun)

For technical issues:
• Email us with screenshots
• Include your app version
• Describe the problem clearly

For subscription help:
• Contact your distributor
• Provide your registered email
• Mention subscription plan`,
    },
      
    ],
    hi: [
  {
    "id": "intro",
    "title": "परिचय",
    "content": "UdharKhataPlus एक डिजिटल अकाउंटिंग ऐप है जो भारत में छोटे दुकानदारों, व्यापारियों और स्थानीय व्यवसाय मालिकों के लिए डिज़ाइन किया गया है। यह आपको ग्राहक खाता-बही बनाए रखने, दिए गए और प्राप्त किए गए पैसों को कुशलता से ट्रैक करने में मदद करता है - ऑनलाइन और ऑफलाइन दोनों।\n\nमुख्य विशेषताएं:\n1. असीमित ग्राहक प्रबंधित करें (प्रीमियम के साथ)\n2. क्रेडिट/डेबिट लेनदेन ट्रैक करें\n3. स्वचालित शेष गणना (Automatic balance calculation)\n4. WhatsApp और SMS अलर्ट\n5. 100% ऑफ़लाइन क्षमता\n6. मल्टी-डिवाइस क्लाउड सिंक (प्रीमियम के साथ)\n7. हिंदी और मराठी समर्थन\n8. PDF/Excel रिपोर्ट"
  },
  {
    "id": "getting-started",
    "title": "शुरुआत करना",
    "content": "इंस्टॉलेशन:\n1. APK फ़ाइल डाउनलोड करें।\n2. अपने Android फ़ोन पर इंस्टॉल करें\n3. ऐप खोलें और तुरंत उपयोग करना शुरू करें (ऑफ़लाइन मोड के लिए लॉगिन आवश्यक नहीं)\n\nपहली बार का सेटअप:\nविकल्प 1: ऑफ़लाइन मोड (इंटरनेट की आवश्यकता नहीं)\n→ ऐप खोलें → ग्राहक जोड़ना शुरू करें → हो गया!\n\nविकल्प 2: क्लाउड सिंक के साथ (मल्टी-डिवाइस एक्सेस के लिए)\n→ ऐप खोलें → प्रोफ़ाइल → साइन अप करें → व्यवसाय विवरण, ईमेल और पासवर्ड दर्ज करें → हो गया!\n(क्लाउड सिंक केवल प्रीमियम सदस्यता के साथ सक्षम होगा)"
  },
  {
    "id": "managing-customers",
    "title": "ग्राहकों का प्रबंधन",
    "content": "एक नया ग्राहक जोड़ें:\n• ग्राहक स्क्रीन पर \"+\" बटन पर टैप करें\n• ग्राहक विवरण भरें:\n  - नाम (आवश्यक)\n  - फ़ोन नंबर (आवश्यक)\n  - पता (वैकल्पिक)\n• \"ग्राहक सहेजें\" पर टैप करें\n\nग्राहक संपादित करें:\n• सूची से ग्राहक के नाम पर टैप करें\n• विवरण संशोधित करें\n• \"अपडेट करें\" पर टैप करें\n\nविशेषताएं:\n1. स्क्रीन पर केवल सक्रिय शेष राशि वाले ग्राहक ही दिखाए जाते हैं।\n2. \"चैट\" आइकन पर टैप करके ग्राहक स्क्रीन से सीधे WhatsApp/SMS रिमाइंडर भेजें।\n3. \"फ़ोन\" आइकन पर टैप करके ग्राहक को कॉल करें।\n4. ग्राहक सॉर्टिंग उपलब्ध: नाम या शेष राशि के अनुसार सॉर्ट करें।"
  },
  {
    "id": "transactions",
    "title": "लेनदेन रिकॉर्ड करना",
    "content": "क्रेडिट जोड़ें (ग्राहक को दिया गया पैसा):\n• \"+\" या \"लेनदेन जोड़ें\" पर टैप करें\n• \"क्रेडिट\" या \"डेबिट\" विकल्प चुनें\n• ग्राहक चुनें\n• राशि दर्ज करें\n• तारीख दर्ज करें\n• नोट्स/कारण जोड़ें (वैकल्पिक)\n• फोटो जोड़ें (वैकल्पिक)\n• \"सहेजें\" पर टैप करें\nशेष राशि स्वचालित रूप से अपडेट हो जाती है\n\nउदाहरण:\n1. आपने राजेश को ₹500 दिए → क्रेडिट के रूप में रिकॉर्ड करें\n2. राजेश ने ₹500 वापस दिए → डेबिट के रूप में रिकॉर्ड करें\n\nलेनदेन इतिहास देखें:\n• ग्राहक चुनें\n• सभी लेनदेन देखने के लिए नीचे स्क्रॉल करें\n• प्रत्येक लेनदेन दिखाता है:\n  - तारीख\n  - दिया गया क्रेडिट/प्राप्त भुगतान राशि\n  - लेनदेन के बाद शेष राशि\n\nलेनदेन संपादित करें:\n• लेनदेन पर टैप करें\n• विवरण संशोधित करें\n• परिवर्तन सहेजें पर क्लिक करें\n\nविशेषताएं:\n1. प्रत्येक लेनदेन के बाद स्वचालित शेष गणना।\n2. लेनदेन के प्रमाण के लिए फोटो संलग्नक।\n3. बेहतर रिकॉर्ड-कीपिंग के लिए प्रत्येक लेनदेन के लिए नोट्स।\n4. क्रेडिट/डेबिट प्रकार के अनुसार लेनदेन फ़िल्टर करें।\n5. तारीख या राशि के अनुसार लेनदेन सॉर्ट करें।\n6. लेनदेन इतिहास को PDF रिपोर्ट के रूप में डाउनलोड करें।"
  },
  {
    "id": "dashboard",
    "title": "डैशबोर्ड और विश्लेषण",
    "content": "सारांश सांख्यिकी:\n• कुल ग्राहक: ग्राहकों की संख्या\n• कुल बकाया: ग्राहकों द्वारा बकाया कुल पैसा\n• कुल क्रेडिट दिया गया: कुल दिया गया पैसा\n• कुल भुगतान: कुल प्राप्त पैसा\n• क्रेडिट वाले कुल ग्राहक\n• पूरी तरह से व्यवस्थित ग्राहक\n\nवित्तीय अवलोकन:\n• क्रेडिट बनाम डेबिट लेनदेन का दृश्य विश्लेषण\n• यह पहचानने में मदद करता है कि आप बहुत अधिक दे रहे हैं या अच्छी तरह से संग्रह कर रहे हैं\n\nशीर्ष बकाया ग्राहक:\n• उच्चतम वर्तमान शेष राशि वाले शीर्ष 5 ग्राहकों को दिखाता है\n• भुगतान रिमाइंडर भेजने के लिए संदेश आइकन पर टैप करें"
  },
  {
    "id": "cloud-sync",
    "title": "क्लाउड सिंक और मल्टी-डिवाइस",
    "content": "क्लाउड सिंक क्या है?\nअपने डेटा का सुरक्षित क्लाउड सर्वर पर बैकअप लें ताकि आप इसे कई फोन/टैबलेट से एक्सेस कर सकें।\n\nक्लाउड सिंक सक्षम करें:\n• प्रोफ़ाइल पर जाएं → साइन इन / साइन अप करें\n• ईमेल और पासवर्ड दर्ज करें\n✅ सिंक स्वचालित रूप से शुरू होता है (यदि प्रीमियम सक्रिय है)\n• आपका डेटा क्लाउड पर बैकअप हो जाता है\n\nमल्टी-डिवाइस एक्सेस:\n• दूसरे फोन पर ऐप इंस्टॉल करें\n• प्रोफ़ाइल पर जाएं → साइन इन करें\n• वही ईमेल और पासवर्ड दर्ज करें\n✅ आपके सभी ग्राहक और लेनदेन दिखाई देंगे!\n\nयह कितनी बार सिंक होता है?\n• जब आप ग्राहक या लेनदेन जोड़ते/संपादित करते हैं तो स्वचालित रूप से\n• यदि इंटरनेट उपलब्ध है तो हर 30 सेकंड में आवधिक सिंक\n• मैनुअल सिंक बटन\n\nक्या मेरा डेटा सुरक्षित है?\n✅ हाँ! केवल आप ही अपने डेटा तक पहुंच सकते हैं। पासवर्ड एन्क्रिप्टेड है।"
  },
  {
    "id": "subscriptions",
    "title": "सदस्यता योजनाएं",
    "content": "मुफ़्त योजना (हमेशा मुफ़्त):\n✅ 20 ग्राहकों तक प्रबंधित करें\n✅ सभी ऑफ़लाइन सुविधाएँ\n❌ कोई क्लाउड सिंक नहीं\n❌ कोई मल्टी-डिवाइस एक्सेस नहीं\nलागत: ₹0\n\nप्रीमियम योजनाएं:\nएक बार जब आप 51वां ग्राहक जोड़ लेते हैं, तो प्रीमियम में अपग्रेड करें:\n\n💎 1️⃣ स्टार्टर — 6 महीने (₹799)\nअवधि: 6 महीने\nमासिक समतुल्य: ₹133.17\nछूट: आधार संदर्भ (0%)\nटैगलाइन: अपनी यात्रा किकस्टार्ट करें — लंबी अवधि के लिए प्रतिबद्ध होने से पहले सभी सुविधाओं की खोज के लिए एकदम सही।\n\n🌟 2️⃣ ग्रोथ — 1 साल (₹1,299)\nअवधि: 12 महीने\nमासिक समतुल्य: ₹108.25\nछूट: 6 महीने की योजना की तुलना में 18.7% की छूट\nटैगलाइन: हमारी सबसे लोकप्रिय योजना — अवधि दोगुनी करें, लगभग 20% बचाएं!\n\n⚡ 3️⃣ ट्रस्ट — 18 महीने (₹1,799)\nअवधि: 18 महीने\nमासिक समतुल्य: ₹99.94\nछूट: 6 महीने की योजना की तुलना में 24.9% की छूट\nटैगलाइन: समर्पित उपयोगकर्ताओं के लिए — लंबा चलें, अधिक बचाएं, और विस्तारित सुविधा का आनंद लें।\n\nप्रीमियम सुविधाएँ:\n✅ असीमित ग्राहक (कोई 20 की सीमा नहीं)\n✅ क्लाउड सिंक (सभी डिवाइस)\n✅ मल्टी-डिवाइस एक्सेस\n✅ डेटा बैकअप\n✅ सभी भविष्य की सुविधाएँ\n✅ सक्रिय ग्राहक सहायता\n\nअपग्रेड कैसे करें:\n• अपनी योजना चुनें\n• भुगतान के साथ हमसे संपर्क करें\n• हम आपके लिए प्रीमियम सक्षम कर देंगे"
  },
  {
    "id": "offline-mode",
    "title": "ऑफलाइन मोड",
    "content": "इंटरनेट के बिना काम करता है:\n✅ ग्राहक जोड़ें - ऑफ़लाइन काम करता है\n✅ लेनदेन जोड़ें - ऑफ़लाइन काम करता है\n✅ शेष राशि देखें - ऑफ़लाइन काम करता है\n✅ डेटा निर्यात करें - ऑफ़लाइन काम करता है\n❌ क्लाउड सिंक - इंटरनेट की आवश्यकता है\n\nऑफ़लाइन डेटा का क्या होता है?\n• सभी डेटा आपके फ़ोन पर स्थानीय रूप से संग्रहीत होता है\n• आपके डिवाइस पर सुरक्षित और सुरक्षित\n• जब इंटरनेट उपलब्ध होता है, तो क्लाउड से सिंक होता है (यदि प्रीमियम है)\n\nऑफ़लाइन उपयोग के लिए सुझाव:\n• नियमित रूप से डेटा स्टोर करें (जब संभव हो तो क्लाउड पर बैकअप लें)\n• बैकअप के बिना ऐप को न हटाएं\n• फ़ोन स्टोरेज में ~180MB खाली जगह होनी चाहिए"
  },
  {
    "id": "settings",
    "title": "सेटिंग्स और प्राथमिकताएं",
    "content": "थीम:\n• लाइट मोड: दिन के समय के लिए आंखों के अनुकूल\n• डार्क मोड: बैटरी-बचत, रात के अनुकूल\n• स्विच करने के लिए प्रोफ़ाइल स्क्रीन पर नीचे टॉगल पर टैप करें\n\nभाषा:\n• ऐप लॉन्च पर पहला पेज\n• चुनें: English, हिंदी (Hindi), मराठी (Marathi)\n• भाषा बदलने के लिए ऐप को पुनः आरंभ करें\n\nखाता:\n• लॉगिन: प्रोफ़ाइल बनाने और क्लाउड सिंक सक्षम करने के लिए साइन इन करें\n• लॉगआउट: साइन आउट करें (स्थानीय डेटा सुरक्षित रहता है)\n• पासवर्ड रीसेट करें: OTP के साथ \"पासवर्ड भूल गए\" का उपयोग करें\n\nडेटा प्रबंधन:\n• Excel में निर्यात करें: सभी ग्राहकों और लेनदेन को डाउनलोड करें\n• Excel से आयात करें: स्प्रेडशीट से थोक ग्राहकों को जोड़ें\n• मासिक पीडीएफ रिपोर्ट निर्माण\n• बकाया ग्राहकों की रिपोर्ट"
  },
  {
    "id": "troubleshooting",
    "title": "समस्या निवारण",
    "content": "Q: ऐप खोलते ही क्रैश हो जाता है\nA: नीचे दिए गए किसी भी समाधान को लागू करें:\n• ऐप को बलपूर्वक बंद करें: सेटिंग्स → ऐप्स → UdharKhataPlus → बलपूर्वक रोकें\n• कैश साफ़ करें: सेटिंग्स → ऐप्स → UdharKhataPlus → कैश साफ़ करें\n• फ़ोन को पुनः आरंभ करें\n• ऐप को फिर से खोलें\n\nQ: सिंक काम नहीं कर रहा है\nA:\n• इंटरनेट कनेक्शन (WiFi या मोबाइल डेटा) जांचें\n• सुनिश्चित करें कि आप लॉग इन हैं: सेटिंग्स → जांचें कि ईमेल दिखाता है या नहीं\n• सारांश स्क्रीन पर जाएं और रीफ्रेश करने के लिए नीचे खींचें\n• ऐप को पुनः आरंभ करें\n• सुनिश्चित करें कि प्रीमियम सदस्यता सक्रिय है\n\nQ: मैं लॉगिन नहीं कर सकता / \"अमान्य क्रेडेंशियल\" मिल रहा है\nA:\n• ईमेल वर्तनी जांचें (केस-संवेदनशील)\n• इंटरनेट कनेक्शन जांचें\n• रीसेट करने के लिए \"पासवर्ड भूल गए\" का उपयोग करें\n• यदि ईमेल अमान्य है तो समर्थन से संपर्क करें\n\nQ: दूसरे फोन पर डेटा नहीं दिख रहा है\nA:\n• सुनिश्चित करें कि प्रीमियम सदस्यता सक्रिय है\n• दोनों फोन पर एक ही ईमेल से लॉगिन करें\n• रीफ्रेश करने के लिए ग्राहक सूची पर नीचे खींचें\n• सिंक पूरा होने के लिए 1-2 मिनट प्रतीक्षा करें\n• अगर अभी भी काम नहीं कर रहा है तो ऐप को पुनः आरंभ करें\n\nQ: शेष राशि गलत दिखा रही है\nA:\n• जांचें कि क्या सभी लेनदेन ठीक से सहेजे गए हैं\n• सभी लेनदेन देखने के लिए ग्राहक पर टैप करें\n• यदि गलत है, तो गलत लेनदेन को संपादित/हटाएं\n• शेष राशि स्वचालित रूप से पुनर्गणना करती है\n• यदि समस्या बनी रहती है, तो डेटा निर्यात करें और समर्थन से संपर्क करें\n\nQ: मैं 20 से अधिक सक्रिय ग्राहक नहीं जोड़ सकता\nA:\n• आप मुफ़्त टियर सीमा तक पहुंच गए हैं\n• प्रीमियम योजना में अपग्रेड करें\n• अपग्रेड के बाद, आप असीमित ग्राहक जोड़ सकते हैं\n\nQ: अगर मेरा फोन खो जाए तो क्या होगा?\nA:\n• यदि प्रीमियम: नए फोन पर ऐप इंस्टॉल करें और लॉगिन करें (डेटा क्लाउड से पुनर्प्राप्त हो गया है!)\n• यदि मुफ़्त टियर: डेटा खो गया है (केवल पुराने फोन पर) - नियमित रूप से बैकअप लें!"
  },
  {
    "id": "faq",
    "title": "अक्सर पूछे जाने वाले प्रश्न (FAQ)",
    "content": "🔐 सुरक्षा और गोपनीयता\n\nQ1: क्या क्लाउड में मेरा डेटा सुरक्षित है?\nA: हाँ! हम मिलिट्री-ग्रेड एन्क्रिप्शन का उपयोग करते हैं। केवल आप ही अपने पासवर्ड से अपने डेटा तक पहुंच सकते हैं। हम आपकी ग्राहक जानकारी को देख या एक्सेस नहीं कर सकते।\n\nQ2: अगर मैं अपना पासवर्ड भूल जाऊं तो क्या होगा?\nA: लॉगिन पर जाएं → \"पासवर्ड भूल गए\" → ईमेल दर्ज करें → हम OTP (वन-टाइम पासवर्ड) भेजेंगे → पासवर्ड रीसेट करने के लिए OTP का उपयोग करें → नया पासवर्ड बनाएं।\n\nQ3: क्या कोई और मेरे खाते तक पहुंच सकता है?\nA: नहीं। केवल आपका ईमेल + पासवर्ड संयोजन ही आपके खाते तक पहुंच सकता है। अपनी क्रेडेंशियल्स साझा न करें!\n\nQ4: क्या कोई बैकअप प्रणाली है?\nA: हाँ! प्रीमियम के साथ, स्वचालित दैनिक बैकअप होता है। मुफ़्त टियर: केवल आपके फ़ोन पर स्थानीय बैकअप।\n\n💰 सदस्यता और मूल्य निर्धारण\n\nQ5: क्या मुझे ऐप के लिए भुगतान करना होगा?\nA: नहीं! ऐप हमेशा के लिए मुफ़्त है। मुफ़्त टियर 20 सक्रिय ग्राहकों की अनुमति देता है। यदि आपको अधिक की आवश्यकता है, तो प्रीमियम में अपग्रेड करें (असीमित के लिए ₹1,299/वर्ष)।\n\nQ6: क्या मैं बाद में अपनी सदस्यता योजना बदल सकता हूँ?\nA: हाँ। अपग्रेड/डाउनग्रेड करने के लिए कभी भी हमसे संपर्क करें। परिवर्तन तुरंत प्रभावी होते हैं।\n\nQ7: अगर मेरी सदस्यता समाप्त हो जाए तो क्या होगा?\nA: क्लाउड सिंक स्वचालित रूप से काम करना बंद कर देता है। स्थानीय डेटा फ़ोन पर सुरक्षित रहता है। सिंक फिर से शुरू करने के लिए सदस्यता नवीनीकृत करें।\n\nQ8: क्या मुझे आजीवन सदस्यता मिल सकती है?\nA: हाँ! 5 साल की योजना (₹4,499) = एक बार भुगतान करें, हमेशा के लिए उपयोग करें। लंबी अवधि के उपयोग के लिए सबसे अच्छा।\n\nQ9: आप कौन से भुगतान तरीके स्वीकार करते हैं?\nA: नकद (यदि व्यक्तिगत रूप से मिलते हैं), बैंक हस्तांतरण, UPI।\n\n📱 ऑफ़लाइन बनाम ऑनलाइन\n\nQ10: क्या मैं इंटरनेट के बिना ऐप का उपयोग कर सकता हूँ?\nA: हाँ! सभी ऑफ़लाइन सुविधाएँ काम करती हैं: ग्राहक जोड़ें, लेनदेन जोड़ें, शेष राशि देखें। केवल क्लाउड सिंक के लिए इंटरनेट की आवश्यकता होती है।\n\nQ12: अगर फ़ोन बंद हो जाए तो क्या मेरा डेटा खो जाएगा?\nA: नहीं! डेटा फ़ोन स्टोरेज पर स्थानीय रूप से सहेजा जाता है। पुनरारंभ के बाद भी डेटा सुरक्षित रहता है।\n\nQ13: मैं कितने उपकरणों से सिंक कर सकता हूँ?\nA: प्रीमियम के साथ: असीमित! जितने चाहें उतने फ़ोन पर एक ही ईमेल जोड़ें।\n\nQ14: अगर मैं ऐप हटा दूं, तो क्या डेटा गायब हो जाएगा?\nA:\n• प्रीमियम के साथ: डेटा क्लाउड में रहता है! पुनर्प्राप्त करने के लिए ऐप को फिर से इंस्टॉल करें और लॉगिन करें।\n• प्रीमियम के बिना: डेटा खो जाता है (केवल स्थानीय रूप से संग्रहीत)। हटाने से पहले बैकअप लें!\n\n🔄 सिंक और मल्टी-डिवाइस\n\nQ15: सिंक में कितना समय लगता है?\nA: आमतौर पर 1-2 सेकंड। अगर इंटरनेट धीमा है, तो 1 मिनट तक लग सकता है।\n\nQ16: अगर मैं दो फोन पर एक ही ग्राहक जोड़ूं तो क्या होगा?\nA: ऐप नाम + फ़ोन नंबर द्वारा डुप्लिकेट का पता लगाता है। स्वचालित रूप से एक ग्राहक में विलय हो जाता है।\n\nQ17: क्या होगा अगर दो लोग एक ही समय में एक ही ग्राहक के लिए लेनदेन जोड़ते हैं?\nA: दोनों लेनदेन रिकॉर्ड किए जाते हैं। शेष राशि सही ढंग से अपडेट होती है। कोई विरोध नहीं!\n\nQ18: क्या मैं Android और iPhone के बीच सिंक कर सकता हूँ?\nA: वर्तमान में केवल Android। iOS संस्करण जल्द ही आ रहा है!\n\n👥 ग्राहक प्रबंधन\n\nQ19: क्या मैं किसी ग्राहक को हटा सकता हूँ?\nA: हाँ, लेकिन उनके सभी लेनदेन भी हट जाते हैं। उन्हें रखना बेहतर है (यदि लॉक किए गए ग्राहक हैं तो शेष राशि को प्रभावित नहीं करेगा)।\n\nQ20: क्या मैं पिछले लेनदेन संपादित कर सकता हूँ?\nA: हाँ! लेनदेन पर टैप करें और राशि/तारीख संपादित करें। शेष राशि स्वचालित रूप से पुनर्गणना करती है।\n\nQ21: मैं कितने ग्राहक जोड़ सकता हूँ?\nA:\n• मुफ़्त टियर: अधिकतम 20 सक्रिय ग्राहक\n• प्रीमियम टियर: असीमित (1000+, 10000+, कोई सीमा नहीं!)\n\nQ22: क्या मैं ग्राहकों को खोज सकता हूँ?\nA: हाँ! शीर्ष पर खोज बार का उपयोग करें। नाम, फ़ोन नंबर, या दुकान के नाम से खोजें।\n\n📊 रिपोर्ट और डेटा\n\nQ23: क्या मैं अपना डेटा निर्यात कर सकता हूँ?\nA: हाँ! सारांश स्क्रीन पर जाएं → \"Excel में निर्यात करें\" → सभी ग्राहक और लेनदेन Excel फ़ाइल के रूप में डाउनलोड किए जाते हैं।\n\nQ24: क्या मैं Excel से ग्राहकों को आयात कर सकता हूँ?\nA: हाँ! सारांश स्क्रीन पर जाएं → \"आयात\" → Excel फ़ाइल चुनें → डुप्लिकेट की समीक्षा करें → आयात की पुष्टि करें।\n\nQ25: क्या मैं रसीदें प्रिंट कर सकता हूँ?\nA: अभी इन-ऐप नहीं। लेकिन आप पूर्ण ग्राहक खाता-बही की PDF रिपोर्ट डाउनलोड कर सकते हैं।\n\n⚙️ तकनीकी\n\nQ26: न्यूनतम आवश्यक Android संस्करण क्या है?\nA: Android 6.0 और उससे ऊपर। पिछले 5 वर्षों में बने अधिकांश फ़ोन इसका समर्थन करते हैं।\n\nQ27: ऐप कितना स्टोरेज उपयोग करता है?\nA: ऐप के लिए लगभग 150MB। लेनदेन की मात्रा के आधार पर स्थानीय डेटाबेस 10-100MB उपयोग कर सकता है।\n\nQ28: क्या ऐप बैटरी को तेज़ी से खत्म करता है?\nA: नहीं! बहुत अनुकूलित। पृष्ठभूमि सिंक न्यूनतम है। प्रति घंटा <5% बैटरी का उपयोग करता है।\n\nQ29: क्या मैं टैबलेट पर ऐप का उपयोग कर सकता हूँ?\nA: हाँ! किसी भी Android डिवाइस (फ़ोन या टैबलेट) पर काम करता है।\n\n👨‍💼 समर्थन और सहायता\n\nQ30: मैं समर्थन से कैसे संपर्क करूँ?\nA:\nईमेल: parthdeshmukh293@gmail.com\nप्रतिक्रिया समय: 24 घंटे\n\nQ31: क्या मैं ऐप का उपयोग खुदरा के अलावा अन्य व्यवसायों के लिए कर सकता हूँ?\nA: बिल्कुल! ग्राहक खाता-बही वाले किसी भी व्यवसाय के लिए काम करता है: रेस्तरां, सेवाएं, व्यापार, आदि।\n\n🎓 सीखना और सुझाव\n\nQ32: मैं ऐप का कुशलता से उपयोग कैसे करूँ?\nA:\n• सही फ़ोन (डुप्लिकेट का पता लगाने के लिए) के साथ ग्राहक जोड़ें\n• लेनदेन तुरंत रिकॉर्ड करें (बाद में नहीं)\n• साप्ताहिक रूप से शेष राशि की समीक्षा करें\n• डेटा हानि से बचने के लिए क्लाउड सिंक सक्षम करें\n• बैकअप के रूप में मासिक रूप से डेटा निर्यात करें\n\nQ33: क्रेडिट और डेबिट में क्या अंतर है?\nA:\n• क्रेडिट = आप ग्राहक को पैसे देते हैं (ग्राहक पर आपका बकाया है)\n• डेबिट = ग्राहक आपको पैसे देता है (आप पर उनका कम बकाया है)\n\nQ34: मुझे कैसे पता चलेगा कि ग्राहक पर मेरा पैसा बकाया है?\nA:\n• ग्राहक स्क्रीन → बकाया राशि की जांच करें\n• ग्राहक के नाम पर टैप करें → यदि शेष राशि सकारात्मक है, तो वे आपके बकाया हैं\n\nQ35: क्या मैं लेनदेन में नोट्स जोड़ सकता हूँ?\nA: हाँ! लेनदेन जोड़ते समय, कारण/विवरण रिकॉर्ड करने के लिए \"नोट्स जोड़ें\" पर टैप करें।\n\nQ36: मुझे कितनी बार अपने डेटा का बैकअप लेना चाहिए?\nA: यदि संभव हो तो साप्ताहिक। सारांश स्क्रीन पर जाएं → बैकअप के लिए \"Excel में निर्यात करें\"।"
  },
  {
    "id": "support",
    "title": "समर्थन और संपर्क",
    "content": "समर्थन और संपर्क\n\nउदाहरण स्वरूप:\n📧 ईमेल: parthdeshmukh293@gmail.com\n⏰ समर्थन घंटे: 11 AM - 8 PM (शनि-रवि)\n\nतकनीकी समस्याओं के लिए:\n• हमें स्क्रीनशॉट के साथ ईमेल करें\n• अपना ऐप संस्करण शामिल करें\n• समस्या को स्पष्ट रूप से बताएं\n\nसदस्यता सहायता के लिए:\n• अपने वितरक से संपर्क करें\n• अपना पंजीकृत ईमेल प्रदान करें\n• सदस्यता योजना का उल्लेख करें"
  }
],
    mr: [
  {
    "id": "intro",
    "title": "परिचय",
    "content": "UdharKhataPlus हे भारतातील लहान दुकानदारांसाठी, व्यापाऱ्यांसाठी आणि स्थानिक व्यवसाय मालकांसाठी डिझाइन केलेले एक डिजिटल अकाउंटिंग ॲप आहे. हे तुम्हाला ग्राहक लेजर राखण्यास, दिलेला आणि घेतलेला पैसा कार्यक्षमतेने ट्रॅक करण्यास मदत करते - ऑनलाइन आणि ऑफलाइन दोन्ही.\n\nमुख्य वैशिष्ट्ये:\n1. अमर्यादित ग्राहक व्यवस्थापित करा (प्रीमियमसह)\n2. क्रेडिट/डेबिट व्यवहार ट्रॅक करा\n3. स्वयंचलित शिल्लक गणना (Automatic balance calculation)\n4. WhatsApp आणि SMS अलर्ट\n5. 100% ऑफलाइन क्षमता\n6. मल्टी-डिव्हाइस क्लाउड सिंक (प्रीमियमसह)\n7. हिंदी आणि मराठी समर्थन\n8. PDF/Excel अहवाल"
  },
  {
    "id": "getting-started",
    "title": "सुरुवात करत आहोत",
    "content": "इंस्टॉलेशन:\n1. APK फाइल डाउनलोड करा.\n2. तुमच्या Android फोनवर स्थापित करा\n3. ॲप उघडा आणि लगेच वापरणे सुरू करा (ऑफलाइन मोडसाठी लॉगिन आवश्यक नाही)\n\nपहिल्यांदा सेटअप:\nपर्याय 1: ऑफलाइन मोड (इंटरनेटची गरज नाही)\n→ ॲप उघडा → ग्राहक जोडणे सुरू करा → झाले!\n\nपर्याय 2: क्लाउड सिंकसह (मल्टी-डिव्हाइस ॲक्सेससाठी)\n→ ॲप उघडा → प्रोफाइल → साइन अप करा → व्यवसायाचे तपशील, ईमेल आणि पासवर्ड प्रविष्ट करा → झाले!\n(क्लाउड सिंक केवळ प्रीमियम सदस्यतेसह सक्षम केले जाईल)"
  },
  {
    "id": "managing-customers",
    "title": "ग्राहक व्यवस्थापन",
    "content": "नवीन ग्राहक जोडा:\n• ग्राहक स्क्रीनवर \"+\" बटणावर टॅप करा\n• ग्राहकाचे तपशील भरा:\n  - नाव (आवश्यक)\n  - फोन नंबर (आवश्यक)\n  - पत्ता (ऐच्छिक)\n• \"ग्राहक जतन करा\" वर टॅप करा\n\nग्राहक संपादित करा:\n• सूचीमधून ग्राहकाच्या नावावर टॅप करा\n• तपशील बदला\n• \"अपडेट करा\" वर टॅप करा\n\nवैशिष्ट्ये:\n1. स्क्रीनवर फक्त सक्रिय शिल्लक असलेले ग्राहक दर्शविले जातात.\n2. \"चॅट\" चिन्हावर टॅप करून ग्राहक स्क्रीनवरून थेट WhatsApp/SMS स्मरणपत्रे पाठवा.\n3. \"फोन\" चिन्हावर टॅप करून ग्राहकाला कॉल करा.\n4. ग्राहक क्रमवारी उपलब्ध: नाव किंवा शिल्लकनुसार क्रमवारी लावा."
  },
  {
    "id": "transactions",
    "title": "व्यवहार रेकॉर्ड करणे",
    "content": "क्रेडिट जोडा (ग्राहकाला दिलेला पैसा):\n• \"+\" किंवा \"व्यवहार जोडा\" वर टॅप करा\n• \"क्रेडिट\" किंवा \"डेबिट\" पर्याय निवडा\n• ग्राहक निवडा\n• रक्कम प्रविष्ट करा\n• तारीख प्रविष्ट करा\n• नोट्स/कारण जोडा (ऐच्छिक)\n• फोटो जोडा (ऐच्छिक)\n• \"जतन करा\" वर टॅप करा\nशिल्लक आपोआप अपडेट होते\n\nउदाहरण:\n1. तुम्ही राजेशला ₹500 दिले → क्रेडिट म्हणून नोंदवा\n2. राजेशने ₹500 परत दिले → डेबिट म्हणून नोंदवा\n\nव्यवहार इतिहास पहा:\n• ग्राहक निवडा\n• सर्व व्यवहार पाहण्यासाठी खाली स्क्रोल करा\n• प्रत्येक व्यवहार दर्शवितो:\n  - तारीख\n  - दिलेला क्रेडिट/मिळालेला पेमेंट रक्कम\n  - व्यवहारानंतरची चालू शिल्लक\n\nव्यवहार संपादित करा:\n• व्यवहारावर टॅप करा\n• तपशील बदला\n• बदल जतन करा वर क्लिक करा\n\nवैशिष्ट्ये:\n1. प्रत्येक व्यवहारानंतर स्वयंचलित शिल्लक गणना.\n2. व्यवहाराच्या पुराव्यासाठी फोटो संलग्नक.\n3. चांगल्या नोंदी ठेवण्यासाठी प्रत्येक व्यवहारासाठी नोट्स.\n4. क्रेडिट/डेबिट प्रकारानुसार व्यवहार फिल्टर करा.\n5. तारीख किंवा रक्कमनुसार व्यवहार क्रमवारी लावा.\n6. व्यवहार इतिहास PDF अहवाल म्हणून डाउनलोड करा."
  },
  {
    "id": "dashboard",
    "title": "डॅशबोर्ड आणि विश्लेषण",
    "content": "सारांश आकडेवारी:\n• एकूण ग्राहक: ग्राहकांची संख्या\n• एकूण थकबाकी: ग्राहकांकडून येणे असलेली एकूण रक्कम\n• एकूण दिलेले क्रेडिट: एकूण बाहेर दिलेला पैसा\n• एकूण पेमेंट: एकूण मिळालेला पैसा\n• क्रेडिट असलेले एकूण ग्राहक\n• पूर्णपणे सेटल झालेले ग्राहक\n\nआर्थिक विहंगावलोकन:\n• क्रेडिट वि डेबिट व्यवहाराचे दृश्य विश्लेषण\n• तुम्ही खूप जास्त देत आहात की चांगले कलेक्शन करत आहात हे ओळखण्यास मदत करते\n\nसर्वाधिक थकबाकी असलेले ग्राहक:\n• सर्वाधिक चालू शिल्लक असलेले शीर्ष 5 ग्राहक दर्शविते\n• पेमेंट रिमाइंडर पाठवण्यासाठी मेसेज चिन्हावर टॅप करा"
  },
  {
    "id": "cloud-sync",
    "title": "क्लाउड सिंक आणि मल्टी-डिव्हाइस",
    "content": "क्लाउड सिंक काय आहे?\nतुमचा डेटा सुरक्षित क्लाउड सर्व्हरवर बॅकअप घ्या जेणेकरून तुम्ही तो अनेक फोन/टॅबलेटवरून ॲक्सेस करू शकाल.\n\nक्लाउड सिंक सक्षम करा:\n• प्रोफाइलवर जा → साइन इन / साइन अप करा\n• ईमेल आणि पासवर्ड प्रविष्ट करा\n✅ सिंक आपोआप सुरू होते (जर प्रीमियम सक्रिय असेल)\n• तुमचा डेटा क्लाउडवर बॅकअप होतो\n\nमल्टी-डिव्हाइस ॲक्सेस:\n• दुसऱ्या फोनवर ॲप स्थापित करा\n• प्रोफाइलवर जा → साइन इन करा\n• तोच ईमेल आणि पासवर्ड प्रविष्ट करा\n✅ तुमचे सर्व ग्राहक आणि व्यवहार दिसतील!\n\nते किती वेळा सिंक होते?\n• जेव्हा तुम्ही ग्राहक किंवा व्यवहार जोडता/संपादित करता तेव्हा आपोआप\n• इंटरनेट उपलब्ध असल्यास दर 30 सेकंदांनी नियतकालिक सिंक\n• मॅन्युअल सिंक बटण\n\nमाझा डेटा सुरक्षित आहे का?\n✅ होय! फक्त तुम्हीच तुमच्या डेटावर ॲक्सेस करू शकता. पासवर्ड एनक्रिप्टेड आहे।"
  },
  {
    "id": "subscriptions",
    "title": "सदस्यता योजना",
    "content": "विनामूल्य योजना (नेहमी विनामूल्य):\n✅ 20 ग्राहकांपर्यंत व्यवस्थापित करा\n✅ सर्व ऑफलाइन वैशिष्ट्ये\n❌ क्लाउड सिंक नाही\n❌ मल्टी-डिव्हाइस ॲक्सेस नाही\nखर्च: ₹0\n\nप्रीमियम योजना:\nएकदा तुम्ही 51वा ग्राहक जोडल्यानंतर, प्रीमियममध्ये अपग्रेड करा:\n\n💎 1️⃣ स्टार्टर — 6 महिने (₹799)\nकालावधी: 6 महिने\nमासिक समतुल्य: ₹133.17\nसवलत: मूळ संदर्भ (0%)\nटॅगलाइन: तुमचा प्रवास सुरू करा — दीर्घकाळ वचनबद्ध होण्यापूर्वी सर्व वैशिष्ट्ये एक्सप्लोर करण्यासाठी योग्य.\n\n🌟 2️⃣ ग्रोथ — 1 वर्ष (₹1,299)\nकालावधी: 12 महिने\nमासिक समतुल्य: ₹108.25\nसवलत: 6 महिन्यांच्या प्लॅनच्या तुलनेत 18.7% सूट\nटॅगलाइन: आमचा सर्वात लोकप्रिय प्लॅन — कालावधी दुप्पट करा, जवळजवळ 20% वाचवा!\n\n⚡ 3️⃣ ट्रस्ट — 18 महिने (₹1,799)\nकालावधी: 18 महिने\nमासिक समतुल्य: ₹99.94\nसवलत: 6 महिन्यांच्या प्लॅनच्या तुलनेत 24.9% सूट\nटॅगलाइन: समर्पित वापरकर्त्यांसाठी — अधिक काळ वापरा, अधिक बचत करा आणि विस्तारित सोयीचा आनंद घ्या.\n\nप्रीमियम वैशिष्ट्ये:\n✅ अमर्यादित ग्राहक (20 ची मर्यादा नाही)\n✅ क्लाउड सिंक (सर्व डिव्हाइस)\n✅ मल्टी-डिव्हाइस ॲक्सेस\n✅ डेटा बॅकअप\n✅ सर्व भविष्यातील वैशिष्ट्ये\n✅ सक्रिय ग्राहक समर्थन\n\nअपग्रेड कसे करावे:\n• तुमचा प्लॅन निवडा\n• पेमेंटसह आमच्याशी संपर्क साधा\n• आम्ही तुमच्यासाठी प्रीमियम सक्षम करू"
  },
  {
    "id": "offline-mode",
    "title": "ऑफलाइन मोड",
    "content": "इंटरनेटशिवाय काम करते:\n✅ ग्राहक जोडा - ऑफलाइन काम करते\n✅ व्यवहार जोडा - ऑफलाइन काम करते\n✅ शिल्लक पहा - ऑफलाइन काम करते\n✅ डेटा निर्यात करा - ऑफलाइन काम करते\n❌ क्लाउड सिंक - इंटरनेट आवश्यक आहे\n\nऑफलाइन डेटाचे काय होते?\n• सर्व डेटा तुमच्या फोनवर स्थानिकरित्या संग्रहित केला जातो\n• तुमच्या डिव्हाइसवर सुरक्षित आणि सुरक्षित\n• जेव्हा इंटरनेट उपलब्ध होते, तेव्हा क्लाउडवर सिंक होते (जर प्रीमियम असेल)\n\nऑफलाइन वापरासाठी टिप्स:\n• नियमितपणे डेटा संग्रहित करा (शक्य असल्यास क्लाउडवर बॅकअप घ्या)\n• बॅकअपशिवाय ॲप हटवू नका\n• फोन स्टोरेजमध्ये ~180MB मोकळी जागा असावी"
  },
  {
    "id": "settings",
    "title": "सेटिंग्ज आणि प्राधान्ये",
    "content": "थीम:\n• लाईट मोड: दिवसासाठी डोळ्यांना अनुकूल\n• डार्क मोड: बॅटरी बचत, रात्रीसाठी अनुकूल\n• स्विच करण्यासाठी प्रोफाइल स्क्रीनवर खालील टॉगलवर टॅप करा\n\nभाषा:\n• ॲप लाँच झाल्यावर पहिले पृष्ठ\n• निवडा: English, हिंदी (Hindi), मराठी (Marathi)\n• भाषा बदलण्यासाठी ॲप रीस्टार्ट करा\n\nखाते:\n• लॉगिन: प्रोफाइल तयार करण्यासाठी आणि क्लाउड सिंक सक्षम करण्यासाठी साइन इन करा\n• लॉगआउट: साइन आउट करा (स्थानिक डेटा सुरक्षित राहतो)\n• पासवर्ड रीसेट करा: OTP सह \"पासवर्ड विसरला\" वापरा\n\nडेटा व्यवस्थापन:\n• Excel मध्ये निर्यात करा: सर्व ग्राहक आणि व्यवहार डाउनलोड करा\n• Excel मधून आयात करा: स्प्रेडशीटमधून मोठ्या प्रमाणात ग्राहक जोडा\n• मासिक PDF अहवाल निर्मिती\n• थकबाकीदार ग्राहकांचा अहवाल"
  },
  {
    "id": "troubleshooting",
    "title": "समस्या निवारण",
    "content": "Q: ॲप उघडताच क्रॅश होते\nA: खालीलपैकी कोणताही उपाय लागू करा:\n• ॲप जबरदस्तीने बंद करा: सेटिंग्ज → ॲप्स → UdharKhataPlus → जबरदस्तीने थांबवा\n• कॅशे साफ करा: सेटिंग्ज → ॲप्स → UdharKhataPlus → कॅशे साफ करा\n• फोन रीस्टार्ट करा\n• ॲप पुन्हा उघडा\n\nQ: सिंक काम करत नाहीये\nA:\n• इंटरनेट कनेक्शन (WiFi किंवा मोबाइल डेटा) तपासा\n• तुम्ही लॉग इन असल्याची खात्री करा: सेटिंग्ज → ईमेल दिसत आहे की नाही तपासा\n• सारांश स्क्रीनवर जा आणि रीफ्रेश करण्यासाठी खाली ओढा\n• ॲप रीस्टार्ट करा\n• प्रीमियम सदस्यता सक्रिय असल्याची खात्री करा\n\nQ: मी लॉगिन करू शकत नाही / \"अवैध क्रेडेन्शियल्स\" मिळत आहेत\nA:\n• ईमेल स्पेलिंग तपासा (केस-सेन्सिटिव्ह)\n• इंटरनेट कनेक्शन तपासा\n• रीसेट करण्यासाठी \"पासवर्ड विसरला\" वापरा\n• ईमेल अवैध असल्यास समर्थनाशी संपर्क साधा\n\nQ: दुसऱ्या फोनवर डेटा दिसत नाहीये\nA:\n• प्रीमियम सदस्यता सक्रिय असल्याची खात्री करा\n• दोन्ही फोनवर त्याच ईमेलने लॉगिन करा\n• रीफ्रेश करण्यासाठी ग्राहक सूचीवर खाली ओढा\n• सिंक पूर्ण होण्यासाठी 1-2 मिनिटे थांबा\n• तरीही काम करत नसल्यास ॲप रीस्टार्ट करा\n\nQ: शिल्लक चुकीची दाखवत आहे\nA:\n• सर्व व्यवहार व्यवस्थित जतन केले आहेत की नाही तपासा\n• सर्व व्यवहार पाहण्यासाठी ग्राहकावर टॅप करा\n• चुकीचे असल्यास, चुकीचा व्यवहार संपादित/हटवा\n• शिल्लक आपोआप पुन्हा गणना करते\n• समस्या कायम राहिल्यास, डेटा निर्यात करा आणि समर्थनाशी संपर्क साधा\n\nQ: मी 20 पेक्षा जास्त सक्रिय ग्राहक जोडू शकत नाही\nA:\n• तुम्ही विनामूल्य टियर मर्यादेपर्यंत पोहोचला आहात\n• प्रीमियम प्लॅनमध्ये अपग्रेड करा\n• अपग्रेडनंतर, तुम्ही अमर्यादित ग्राहक जोडू शकता\n\nQ: माझा फोन हरवल्यास काय होईल?\nA:\n• प्रीमियम असल्यास: नवीन फोनवर ॲप स्थापित करा आणि लॉगिन करा (डेटा क्लाउडमधून पुनर्प्राप्त होतो!)\n• विनामूल्य टियर असल्यास: डेटा हरवला (फक्त जुन्या फोनवर) - नियमितपणे बॅकअप घ्या!"
  },
  {
    "id": "faq",
    "title": "वारंवार विचारले जाणारे प्रश्न (FAQ)",
    "content": "🔐 सुरक्षा आणि गोपनीयता\n\nQ1: माझा डेटा क्लाउडमध्ये सुरक्षित आहे का?\nA: होय! आम्ही मिलिटरी-ग्रेड एन्क्रिप्शन वापरतो. फक्त तुम्हीच तुमच्या पासवर्डने तुमच्या डेटावर ॲक्सेस करू शकता. आम्ही तुमची ग्राहक माहिती पाहू किंवा ॲक्सेस करू शकत नाही.\n\nQ2: मी माझा पासवर्ड विसरल्यास काय होईल?\nA: लॉगिनवर जा → \"पासवर्ड विसरला\" → ईमेल प्रविष्ट करा → आम्ही OTP (वन-टाइम पासवर्ड) पाठवू → पासवर्ड रीसेट करण्यासाठी OTP वापरा → नवीन पासवर्ड तयार करा.\n\nQ3: कोणीतरी माझ्या खात्यावर ॲक्सेस करू शकते का?\nA: नाही. फक्त तुमचा ईमेल + पासवर्ड संयोजनच तुमच्या खात्यावर ॲक्सेस करू शकते. तुमचे क्रेडेन्शियल्स शेअर करू नका!\n\nQ4: बॅकअप प्रणाली आहे का?\nA: होय! प्रीमियमसह, स्वयंचलित दैनिक बॅकअप होतो. विनामूल्य टियर: फक्त तुमच्या फोनवर स्थानिक बॅकअप.\n\n💰 सदस्यता आणि किंमत\n\nQ5: मला ॲपसाठी पैसे द्यावे लागतील का?\nA: नाही! ॲप कायमचे विनामूल्य आहे. विनामूल्य टियर 20 सक्रिय ग्राहकांना परवानगी देतो. जर तुम्हाला अधिकची गरज असेल, तर प्रीमियममध्ये अपग्रेड करा (अमर्यादितसाठी ₹1,299/वर्ष).\n\nQ6: मी नंतर माझा सदस्यता प्लॅन बदलू शकतो का?\nA: होय. अपग्रेड/डाउनग्रेड करण्यासाठी कधीही आमच्याशी संपर्क साधा. बदल त्वरित प्रभावी होतात.\n\nQ7: माझी सदस्यता कालबाह्य झाल्यास काय होईल?\nA: क्लाउड सिंक आपोआप काम करणे थांबवते. स्थानिक डेटा फोनवर सुरक्षित राहतो. सिंक पुन्हा सुरू करण्यासाठी सदस्यता नूतनीकरण करा.\n\nQ8: मला आजीवन सदस्यता मिळू शकते का?\nA: होय! 5 वर्षांचा प्लॅन (₹4,499) = एकदा पैसे द्या, कायमचे वापरा. दीर्घकालीन वापरासाठी सर्वोत्तम.\n\nQ9: तुम्ही कोणते पेमेंट पद्धती स्वीकारता?\nA: रोख (जर व्यक्तिशः भेटत असाल तर), बँक ट्रान्सफर, UPI.\n\n📱 ऑफलाइन विरुद्ध ऑनलाइन\n\nQ10: मी इंटरनेटशिवाय ॲप वापरू शकतो का?\nA: होय! सर्व ऑफलाइन वैशिष्ट्ये काम करतात: ग्राहक जोडा, व्यवहार जोडा, शिल्लक पहा. फक्त क्लाउड सिंकसाठी इंटरनेट आवश्यक आहे.\n\nQ12: फोन बंद झाल्यास माझा डेटा हरवेल का?\nA: नाही! डेटा फोन स्टोरेजवर स्थानिकरित्या जतन केला जातो. रीस्टार्टनंतरही डेटा सुरक्षित राहतो.\n\nQ13: मी किती डिव्हाइसवर सिंक करू शकतो?\nA: प्रीमियमसह: अमर्यादित! तुम्हाला पाहिजे तितक्या फोनवर तोच ईमेल जोडा.\n\nQ14: मी ॲप हटवल्यास, डेटा गायब होईल का?\nA:\n• प्रीमियमसह: डेटा क्लाउडमध्ये राहतो! पुनर्प्राप्त करण्यासाठी ॲप पुन्हा स्थापित करा आणि लॉगिन करा।\n• प्रीमियमशिवाय: डेटा हरवतो (फक्त स्थानिकरित्या संग्रहित). हटवण्यापूर्वी बॅकअप घ्या!\n\n🔄 सिंक आणि मल्टी-डिव्हाइस\n\nQ15: सिंक होण्यासाठी किती वेळ लागतो?\nA: साधारणपणे 1-2 सेकंद. इंटरनेट धीमे असल्यास, 1 मिनिटापर्यंत लागू शकतो.\n\nQ16: मी दोन फोनवर एकच ग्राहक जोडल्यास काय होईल?\nA: ॲप नाव + फोन नंबरने डुप्लिकेट्स ओळखते. आपोआप एका ग्राहकामध्ये विलीन होते.\n\nQ17: जर दोन लोकांनी एकाच वेळी एकाच ग्राहकासाठी व्यवहार जोडले तर काय होईल?\nA: दोन्ही व्यवहार रेकॉर्ड केले जातात. शिल्लक योग्यरित्या अपडेट होते. कोणताही संघर्ष नाही!\n\nQ18: मी Android आणि iPhone दरम्यान सिंक करू शकतो का?\nA: सध्या फक्त Android. iOS आवृत्ती लवकरच येत आहे!\n\n👥 ग्राहक व्यवस्थापन\n\nQ19: मी ग्राहक हटवू शकतो का?\nA: होय, पण त्यांचे सर्व व्यवहार देखील हटतात. त्यांना तसेच ठेवणे चांगले आहे (लॉक केलेल्या ग्राहकांची शिल्लक प्रभावित होणार नाही).\n\nQ20: मी मागील व्यवहार संपादित करू शकतो का?\nA: होय! व्यवहारावर टॅप करा आणि रक्कम/तारीख संपादित करा. शिल्लक आपोआप पुन्हा गणना करते.\n\nQ21: मी किती ग्राहक जोडू शकतो?\nA:\n• विनामूल्य टियर: कमाल 20 सक्रिय ग्राहक\n• प्रीमियम टियर: अमर्यादित (1000+, 10000+, कोणतीही मर्यादा नाही!)\n\nQ22: मी ग्राहक शोधू शकतो का?\nA: होय! वरच्या बाजूला शोध बार वापरा. नाव, फोन नंबर किंवा दुकानाच्या नावाने शोधा.\n\n📊 अहवाल आणि डेटा\n\nQ23: मी माझा डेटा निर्यात करू शकतो का?\nA: होय! सारांश स्क्रीनवर जा → \"Excel मध्ये निर्यात करा\" → सर्व ग्राहक आणि व्यवहार Excel फाइल म्हणून डाउनलोड केले जातात.\n\nQ24: मी Excel मधून ग्राहक आयात करू शकतो का?\nA: होय! सारांश स्क्रीनवर जा → \"आयात करा\" → Excel फाइल निवडा → डुप्लिकेट्सचे पुनरावलोकन करा → आयातची पुष्टी करा.\n\nQ25: मी पावत्या प्रिंट करू शकतो का?\nA: ॲपमध्ये अजून नाही. पण तुम्ही संपूर्ण ग्राहक लेजरचा PDF अहवाल डाउनलोड करू शकता.\n\n⚙️ तांत्रिक\n\nQ26: आवश्यक असलेली किमान Android आवृत्ती कोणती आहे?\nA: Android 6.0 आणि त्यावरील. मागील 5 वर्षांमध्ये बनवलेले बहुतेक फोन याचे समर्थन करतात.\n\nQ27: ॲप किती स्टोरेज वापरते?\nA: ॲपसाठी सुमारे 150MB. व्यवहाराच्या व्हॉल्यूमनुसार स्थानिक डेटाबेस 10-100MB वापरू शकतो.\n\nQ28: ॲप बॅटरी लवकर संपवते का?\nA: नाही! खूप ऑप्टिमाइझ केलेले. पार्श्वभूमी सिंक किमान आहे. प्रति तास <5% बॅटरी वापरते.\n\nQ29: मी टॅबलेटवर ॲप वापरू शकतो का?\nA: होय! कोणत्याही Android डिव्हाइसवर (फोन किंवा टॅबलेट) काम करते.\n\n👨‍💼 समर्थन आणि मदत\n\nQ30: मी समर्थनाशी कसा संपर्क साधू?\nA:\nईमेल: parthdeshmukh293@gmail.com\nप्रतिसाद वेळ: 24 तास\n\nQ31: मी ॲपचा वापर किरकोळ विक्री व्यतिरिक्त इतर व्यवसायांसाठी करू शकतो का?\nA: नक्कीच! ग्राहक लेजर असलेल्या कोणत्याही व्यवसायासाठी काम करते: रेस्टॉरंट्स, सेवा, व्यापार इ.\n\n🎓 शिकणे आणि टिप्स\n\nQ32: मी ॲप कार्यक्षमतेने कसा वापरू?\nA:\n• योग्य फोन (डुप्लिकेट ओळखण्यासाठी) सह ग्राहक जोडा\n• व्यवहार त्वरित नोंदवा (नंतर नाही)\n• साप्ताहिकरित्या शिल्लकचे पुनरावलोकन करा\n• डेटा गमावणे टाळण्यासाठी क्लाउड सिंक सक्षम करा\n• बॅकअप म्हणून मासिकरित्या डेटा निर्यात करा\n\nQ33: क्रेडिट आणि डेबिटमध्ये काय फरक आहे?\nA:\n• क्रेडिट = तुम्ही ग्राहकाला पैसे देता (ग्राहकावर तुमचे येणे आहे)\n• डेबिट = ग्राहक तुम्हाला पैसे देतो (तुमच्यावर त्यांचे येणे कमी होते)\n\nQ34: ग्राहकावर माझे पैसे येणे आहेत की नाही हे मला कसे कळेल?\nA:\n• ग्राहक स्क्रीन → थकबाकी रक्कम तपासा\n• ग्राहकाच्या नावावर टॅप करा → जर शिल्लक सकारात्मक असेल, तर ते तुमचे येणे आहेत\n\nQ35: मी व्यवहारांना नोट्स जोडू शकतो का?\nA: होय! व्यवहार जोडताना, कारण/तपशील रेकॉर्ड करण्यासाठी \"नोट्स जोडा\" वर टॅप करा.\n\nQ36: मी माझ्या डेटाचा बॅकअप किती वेळा घ्यावा?\nA: शक्य असल्यास साप्ताहिक. बॅकअप घेण्यासाठी सारांश स्क्रीनवर जा → \"Excel मध्ये निर्यात करा\"."
  },
  {
    "id": "support",
    "title": "समर्थन आणि संपर्क",
    "content": "समर्थन आणि संपर्क\n\nउदाहरण स्वरूप:\n📧 ईमेल: parthdeshmukh293@gmail.com\n⏰ समर्थन वेळ: 11 AM - 8 PM (शनि-रवि)\n\nतांत्रिक समस्यांसाठी:\n• आम्हाला स्क्रीनशॉटसह ईमेल करा\n• तुमची ॲप आवृत्ती समाविष्ट करा\n• समस्येचे स्पष्टपणे वर्णन करा\n\nसदस्यता मदतीसाठी:\n• तुमच्या वितरकाशी संपर्क साधा\n• तुमचा नोंदणीकृत ईमेल प्रदान करा\n• सदस्यता प्लॅनचा उल्लेख करा"
  }
],
  };

  const currentContent = manualContentByLanguage[langKey] || manualContentByLanguage.en;

  const getSectionIcon = (sectionId) => {
    const iconMap = {
      'intro': 'information-circle',
      'getting-started': 'rocket',
      'managing-customers': 'people',
      'transactions': 'swap-horizontal',
      'dashboard': 'stats-chart',
      'cloud-sync': 'cloud',
      'subscriptions': 'card',
      'offline-mode': 'airplane',
      'settings': 'settings',
      'troubleshooting': 'construct',
      'faq': 'help-circle',
      'support': 'mail',
    };
    return iconMap[sectionId] || 'document-text';
  };

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.background }]} 
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentContent.map((section) => {
          const isExpanded = expandedSections[section.id];

          return (
            <View 
              key={section.id} 
              style={[
                styles.section, 
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border 
                }
              ]}
            >
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons 
                    name={getSectionIcon(section.id)}
                    size={IconSizes.medium} 
                    color={theme.colors.primary} 
                  />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                  {section.title}
                </Text>
                <Ionicons 
                  name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                  size={IconSizes.medium} 
                  color={theme.colors.textSecondary} 
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={[styles.sectionContent, { borderTopColor: theme.colors.borderLight }]}>
                  <Text style={[styles.contentText, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                    {section.content}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  section: {
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: IconSizes.xlarge,
    height: IconSizes.xlarge,
    borderRadius: IconSizes.large / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: FontSizes.large,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  contentText: {
    fontSize: FontSizes.regular,
    lineHeight: FontSizes.regular * 1.6,
    fontWeight: '500',
  },
});