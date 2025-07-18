import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { getFirestore, doc, addDoc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';

// --- i18n Translations ---
const translations = {
  // General
  login: { en: 'Login', kn: 'ಲಾಗಿನ್', hi: 'लॉग इन करें' },
  logout: { en: 'Logout', kn: 'ಲಾಗ್ ಔಟ್', hi: 'लॉग आउट' },
  changePassword: { en: 'Change Password', kn: 'ಪಾಸ್ವರ್ಡ್ ಬದಲಾಯಿಸಿ', hi: 'पासवर्ड बदलें' },
  language: { en: 'Language', kn: 'ಭಾಷೆ', hi: 'भाषा' },
  // Login Page
  emailAddress: { en: 'Email address', kn: 'ಇಮೇಲ್ ವಿಳಾಸ', hi: 'ईमेल पता' },
  enterYourEmail: { en: 'Enter your email', kn: 'ನಿಮ್ಮ ಇಮೇಲ್ ನಮೂದಿಸಿ', hi: 'अपना ईमेल दर्ज करें' },
  password: { en: 'Password', kn: 'ಪಾಸ್ವರ್ಡ್', hi: 'पासवर्ड' },
  enterYourPassword: { en: 'Enter your password', kn: 'ನಿಮ್ಮ ಪಾಸ್ವರ್ಡ್ ನಮೂದಿಸಿ', hi: 'अपना पासवर्ड दर्ज करें' },
  signIn: { en: 'Sign in', kn: 'ಸೈನ್ ಇನ್ ಮಾಡಿ', hi: 'साइन इन करें' },
  // Home Page - Header
  pageTitle: { en: 'MYSURU DASARA PASSES DISTRIBUTION 2025', kn: 'ಮೈಸೂರು ದಸರಾ ಪಾಸ್ ವಿತರಣೆ ೨೦೨೫', hi: 'मैसूरु दशहरा पास वितरण २०२५' },
  // Home Page - Input Section
  inputSection: { en: 'Input Section', kn: 'ಇನ್ಪುಟ್ ವಿಭಾಗ', hi: 'इनपुट अनुभाग' },
  nameLabel: { en: 'Name ::', kn: 'ಹೆಸರು ::', hi: 'नाम ::' },
  officeLabel: { en: 'Office ::', kn: 'ಕಚೇರಿ ::', hi: 'कार्यालय ::' },
  mobileLabel: { en: 'Mobile ::', kn: 'ಮೊಬೈಲ್ ::', hi: 'मोबाइल ::' },
  categoryLabel: { en: 'Category ::', kn: 'ವರ್ಗ ::', hi: 'श्रेणी ::' },
  palace: { en: 'Palace', kn: 'ಅರಮನೆ', hi: 'महल' },
  torchlight: { en: 'Torchlight', kn: 'ಪಂಜಿನ ಕವಾಯತು', hi: 'टॉर्चलाइट' },
  chooseGate: { en: 'Choose Gate...', kn: 'ಗೇಟ್ ಆಯ್ಕೆಮಾಡಿ...', hi: 'गेट चुनें...' },
  passesPlaceholder: { en: 'Passes', kn: 'ಪಾಸ್ಗಳು', hi: 'पास' },
  messengerDetails: { en: 'Messenger Details', kn: 'ಮೆಸೆಂಜರ್ ವಿವರಗಳು', hi: 'मैसेंजर विवरण' },
  designationLabel: { en: 'Designation ::', kn: 'ಹುದ್ದೆ ::', hi: 'पदनाम ::' },
  saveEntry: { en: 'Save Entry', kn: 'ನಮೂದನ್ನು ಉಳಿಸಿ', hi: 'प्रविष्टि सहेजें' },
  updateEntry: { en: 'Update Entry', kn: 'ನಮೂದನ್ನು ನವೀಕರಿಸಿ', hi: 'प्रविष्टि अद्यतन करें' },
  cancelEdit: { en: 'Cancel Edit', kn: 'ಸಂಪಾದನೆಯನ್ನು ರದ್ದುಮಾಡಿ', hi: 'संपादन रद्द करें' },
  processing: { en: 'Processing...', kn: 'ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗುತ್ತಿದೆ...', hi: 'प्रसंस्करण हो रहा है...' },
  // Home Page - Records Table
  recordsTable: { en: 'Records Table', kn: 'ದಾಖಲೆಗಳ ಟೇಬಲ್', hi: 'रिकॉर्ड्स तालिका' },
  recordsTable_Name: { en: 'Name', kn: 'ಹೆಸರು', hi: 'नाम' },
  recordsTable_Palace: { en: 'Palace', kn: 'ಅರಮನೆ', hi: 'महल' },
  recordsTable_Torchlight: { en: 'Torchlight', kn: 'ಪಂಜಿನ ಕವಾಯತು', hi: 'टॉर्चलाइट' },
  recordsTable_Total: { en: 'Total', kn: 'ಒಟ್ಟು', hi: 'कुल' },
  recordsTable_Actions: { en: 'Actions', kn: 'ಕ್ರಿಯೆಗಳು', hi: 'कार्रवाइयां' },
  edit: { en: 'Edit', kn: 'ಸಂಪಾದಿಸಿ', hi: 'संपादित करें' },
  delete: { en: 'Delete', kn: 'ಅಳಿಸಿ', hi: 'हटाएं' },
  noRecordsFound: { en: 'No records found.', kn: 'ಯಾವುದೇ ದಾಖಲೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ.', hi: 'कोई रिकॉर्ड नहीं मिला।' },
  loadingRecords: { en: 'Loading records...', kn: 'ದಾಖಲೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...', hi: 'रिकॉर्ड लोड हो रहे हैं...' },
  export: { en: 'Export', kn: 'ರಫ್ತು ಮಾಡಿ', hi: 'निर्यात' },
  exportAsPDF: { en: 'Export as PDF', kn: 'PDF ಆಗಿ ರಫ್ತು ಮಾಡಿ', hi: 'पीडीएफ के रूप में निर्यात करें' },
  exportAsExcel: { en: 'Export as Excel', kn: 'Excel ಆಗಿ ರಫ್ತು ಮಾಡಿ', hi: 'एक्सेल के रूप में निर्यात करें' },
  exportAsDOC: { en: 'Export as DOC', kn: 'DOC ಆಗಿ ರಫ್ತು ಮಾಡಿ', hi: 'डीओसी के रूप में निर्यात करें' },
  // Home Page - Summary Tables
  palaceSummary: { en: 'Palace Summary', kn: 'ಅರಮನೆ ಸಾರಾಂಶ', hi: 'महल सारांश' },
  torchlightSummary: { en: 'Torchlight Summary', kn: 'ಪಂಜಿನ ಕವಾಯತು ಸಾರಾಂಶ', hi: 'टॉर्चलाइट सारांश' },
  totalPasses: { en: 'Total Passes', kn: 'ಒಟ್ಟು ಪಾಸ್ಗಳು', hi: 'कुल पास' },
  distributed: { en: 'Distributed', kn: 'ವಿತರಿಸಲಾಗಿದೆ', hi: 'वितरित' },
  balance: { en: 'Balance', kn: 'ಬಾಕಿ', hi: 'शेष' },
  total: { en: 'Total', kn: 'ಒಟ್ಟು', hi: 'कुल' },
  // Modals
  editTotalForGate: { en: 'Edit Total for Gate', kn: 'ಗೇಟ್\u200cಗಾಗಿ ಒಟ್ಟು ಸಂಪಾದಿಸಿ', hi: 'गेट के लिए कुल संपादित करें' },
  save: { en: 'Save', kn: 'ಉಳಿಸಿ', hi: 'सहेजें' },
  cancel: { en: 'Cancel', kn: 'ರದ್ದುಮಾಡಿ', hi: 'रद्द करें' },
  confirmDeletion: { en: 'Confirm Deletion', kn: 'ಅಳಿಸುವಿಕೆಯನ್ನು ಖಚಿತಪಡಿಸಿ', hi: 'हटाने की पुष्टि करें' },
  confirmDeletionMessage: { en: 'Are you sure you want to delete this entry? This cannot be undone.', kn: 'ಈ ನಮೂದನ್ನು ಅಳಿಸಲು ನೀವು ಖಚಿತವಾಗಿ ಬಯಸುವಿರಾ? ಇದನ್ನು ಹಿಂಪಡೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ.', hi: 'क्या आप वाकई इस प्रविष्टि को हटाना चाहते हैं? यह पूर्ववत नहीं किया जा सकता।' },
  newPassword: { en: 'New Password', kn: 'ಹೊಸ ಪಾಸ್ವರ್ಡ್', hi: 'नया पासवर्ड' },
  confirmNewPassword: { en: 'Confirm New Password', kn: 'ಹೊಸ ಪಾಸ್ವರ್ಡ್ ಅನ್ನು ಖಚಿತಪಡಿಸಿ', hi: 'नए पासवर्ड की पुष्टि करें' },
  change: { en: 'Change', kn: 'ಬದಲಾಯಿಸಿ', hi: 'बदलें' },
  // Messages
  mobileDigitsError: { en: 'Mobile must be 10 digits.', kn: 'ಮೊಬೈಲ್ 10 ಅಂಕೆಗಳನ್ನು ಹೊಂದಿರಬೇಕು.', hi: 'मोबाइल 10 अंकों का होना चाहिए।' },
  nameAndCategoryError: { en: 'Recipient Name and a Pass Category are required.', kn: 'ಸ್ವೀಕರಿಸುವವರ ಹೆಸರು ಮತ್ತು ಪಾಸ್ ವರ್ಗದ ಅಗತ್ಯವಿದೆ.', hi: 'प्राप्तकर्ता का नाम और पास श्रेणी आवश्यक है।' },
  gateAndCountError: { en: 'A gate and a valid pass count are required.', kn: 'ಗೇಟ್ ಮತ್ತು ಮಾನ್ಯವಾದ ಪಾಸ್ ಎಣಿಕೆ ಅಗತ್ಯವಿದೆ.', hi: 'एक गेट और एक वैध पास गणना आवश्यक है।' },
  notEnoughPassesError: { en: 'Not enough passes for', kn: 'ಗೆ ಸಾಕಷ್ಟು ಪಾಸ್\u200cಗಳಿಲ್ಲ', hi: 'के लिए पर्याप्त पास नहीं हैं' },
  entryUpdatedSuccess: { en: 'Entry updated successfully!', kn: 'ನಮೂದನ್ನು ಯಶಸ್ವಿಯಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ!', hi: 'प्रविष्टि सफलतापूर्वक अद्यतन की गई!' },
  entrySavedSuccess: { en: 'Entry saved successfully!', kn: 'ನಮೂದನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ!', hi: 'प्रविष्टि सफलतापूर्वक सहेजी गई!' },
  entryDeletedSuccess: { en: 'Entry deleted successfully!', kn: 'ನಮೂದನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಅಳಿಸಲಾಗಿದೆ!', hi: 'प्रविष्टि सफलतापूर्वक हटा दी गई!' },
  totalPassesUpdatedSuccess: { en: 'Total passes updated successfully!', kn: 'ಒಟ್ಟು ಪಾಸ್\u200cಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ!', hi: 'कुल पास सफलतापूर्वक अद्यतन किए गए!' },
  validNumberError: { en: 'Please enter a valid non-negative number.', kn: 'ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಋಣಾತ್ಮಕವಲ್ಲದ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.', hi: 'कृपया एक वैध गैर-नकारात्मक संख्या दर्ज करें।' },
  cannotSetTotalError: { en: 'Cannot set total to', kn: 'ಒಟ್ಟು ಮೊತ್ತವನ್ನು ಹೊಂದಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ', hi: 'कुल सेट नहीं किया जा सकता' },
  alreadyDistributed: { en: 'Already distributed', kn: 'ಈಗಾಗಲೇ ವಿತರಿಸಲಾಗಿದೆ', hi: 'पहले से ही वितरित' },
  passwordsDoNotMatch: { en: 'Passwords do not match.', kn: 'ಪಾಸ್ವರ್ಡ್\u200cಗಳು ಹೊಂದಿಕೆಯಾಗುವುದಿಲ್ಲ.', hi: 'पासवर्ड मेल नहीं खाते।' },
  passwordLengthError: { en: 'Password should be at least 6 characters.', kn: 'ಪಾಸ್ವರ್ಡ್ ಕನಿಷ್ಠ 6 ಅಕ್ಷರಗಳನ್ನು ಹೊಂದಿರಬೇಕು.', hi: 'पासवर्ड कम से कम 6 वर्णों का होना चाहिए।' },
  passwordChangedSuccess: { en: 'Password changed successfully!', kn: 'ಪಾಸ್ವರ್ಡ್ ಯಶಸ್ವಿಯಾಗಿ ಬದಲಾಯಿಸಲಾಗಿದೆ!', hi: 'पासवर्ड सफलतापूर्वक बदल दिया गया!' },
  editingEntryMessage: { en: "Editing entry. Make changes and click 'Update Entry'.", kn: "ನಮೂದನ್ನು ಸಂಪಾದಿಸಲಾಗುತ್ತಿದೆ. ಬದಲಾವಣೆಗಳನ್ನು ಮಾಡಿ ಮತ್ತು 'ನಮೂದನ್ನು ನವೀಕರಿಸಿ' ಕ್ಲಿಕ್ ಮಾಡಿ.", hi: "प्रविष्टि संपादित हो रही है। परिवर्तन करें और 'प्रविष्टि अद्यतन करें' पर क्लिक करें।" }
};

// --- Constants ---
const GATES = Array.from({ length: 15 }, (_, i) => String.fromCharCode(65 + i)); // Creates ['A', 'B', ..., 'O']

// --- Helper Components ---

const SingleSelectDropdown = ({ options, selectedOption, onChange, label, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const handleToggle = () => !disabled && setIsOpen(prev => !prev);
    const handleSelect = (option) => { onChange(option); setIsOpen(false); };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const displayValue = selectedOption || label;

    return (
        <div className="relative" ref={dropdownRef}>
            <button type="button" onClick={handleToggle} disabled={disabled} className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-gray-50 text-left disabled:bg-gray-200 disabled:cursor-not-allowed flex justify-between items-center h-10 text-sm">
                <span className="truncate">{displayValue}</span>
                <svg className={`w-5 h-5 ml-2 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 flex flex-col">
                        {options.map(option => <button key={option} type="button" onClick={() => handleSelect(option)} className={`w-full text-left p-2 rounded-md hover:bg-blue-500 hover:text-white ${selectedOption === option ? 'bg-blue-500 text-white' : 'text-gray-700'}`}>{option}</button>)}
                    </div>
                </div>
            )}
        </div>
    );
};

const SummaryTable = ({ title, type, gates, totals, distributed, balance, onEdit, t }) => {
    const tableHeaderStyle = "px-1 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider";
    const tableCellStyle = "px-1 py-1 whitespace-nowrap text-xs text-gray-800";
    
    const sumArray = (arr) => arr.reduce((acc, val) => acc + val, 0);
    const totalSum = sumArray(totals);
    const distributedSum = sumArray(distributed);
    const balanceSum = sumArray(balance);

    return (
        <div className="mb-2">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-center border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className={`${tableHeaderStyle} w-8`}>Sl.</th><th className={`${tableHeaderStyle} w-24 text-left`}>{title}</th>
                            {gates.map((gate) => <th key={gate} className={tableHeaderStyle}>{gate}</th>)}
                            <th className={`${tableHeaderStyle} font-bold`}>{t('total')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        <tr>
                            <td className={tableCellStyle}>1</td><td className={`${tableCellStyle} text-left font-medium`}>{t('totalPasses')}</td>
                            {totals.map((val, i) => <td key={i} className={tableCellStyle}>{val}<button onClick={() => onEdit(type, i)} className="ml-1 text-blue-500 hover:text-blue-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button></td>)}
                            <td className={`${tableCellStyle} font-bold bg-gray-50`}>{totalSum}</td>
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>2</td><td className={`${tableCellStyle} text-left font-medium`}>{t('distributed')}</td>
                            {distributed.map((val, i) => <td key={i} className={tableCellStyle}>{val}</td>)}
                            <td className={`${tableCellStyle} font-bold bg-gray-50`}>{distributedSum}</td>
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>3</td><td className={`${tableCellStyle} text-left font-medium`}>{t('balance')}</td>
                            {balance.map((val, i) => <td key={i} className={`${tableCellStyle} ${val < 0 ? 'text-red-500 font-bold' : ''}`}>{val}</td>)}
                            <td className={`${tableCellStyle} font-bold bg-gray-50 ${balanceSum < 0 ? 'text-red-500' : ''}`}>{balanceSum}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// --- Page Components ---

const LoginPage = ({ onLogin, error, t }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(email, password);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-900">{t('login')}</h2>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="text-sm font-medium text-gray-700">{t('emailAddress')}</label>
                        <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('enterYourEmail')} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="password">{t('password')}</label>
                        <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('enterYourPassword')} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div>
                        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            {t('signIn')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const HomePage = ({ onLogout, onChangePassword, t, setLanguage, language }) => {
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [recipientName, setRecipientName] = useState('');
    const [officeName, setOfficeName] = useState('');
    const [recipientMobile, setRecipientMobile] = useState('');
    const [passCategory, setPassCategory] = useState('');
    const [gateSelected, setGateSelected] = useState('');
    const [passCount, setPassCount] = useState('');
    const [messengerName, setMessengerName] = useState('');
    const [messengerDesignation, setMessengerDesignation] = useState('');
    const [messengerMobile, setMessengerMobile] = useState('');
    const [passEntries, setPassEntries] = useState([]);
    const [palaceTotalPasses, setPalaceTotalPasses] = useState(Array(15).fill(0));
    const [torchlightTotalPasses, setTorchlightTotalPasses] = useState(Array(15).fill(0));
    const [editingEntryId, setEditingEntryId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [showMessage, setShowMessage] = useState(false);
    const [showEditTotalModal, setShowEditTotalModal] = useState(false);
    const [editTotalType, setEditTotalType] = useState('');
    const [editTotalGateIndex, setEditTotalGateIndex] = useState(0);
    const [editTotalValue, setEditTotalValue] = useState('');
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [entryToDeleteId, setEntryToDeleteId] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showExportOptions, setShowExportOptions] = useState(false);
    const settingsRef = useRef(null);
    const editTotalInputRef = useRef(null);
    const exportRef = useRef(null);

    const firebaseConfig = {
      apiKey: "AIzaSyBeiQ8dG_4YUkg-3G2LQTWcJ1q5xUptNww",
      authDomain: "dasara-pass-data.firebaseapp.com",
      projectId: "dasara-pass-data",
      storageBucket: "dasara-pass-data.appspot.com",
      messagingSenderId: "1055205777690",
      appId: "1:1055205777690:web:82e0c017de7bd19ccb8ca3",
      measurementId: "G-3XK1S6GG0M"
    };
    const appId = firebaseConfig.projectId;

    const showTemporaryMessage = (msgKey, duration = 4000) => {
        setMessage(t(msgKey));
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
            setMessage('');
        }, duration);
    };
    
    useEffect(() => {
        const loadScript = (id, src) => {
            return new Promise((resolve, reject) => {
                if (document.getElementById(id)) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.id = id;
                script.src = src;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Script load error for ${src}`));
                document.body.appendChild(script);
            });
        };

        const loadExportScripts = async () => {
            try {
                await loadScript('xlsx', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
                await loadScript('jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                await loadScript('jspdf-autotable', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js');
            } catch (error) {
                console.error(error);
            }
        };

        loadExportScripts();
    }, []);

    useEffect(() => {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const dbInstance = getFirestore(app);
        setDb(dbInstance);
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                setIsAuthReady(true);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        setIsLoading(true);
        const entriesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/passEntries`);
        const unsubscribeEntries = onSnapshot(entriesCollectionRef, (snapshot) => {
            setPassEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const totalsDocRef = doc(db, `artifacts/${appId}/users/${userId}/passTotals/summary`);
        const unsubscribeTotals = onSnapshot(totalsDocRef, async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                setPalaceTotalPasses(Array.isArray(data.palaceTotals) ? [...data.palaceTotals, ...Array(15).fill(0)].slice(0, 15) : Array(15).fill(0));
                setTorchlightTotalPasses(Array.isArray(data.torchlightTotals) ? [...data.torchlightTotals, ...Array(15).fill(0)].slice(0, 15) : Array(15).fill(0));
            } else {
                const initialTotals = { palaceTotals: Array(15).fill(0), torchlightTotals: Array(15).fill(0) };
                await setDoc(totalsDocRef, initialTotals);
                setPalaceTotalPasses(initialTotals.palaceTotals);
                setTorchlightTotalPasses(initialTotals.torchlightTotals);
            }
            setIsLoading(false);
        });
        return () => { unsubscribeEntries(); unsubscribeTotals(); };
    }, [isAuthReady, db, userId, appId]);

    useEffect(() => {
        if (showEditTotalModal && editTotalInputRef.current) {
            editTotalInputRef.current.select();
        }
    }, [showEditTotalModal]);

    const distributedPalace = Array(15).fill(0);
    const distributedTorchlight = Array(15).fill(0);
    passEntries.forEach(entry => {
        (entry.palaceGates || []).forEach((gateNum, index) => {
            const pCount = parseInt((entry.palacePassesPerGate || [])[index]) || 0;
            if (gateNum >= 1 && gateNum <= 15) distributedPalace[gateNum - 1] += pCount;
        });
        (entry.torchlightGates || []).forEach((gateNum, index) => {
            const tCount = parseInt((entry.torchlightPassesPerGate || [])[index]) || 0;
            if (gateNum >= 1 && gateNum <= 15) distributedTorchlight[gateNum - 1] += tCount;
        });
    });
    const balancePalace = palaceTotalPasses.map((total, i) => total - distributedPalace[i]);
    const balanceTorchlight = torchlightTotalPasses.map((total, i) => total - distributedTorchlight[i]);

    const clearForm = () => {
        setRecipientName(''); setOfficeName(''); setRecipientMobile('');
        setPassCategory(''); setGateSelected(''); setPassCount('');
        setMessengerName(''); setMessengerDesignation(''); setMessengerMobile('');
        setEditingEntryId(null);
    };

    const handleSave = async () => {
        if (!db || !userId) return;
        if (recipientMobile && recipientMobile.length !== 10) return showTemporaryMessage("mobileDigitsError");
        if (messengerMobile && messengerMobile.length !== 10) return showTemporaryMessage("mobileDigitsError");
        
        const count = parseInt(passCount);
        if (!recipientName || !passCategory) return showTemporaryMessage("nameAndCategoryError");
        if (!gateSelected || !passCount || isNaN(count) || count <= 0) return showTemporaryMessage("gateAndCountError");
        
        const gateNumeric = GATES.indexOf(gateSelected) + 1;
        const gatesNumeric = [gateNumeric]; const counts = [count];
        const tempDistributed = { palace: [...distributedPalace], torchlight: [...distributedTorchlight] };
        if (editingEntryId) {
            const oldEntry = passEntries.find(e => e.id === editingEntryId);
            if (oldEntry) {
                (oldEntry.palaceGates || []).forEach((gate, i) => { tempDistributed.palace[gate - 1] -= (oldEntry.palacePassesPerGate || [])[i] || 0; });
                (oldEntry.torchlightGates || []).forEach((gate, i) => { tempDistributed.torchlight[gate - 1] -= (oldEntry.torchlightPassesPerGate || [])[i] || 0; });
            }
        }
        if (passCategory === 'palace') {
            if (tempDistributed.palace[gateNumeric - 1] + count > palaceTotalPasses[gateNumeric - 1]) return setMessage(`${t('notEnoughPassesError')} Palace Gate ${gateSelected}.`);
        } else if (passCategory === 'torchlight') {
            if (tempDistributed.torchlight[gateNumeric - 1] + count > torchlightTotalPasses[gateNumeric - 1]) return setMessage(`${t('notEnoughPassesError')} Torchlight Gate ${gateSelected}.`);
        }
        const entryData = {
            recipientName, officeName, recipientMobile, messengerName, messengerDesignation, messengerMobile,
            passCategory,
            palaceGates: passCategory === 'palace' ? gatesNumeric : [], palacePassesPerGate: passCategory === 'palace' ? counts : [],
            torchlightGates: passCategory === 'torchlight' ? gatesNumeric : [], torchlightPassesPerGate: passCategory === 'torchlight' ? counts : [],
            totalPassesRequested: count, timestamp: new Date().toISOString(),
        };
        setIsLoading(true);
        try {
            const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/passEntries`);
            if (editingEntryId) {
                await setDoc(doc(collectionRef, editingEntryId), entryData);
                showTemporaryMessage("entryUpdatedSuccess");
            } else {
                await addDoc(collectionRef, entryData);
                showTemporaryMessage("entrySavedSuccess");
            }
            clearForm();
        } catch (error) {
             setMessage(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditRecord = (entry) => {
        setEditingEntryId(entry.id);
        setRecipientName(entry.recipientName || ''); setOfficeName(entry.officeName || ''); setRecipientMobile(entry.recipientMobile || '');
        setPassCategory(entry.passCategory || '');
        if(entry.passCategory === 'palace') {
            setGateSelected((entry.palaceGates && entry.palaceGates[0]) ? GATES[entry.palaceGates[0] - 1] : '');
            setPassCount((entry.palacePassesPerGate && entry.palacePassesPerGate[0]) ? entry.palacePassesPerGate[0].toString() : '');
        } else if (entry.passCategory === 'torchlight') {
            setGateSelected((entry.torchlightGates && entry.torchlightGates[0]) ? GATES[entry.torchlightGates[0] - 1] : '');
            setPassCount((entry.torchlightPassesPerGate && entry.torchlightPassesPerGate[0]) ? entry.torchlightPassesPerGate[0].toString() : '');
        }
        setMessengerName(entry.messengerName || ''); setMessengerDesignation(entry.messengerDesignation || ''); setMessengerMobile(entry.messengerMobile || '');
        window.scrollTo(0, 0);
        showTemporaryMessage("editingEntryMessage");
    };

    const handleDeleteClick = (id) => { setEntryToDeleteId(id); setShowConfirmDeleteModal(true); };
    const confirmDelete = async () => {
        if (!db || !userId || !entryToDeleteId) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/passEntries`, entryToDeleteId));
            showTemporaryMessage("entryDeletedSuccess");
        } catch (error) {
             setMessage(`Error: ${error.message}`);
        } finally {
            setIsLoading(false); setShowConfirmDeleteModal(false); setEntryToDeleteId(null);
        }
    };

    const handleEditTotalPasses = (type, gateIndex) => {
        setEditTotalType(type); setEditTotalGateIndex(gateIndex);
        const currentValue = type === 'palace' ? palaceTotalPasses[gateIndex] : torchlightTotalPasses[gateIndex];
        setEditTotalValue(currentValue.toString());
        setShowEditTotalModal(true);
    };

    const handleSaveTotalPasses = async () => {
        if (!db || !userId) return;
        const value = parseInt(editTotalValue);
        if (isNaN(value) || value < 0) return showTemporaryMessage("validNumberError");
        const distributedCount = editTotalType === 'palace' ? distributedPalace[editTotalGateIndex] : distributedTorchlight[editTotalGateIndex];
        if (value < distributedCount) return setMessage(`${t('cannotSetTotalError')} ${value}. ${t('alreadyDistributed')} ${distributedCount}.`);
        setIsLoading(true);
        const totalsDocRef = doc(db, `artifacts/${appId}/users/${userId}/passTotals/summary`);
        const newTotals = { palaceTotals: [...palaceTotalPasses], torchlightTotals: [...torchlightTotalPasses] };
        if (editTotalType === 'palace') newTotals.palaceTotals[editTotalGateIndex] = value;
        else newTotals.torchlightTotals[editTotalGateIndex] = value;
        try {
            await setDoc(totalsDocRef, newTotals, { merge: true });
            showTemporaryMessage("totalPassesUpdatedSuccess");
        } catch (error) {
             setMessage(`Error: ${error.message}`);
        } finally {
            setIsLoading(false); setShowEditTotalModal(false);
        }
    };
    
    const handleCategoryChange = (e) => {
        const newCategory = e.target.value;
        setPassCategory(newCategory); setGateSelected(''); setPassCount('');
    };

    const handleChangePasswordSubmit = (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showTemporaryMessage("passwordsDoNotMatch");
            return;
        }
        if (newPassword.length < 6) {
            showTemporaryMessage("passwordLengthError");
            return;
        }
        onChangePassword(newPassword, () => {
            setNewPassword('');
            setConfirmPassword('');
            setShowChangePasswordModal(false);
            showTemporaryMessage("passwordChangedSuccess");
        });
    };

    const handleMobileChange = (e, setter) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 10) {
            setter(value);
        }
    };

    const handleModalKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveTotalPasses();
        }
    };

    const handleExport = (format) => {
        const date = new Date().toLocaleString();
        const sumArray = (arr) => arr.reduce((acc, val) => acc + val, 0);

        if (format === 'excel') {
            if (typeof window.XLSX === 'undefined') return showTemporaryMessage("Excel library is loading, please try again shortly.");
            
            const wb = window.XLSX.utils.book_new();

            const recordsToExport = passEntries.map((entry, index) => ({
                '#': index + 1,
                'Recipient Name': entry.recipientName || '',
                'Office': entry.officeName || '',
                'Recipient Mobile': entry.recipientMobile || '',
                'Pass Category': entry.passCategory || '',
                'Gate': entry.passCategory === 'palace' ? GATES[(entry.palaceGates || [])[0] - 1] : GATES[(entry.torchlightGates || [])[0] - 1],
                'Passes': entry.totalPassesRequested || 0,
                'Messenger Name': entry.messengerName || '',
                'Timestamp': entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''
            }));
            const ws_records = window.XLSX.utils.json_to_sheet(recordsToExport);
            window.XLSX.utils.book_append_sheet(wb, ws_records, "Pass Records");

            const palaceSummaryData = [
                { Category: 'Total Passes', ...Object.fromEntries(GATES.map((g, i) => [g, palaceTotalPasses[i]])), Total: sumArray(palaceTotalPasses) },
                { Category: 'Distributed', ...Object.fromEntries(GATES.map((g, i) => [g, distributedPalace[i]])), Total: sumArray(distributedPalace) },
                { Category: 'Balance', ...Object.fromEntries(GATES.map((g, i) => [g, balancePalace[i]])), Total: sumArray(balancePalace) }
            ];
            const ws_palace = window.XLSX.utils.json_to_sheet(palaceSummaryData);
            window.XLSX.utils.book_append_sheet(wb, ws_palace, "Palace Summary");

            const torchlightSummaryData = [
                { Category: 'Total Passes', ...Object.fromEntries(GATES.map((g, i) => [g, torchlightTotalPasses[i]])), Total: sumArray(torchlightTotalPasses) },
                { Category: 'Distributed', ...Object.fromEntries(GATES.map((g, i) => [g, distributedTorchlight[i]])), Total: sumArray(distributedTorchlight) },
                { Category: 'Balance', ...Object.fromEntries(GATES.map((g, i) => [g, balanceTorchlight[i]])), Total: sumArray(balanceTorchlight) }
            ];
            const ws_torchlight = window.XLSX.utils.json_to_sheet(torchlightSummaryData);
            window.XLSX.utils.book_append_sheet(wb, ws_torchlight, "Torchlight Summary");

            window.XLSX.writeFile(wb, `Dasara_Pass_Report_${date}.xlsx`);

        } else if (format === 'pdf') {
            if (typeof window.jspdf === 'undefined') return showTemporaryMessage("PDF library is loading, please try again shortly.");
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape');
            
            doc.setFontSize(18);
            doc.text("Mysuru Dasara Pass Distribution Report", 148, 15, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Generated on: ${date}`, 148, 22, { align: 'center' });

            doc.setFontSize(14);
            doc.text("Palace Pass Summary", 14, 35);
            doc.autoTable({
                startY: 40,
                head: [['Category', ...GATES, 'Total']],
                body: [
                    ['Total Passes', ...palaceTotalPasses, sumArray(palaceTotalPasses)],
                    ['Distributed', ...distributedPalace, sumArray(distributedPalace)],
                    ['Balance', ...balancePalace, sumArray(balancePalace)]
                ],
                theme: 'grid',
                headStyles: { fillColor: [22, 160, 133] }
            });

            let finalY = doc.lastAutoTable.finalY || 40;
            doc.text("Torchlight Pass Summary", 14, finalY + 15);
            doc.autoTable({
                startY: finalY + 20,
                head: [['Category', ...GATES, 'Total']],
                body: [
                    ['Total Passes', ...torchlightTotalPasses, sumArray(torchlightTotalPasses)],
                    ['Distributed', ...distributedTorchlight, sumArray(distributedTorchlight)],
                    ['Balance', ...balanceTorchlight, sumArray(balanceTorchlight)]
                ],
                theme: 'grid',
                headStyles: { fillColor: [211, 84, 0] }
            });
            
            doc.addPage('portrait');
            doc.setFontSize(14);
            doc.text("Individual Pass Distribution Records", 14, 15);
            
            const recordsBody = passEntries.map((entry, index) => [
                index + 1,
                entry.recipientName || '',
                entry.officeName || '',
                entry.recipientMobile || '',
                entry.passCategory || '',
                entry.passCategory === 'palace' ? GATES[(entry.palaceGates || [])[0] - 1] : GATES[(entry.torchlightGates || [])[0] - 1],
                entry.totalPassesRequested || 0,
                entry.messengerName || '',
                new Date(entry.timestamp).toLocaleString()
            ]);

            doc.autoTable({
                startY: 25,
                head: [['#', 'Recipient', 'Office', 'Mobile', 'Category', 'Gate', 'Passes', 'Messenger', 'Timestamp']],
                body: recordsBody,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] }
            });


            doc.save(`Dasara_Pass_Report_${date}.pdf`);

        } else if (format === 'doc') {
            let content = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head><meta charset='utf-8'><title>Dasara Pass Report</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                    th, td { border: 1px solid #dddddd; text-align: left; padding: 8px; }
                    th { background-color: #f2f2f2; }
                    h1, h2, h3 { color: #333; }
                </style>
                </head>
                <body>
                    <div style="text-align:center;">
                        <h1>Mysuru Dasara Pass Distribution Report</h1>
                        <p>Generated on: ${date}</p>
                    </div>
            `;

            const buildSummaryTable = (title, totals, distributed, balance) => {
                let table = `<h2>${title}</h2><table><thead><tr><th>Category</th>`;
                GATES.forEach(g => table += `<th>${g}</th>`);
                table += `<th>Total</th></tr></thead><tbody>`;
                
                table += `<tr><td>Total Passes</td>${totals.map(t => `<td>${t}</td>`).join('')}<td>${sumArray(totals)}</td></tr>`;
                table += `<tr><td>Distributed</td>${distributed.map(d => `<td>${d}</td>`).join('')}<td>${sumArray(distributed)}</td></tr>`;
                table += `<tr><td>Balance</td>${balance.map(b => `<td>${b}</td>`).join('')}<td>${sumArray(balance)}</td></tr>`;
                
                table += '</tbody></table>';
                return table;
            };

            content += buildSummaryTable('Palace Pass Summary', palaceTotalPasses, distributedPalace, balancePalace);
            content += buildSummaryTable('Torchlight Pass Summary', torchlightTotalPasses, distributedTorchlight, balanceTorchlight);
            
            content += '<h2>Individual Records</h2>';
            passEntries.forEach((entry, index) => {
                content += `
                    <h3>Record #${index + 1}</h3>
                    <table>
                        <tr><td style="width: 30%;"><strong>Recipient</strong></td><td>${entry.recipientName} (${entry.officeName || 'N/A'})</td></tr>
                        <tr><td><strong>Mobile</strong></td><td>${entry.recipientMobile || 'N/A'}</td></tr>
                        <tr><td><strong>Pass Details</strong></td><td>${entry.passCategory} - ${entry.totalPassesRequested} passes for Gate ${entry.passCategory === 'palace' ? GATES[(entry.palaceGates || [])[0] - 1] : GATES[(entry.torchlightGates || [])[0] - 1]}</td></tr>
                        <tr><td><strong>Messenger</strong></td><td>${entry.messengerName || 'N/A'} (${entry.messengerDesignation || 'N/A'})</td></tr>
                        <tr><td><strong>Timestamp</strong></td><td>${new Date(entry.timestamp).toLocaleString()}</td></tr>
                    </table>
                `;
            });

            content += '</body></html>';
            
            const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(content);
            const fileDownload = document.createElement("a");
            document.body.appendChild(fileDownload);
            fileDownload.href = source;
            fileDownload.download = `Dasara_Pass_Report_${date}.doc`;
            fileDownload.click();
            document.body.removeChild(fileDownload);
        }
        setShowExportOptions(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setShowSettings(false);
            }
            if (exportRef.current && !exportRef.current.contains(event.target)) {
                setShowExportOptions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const sectionTitleStyle = "text-lg font-semibold text-gray-800 mb-2 border-b pb-1";
    const formRowStyle = "flex flex-col sm:flex-row items-start sm:items-center gap-2";
    const labelStyle = "w-full sm:w-24 text-left sm:text-right text-sm font-medium text-gray-700 flex-shrink-0";
    const inputStyle = "p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-gray-50 h-9 text-sm";
    const tableHeaderStyle = "px-1 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
    const tableCellStyle = "px-1 py-1 whitespace-nowrap text-xs text-gray-800";

    return (
        <div className="h-screen max-h-screen bg-gray-50 p-2 font-sans flex flex-col items-center overflow-hidden">
            {showMessage && <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all">{message}</div>}
             <header className="w-full max-w-screen-2xl mx-auto flex-shrink-0 flex justify-between items-center pb-2">
                <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-800 text-center flex-1">{t('pageTitle')}</h1>
                <div className="relative" ref={settingsRef}>
                    <button onClick={() => setShowSettings(prev => !prev)} className="p-2 rounded-full hover:bg-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    {showSettings && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                            <button onClick={() => {setShowChangePasswordModal(true); setShowSettings(false);}} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{t('changePassword')}</button>
                            <div className="border-t my-1"></div>
                            <div className="px-4 py-2 text-xs text-gray-500">{t('language')}</div>
                             <button onClick={() => {setLanguage('en'); setShowSettings(false);}} className={`block w-full text-left px-4 py-2 text-sm  hover:bg-gray-100 ${language === 'en' ? 'font-bold text-blue-600' : 'text-gray-700'}`}>English</button>
                             <button onClick={() => {setLanguage('kn'); setShowSettings(false);}} className={`block w-full text-left px-4 py-2 text-sm  hover:bg-gray-100 ${language === 'kn' ? 'font-bold text-blue-600' : 'text-gray-700'}`}>ಕನ್ನಡ</button>
                             <button onClick={() => {setLanguage('hi'); setShowSettings(false);}} className={`block w-full text-left px-4 py-2 text-sm  hover:bg-gray-100 ${language === 'hi' ? 'font-bold text-blue-600' : 'text-gray-700'}`}>हिन्दी</button>
                            <div className="border-t my-1"></div>
                            <button onClick={onLogout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{t('logout')}</button>
                        </div>
                    )}
                </div>
            </header>
            <main className="w-full max-w-screen-2xl mx-auto flex-grow flex flex-col gap-2 overflow-hidden">
                <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-2 min-h-0">
                    <div className="bg-white p-2 rounded-lg shadow-lg flex flex-col overflow-hidden">
                        <h2 className={sectionTitleStyle}>{t('inputSection')}</h2>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                            <div className={formRowStyle}><label className={labelStyle}>{t('nameLabel')}</label><input type="text" className={inputStyle} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} /></div>
                            <div className={formRowStyle}><label className={labelStyle}>{t('officeLabel')}</label><input type="text" className={inputStyle} value={officeName} onChange={(e) => setOfficeName(e.target.value)} /></div>
                            <div className={formRowStyle}><label className={labelStyle}>{t('mobileLabel')}</label><input type="tel" className={inputStyle} value={recipientMobile} onChange={(e) => handleMobileChange(e, setRecipientMobile)} maxLength="10" /></div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
                                <label className="text-sm font-medium text-gray-700 flex-shrink-0 w-full sm:w-24 text-left sm:text-right">{t('categoryLabel')}</label>
                                <div className="flex gap-4 py-1">
                                    <label className="inline-flex items-center"><input type="radio" className="form-radio h-4 w-4 text-blue-600" name="passCategory" value="palace" checked={passCategory === 'palace'} onChange={handleCategoryChange} /><span className="ml-2 text-sm">{t('palace')}</span></label>
                                    <label className="inline-flex items-center"><input type="radio" className="form-radio h-4 w-4 text-blue-600" name="passCategory" value="torchlight" checked={passCategory === 'torchlight'} onChange={handleCategoryChange} /><span className="ml-2 text-sm">{t('torchlight')}</span></label>
                                </div>
                                <div className="flex-1 min-w-[100px]"><SingleSelectDropdown options={GATES} selectedOption={gateSelected} onChange={setGateSelected} label={t('chooseGate')} disabled={!passCategory} /></div>
                                <div className="w-24"><input type="number" className={inputStyle} value={passCount} onChange={(e) => setPassCount(e.target.value)} placeholder={t('passesPlaceholder')} min="1" disabled={!passCategory} /></div>
                            </div>
                            <div className="border-t pt-2 mt-2">
                                <h3 className="text-base font-semibold text-gray-700 mb-2">{t('messengerDetails')}</h3>
                                <div className="space-y-2">
                                    <div className={formRowStyle}><label className={labelStyle}>{t('nameLabel')}</label><input type="text" className={inputStyle} value={messengerName} onChange={(e) => setMessengerName(e.target.value)} /></div>
                                    <div className={formRowStyle}><label className={labelStyle}>{t('designationLabel')}</label><input type="text" className={inputStyle} value={messengerDesignation} onChange={(e) => setMessengerDesignation(e.target.value)} /></div>
                                    <div className={formRowStyle}><label className={labelStyle}>{t('mobileLabel')}</label><input type="tel" className={inputStyle} value={messengerMobile} onChange={(e) => handleMobileChange(e, setMessengerMobile)} maxLength="10" /></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0 pt-2">
                            <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition duration-200 ease-in-out disabled:bg-gray-400" disabled={!isAuthReady || isLoading}>{isLoading ? t('processing') : (editingEntryId ? t('updateEntry') : t('saveEntry'))}</button>
                            {editingEntryId && <button onClick={clearForm} className="mt-2 w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md">Cancel Edit</button>}
                        </div>
                    </div>
                    <div className="bg-white p-2 rounded-lg shadow-lg flex flex-col overflow-hidden">
                        <h2 className={sectionTitleStyle}>{t('recordsTable')}</h2>
                        <div className="overflow-y-auto flex-grow">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0"><tr><th className={tableHeaderStyle}>#</th><th className={tableHeaderStyle}>{t('recordsTable_Name')}</th><th className={tableHeaderStyle}>{t('recordsTable_Palace')}</th><th className={tableHeaderStyle}>{t('recordsTable_Torchlight')}</th><th className={tableHeaderStyle}>{t('recordsTable_Total')}</th><th className={tableHeaderStyle}>{t('recordsTable_Actions')}</th></tr></thead>
                                <tbody className="divide-y divide-gray-200">
                                    {passEntries.map((entry, index) => (
                                        <tr key={entry.id} className="hover:bg-gray-50">
                                            <td className={tableCellStyle}>{index + 1}</td><td className={tableCellStyle}>{entry.recipientName}</td>
                                            <td className={tableCellStyle}>{(entry.palacePassesPerGate || []).reduce((s, c) => s + c, 0)}</td>
                                            <td className={tableCellStyle}>{(entry.torchlightPassesPerGate || []).reduce((s, c) => s + c, 0)}</td>
                                            <td className={tableCellStyle}>{entry.totalPassesRequested}</td>
                                            <td className={`${tableCellStyle} flex gap-2 justify-center`}>
                                                <button onClick={() => handleEditRecord(entry)} className="text-blue-600 hover:text-blue-900 font-medium">{t('edit')}</button>
                                                <button onClick={() => handleDeleteClick(entry.id)} className="text-red-600 hover:text-red-900 font-medium">{t('delete')}</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {passEntries.length === 0 && !isLoading && <tr><td colSpan="6" className="text-center py-4 text-gray-500">{t('noRecordsFound')}</td></tr>}
                                    {isLoading && <tr><td colSpan="6" className="text-center py-4 text-gray-500">{t('loadingRecords')}</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-2 self-end relative flex-shrink-0" ref={exportRef}>
                            <button onClick={() => setShowExportOptions(prev => !prev)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md shadow-lg transition duration-200 ease-in-out flex items-center gap-2 text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                {t('export')}
                            </button>
                            {showExportOptions && (
                                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border">
                                    <button onClick={() => handleExport('pdf')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{t('exportAsPDF')}</button>
                                    <button onClick={() => handleExport('excel')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{t('exportAsExcel')}</button>
                                    <button onClick={() => handleExport('doc')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{t('exportAsDOC')}</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-white p-2 rounded-lg shadow-lg flex-shrink-0">
                    <SummaryTable title={t('palaceSummary')} type="palace" gates={GATES} totals={palaceTotalPasses} distributed={distributedPalace} balance={balancePalace} onEdit={handleEditTotalPasses} t={t} />
                    <SummaryTable title={t('torchlightSummary')} type="torchlight" gates={GATES} totals={torchlightTotalPasses} distributed={distributedTorchlight} balance={balanceTorchlight} onEdit={handleEditTotalPasses} t={t} />
                </div>
            </main>
            {showEditTotalModal && <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm"><h3 className="text-lg font-bold mb-4">{t('editTotalForGate')} {GATES[editTotalGateIndex]}</h3><input type="number" ref={editTotalInputRef} className={inputStyle} value={editTotalValue} onChange={(e) => setEditTotalValue(e.target.value)} min="0" onKeyDown={handleModalKeyDown} /><div className="mt-6 flex justify-end gap-3"><button onClick={() => setShowEditTotalModal(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">{t('cancel')}</button><button onClick={handleSaveTotalPasses} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{t('save')}</button></div></div></div>}
            {showConfirmDeleteModal && <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm"><h3 className="text-lg font-bold mb-4">{t('confirmDeletion')}</h3><p className="text-gray-700 mb-6">{t('confirmDeletionMessage')}</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setShowConfirmDeleteModal(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">{t('cancel')}</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">{t('delete')}</button></div></div></div>}
            {showChangePasswordModal && <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm"><h3 className="text-lg font-bold mb-4">{t('changePassword')}</h3><form onSubmit={handleChangePasswordSubmit}><div className="space-y-4"><input type="password" placeholder={t('newPassword')} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputStyle} required /><input type="password" placeholder={t('confirmNewPassword')} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputStyle} required /></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowChangePasswordModal(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">{t('cancel')}</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{t('change')}</button></div></form></div></div>}
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState(null);
    const [auth, setAuth] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [language, setLanguage] = useState('en');

    const t = (key) => translations[key] ? translations[key][language] : key;
    
    const firebaseConfig = {
      apiKey: "AIzaSyBeiQ8dG_4YUkg-3G2LQTWcJ1q5xUptNww",
      authDomain: "dasara-pass-data.firebaseapp.com",
      projectId: "dasara-pass-data",
      storageBucket: "dasara-pass-data.appspot.com",
      messagingSenderId: "1055205777690",
      appId: "1:1055205777690:web:82e0c017de7bd19ccb8ca3",
      measurementId: "G-3XK1S6GG0M"
    };

    useEffect(() => {
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        setAuth(authInstance);
        const unsubscribe = onAuthStateChanged(authInstance, (user) => {
            setUser(user);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = (email, password) => {
        signInWithEmailAndPassword(auth, email, password)
            .catch((error) => {
                setError(error.message);
            });
    };

    const handleLogout = () => {
        signOut(auth);
    };

    const handleChangePassword = (newPassword, callback) => {
        if (auth.currentUser) {
            updatePassword(auth.currentUser, newPassword).then(() => {
                callback();
            }).catch((error) => {
                setError(error.message);
            });
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return user ? <HomePage onLogout={handleLogout} onChangePassword={handleChangePassword} t={t} setLanguage={setLanguage} language={language} /> : <LoginPage onLogin={handleLogin} error={error} t={t} />;
};

export default App;
