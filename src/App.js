import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, addDoc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';

// --- Constants ---
const GATES = Array.from({ length: 15 }, (_, i) => String.fromCharCode(65 + i)); // Creates ['A', 'B', ..., 'O']

// --- Custom Single-Select Dropdown Component ---
const SingleSelectDropdown = ({ options, selectedOption, onChange, label, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const handleToggle = () => {
        if (!disabled) {
            setIsOpen(prev => !prev);
        }
    };

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
    };

    // Effect to handle clicks outside the dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const displayValue = selectedOption || `Choose ${label}...`;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={handleToggle}
                disabled={disabled}
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-gray-50 text-left disabled:bg-gray-200 disabled:cursor-not-allowed flex justify-between items-center"
            >
                <span className="truncate">{displayValue}</span>
                <svg className={`w-5 h-5 ml-2 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 flex flex-col">
                        {options.map(option => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => handleSelect(option)}
                                className={`w-full text-left p-2 rounded-md hover:bg-blue-500 hover:text-white ${selectedOption === option ? 'bg-blue-500 text-white' : 'text-gray-700'}`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Summary Table Component ---
const SummaryTable = ({ title, type, gates, totals, distributed, balance, onEdit }) => {
    const tableHeaderStyle = "px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
    const tableCellStyle = "px-2 py-1 whitespace-nowrap text-sm text-gray-800";

    return (
        <div className="mb-4">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-center border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className={`${tableHeaderStyle} w-10`}>Sl.</th>
                            <th className={`${tableHeaderStyle} w-40`}>{title}</th>
                            {gates.map((gate) => <th key={gate} className={tableHeaderStyle}>{gate}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        <tr>
                            <td className={tableCellStyle}>1</td>
                            <td className={`${tableCellStyle} text-left font-medium`}>Total Passes</td>
                            {totals.map((val, i) => (
                                <td key={i} className={tableCellStyle}>
                                    {val}
                                    <button onClick={() => onEdit(type, i)} className="ml-1 text-blue-500 text-xs">[E]</button>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>2</td>
                            <td className={`${tableCellStyle} text-left font-medium`}>Distributed</td>
                            {distributed.map((val, i) => <td key={i} className={tableCellStyle}>{val}</td>)}
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>3</td>
                            <td className={`${tableCellStyle} text-left font-medium`}>Balance</td>
                            {balance.map((val, i) => (
                                <td key={i} className={`${tableCellStyle} ${val < 0 ? 'text-red-500 font-bold' : ''}`}>{val}</td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// --- Main App Component ---
const App = () => {
    // --- State Management ---
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

    // --- Utility Functions ---
    const showTemporaryMessage = (msg, duration = 4000) => {
        setMessage(msg);
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
            setMessage('');
        }, duration);
    };
    
    const handleFirebaseError = (error, operation) => {
        console.error(`Firebase Error during ${operation}:`, error);
        showTemporaryMessage(`Error during ${operation}: ${error.message}`);
    };

    // --- Firebase Initialization and Data Fetching ---
    useEffect(() => {
        let unsubscribe = () => {}; 
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setDb(dbInstance);
            unsubscribe = onAuthStateChanged(authInstance, (user) => {
                if (user) {
                    setUserId(user.uid);
                    setIsAuthReady(true);
                } else {
                    signInAnonymously(authInstance).catch((error) => handleFirebaseError(error, "anonymous sign-in"));
                }
            });
        } catch (error) {
            handleFirebaseError(error, "Firebase initialization");
        }
        return () => unsubscribe();
    }, []); 

    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        setIsLoading(true);
        const entriesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/passEntries`);
        const unsubscribeEntries = onSnapshot(entriesCollectionRef, (snapshot) => {
            const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPassEntries(entries);
        }, (error) => handleFirebaseError(error, "fetching entries"));

        const totalsDocRef = doc(db, `artifacts/${appId}/users/${userId}/passTotals/summary`);
        const unsubscribeTotals = onSnapshot(totalsDocRef, async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                setPalaceTotalPasses(Array.isArray(data.palaceTotals) ? [...data.palaceTotals, ...Array(15).fill(0)].slice(0, 15) : Array(15).fill(0));
                setTorchlightTotalPasses(Array.isArray(data.torchlightTotals) ? [...data.torchlightTotals, ...Array(15).fill(0)].slice(0, 15) : Array(15).fill(0));
            } else {
                const initialTotals = { palaceTotals: Array(15).fill(0), torchlightTotals: Array(15).fill(0) };
                try {
                    await setDoc(totalsDocRef, initialTotals);
                    setPalaceTotalPasses(initialTotals.palaceTotals);
                    setTorchlightTotalPasses(initialTotals.torchlightTotals);
                } catch (error) {
                    handleFirebaseError(error, "initializing totals document");
                }
            }
            setIsLoading(false);
        }, (error) => {
            handleFirebaseError(error, "fetching totals summary");
            setIsLoading(false);
        });
        return () => { unsubscribeEntries(); unsubscribeTotals(); };
    }, [isAuthReady, db, userId, appId]);

    // --- Data Calculation ---
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

    // --- Event Handlers ---
    const clearForm = () => {
        setRecipientName(''); setOfficeName(''); setRecipientMobile('');
        setPassCategory(''); setGateSelected(''); setPassCount('');
        setMessengerName(''); setMessengerDesignation(''); setMessengerMobile('');
        setEditingEntryId(null);
    };

    const handleSave = async () => {
        if (!db || !userId) return;
        const count = parseInt(passCount);
        if (!recipientName || !passCategory) return showTemporaryMessage("Recipient Name and a Pass Category are required.");
        if (!gateSelected || !passCount || isNaN(count) || count <= 0) return showTemporaryMessage("A gate and a valid pass count are required.");
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
            if (tempDistributed.palace[gateNumeric - 1] + count > palaceTotalPasses[gateNumeric - 1]) return showTemporaryMessage(`Not enough passes for Palace Gate ${gateSelected}.`);
        } else if (passCategory === 'torchlight') {
            if (tempDistributed.torchlight[gateNumeric - 1] + count > torchlightTotalPasses[gateNumeric - 1]) return showTemporaryMessage(`Not enough passes for Torchlight Gate ${gateSelected}.`);
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
                showTemporaryMessage("Entry updated successfully!");
            } else {
                await addDoc(collectionRef, entryData);
                showTemporaryMessage("Entry saved successfully!");
            }
            clearForm();
        } catch (error) {
            handleFirebaseError(error, "saving entry");
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
        showTemporaryMessage("Editing entry. Make changes and click 'Update Entry'.");
    };

    const handleDeleteClick = (id) => { setEntryToDeleteId(id); setShowConfirmDeleteModal(true); };
    const confirmDelete = async () => {
        if (!db || !userId || !entryToDeleteId) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/passEntries`, entryToDeleteId));
            showTemporaryMessage("Entry deleted successfully!");
        } catch (error) {
            handleFirebaseError(error, "deleting entry");
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
        if (isNaN(value) || value < 0) return showTemporaryMessage("Please enter a valid non-negative number.");
        const distributedCount = editTotalType === 'palace' ? distributedPalace[editTotalGateIndex] : distributedTorchlight[editTotalGateIndex];
        if (value < distributedCount) return showTemporaryMessage(`Cannot set total to ${value}. Already distributed ${distributedCount}.`);
        setIsLoading(true);
        const totalsDocRef = doc(db, `artifacts/${appId}/users/${userId}/passTotals/summary`);
        const newTotals = { palaceTotals: [...palaceTotalPasses], torchlightTotals: [...torchlightTotalPasses] };
        if (editTotalType === 'palace') newTotals.palaceTotals[editTotalGateIndex] = value;
        else newTotals.torchlightTotals[editTotalGateIndex] = value;
        try {
            await setDoc(totalsDocRef, newTotals, { merge: true });
            showTemporaryMessage("Total passes updated successfully!");
        } catch (error) {
            handleFirebaseError(error, "updating totals");
        } finally {
            setIsLoading(false); setShowEditTotalModal(false);
        }
    };

    const handleCategoryChange = (e) => {
        const newCategory = e.target.value;
        setPassCategory(newCategory); setGateSelected(''); setPassCount('');
    };

    // --- Render ---
    const sectionTitleStyle = "text-xl font-semibold text-gray-800 mb-2 border-b pb-2";
    const formRowStyle = "flex items-center gap-2";
    const labelStyle = "w-24 text-right text-sm font-medium text-gray-700 flex-shrink-0";
    const inputStyle = "p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-gray-50";
    const tableHeaderStyle = "px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
    const tableCellStyle = "px-2 py-1 whitespace-nowrap text-sm text-gray-800";

    return (
        <div className="h-screen bg-gray-50 p-2 font-sans flex flex-col items-center">
            {showMessage && <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all">{message}</div>}

            <header className="w-full max-w-screen-2xl mx-auto flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">MYSURU DASARA PASSES DISTRIBUTION 2025</h1>
            </header>

            <main className="w-full max-w-screen-2xl mx-auto flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <h2 className={sectionTitleStyle}>Input Section</h2>
                        {isLoading && !isAuthReady && <div className="text-center text-blue-600 p-4">Connecting to Database...</div>}
                        <div className="flex flex-col gap-3">
                            <div className={formRowStyle}>
                                <label className={labelStyle}>Name ::</label>
                                <input type="text" className={inputStyle} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
                            </div>
                            <div className={formRowStyle}>
                                <label className={labelStyle}>Office ::</label>
                                <input type="text" className={inputStyle} value={officeName} onChange={(e) => setOfficeName(e.target.value)} />
                            </div>
                            <div className={formRowStyle}>
                                <label className={labelStyle}>Mobile ::</label>
                                <input type="tel" className={inputStyle} value={recipientMobile} onChange={(e) => setRecipientMobile(e.target.value)} />
                            </div>
                            <div className={`${formRowStyle} flex-wrap`}>
                                <label className="text-sm font-medium text-gray-700 flex-shrink-0 w-24 text-right">Category ::</label>
                                <div className="flex gap-4 py-2">
                                    <label className="inline-flex items-center"><input type="radio" className="form-radio h-4 w-4 text-blue-600" name="passCategory" value="palace" checked={passCategory === 'palace'} onChange={handleCategoryChange} /><span className="ml-2 text-sm">Palace</span></label>
                                    <label className="inline-flex items-center"><input type="radio" className="form-radio h-4 w-4 text-blue-600" name="passCategory" value="torchlight" checked={passCategory === 'torchlight'} onChange={handleCategoryChange} /><span className="ml-2 text-sm">Torchlight</span></label>
                                </div>
                                <div className="flex-1 min-w-[120px]"><SingleSelectDropdown options={GATES} selectedOption={gateSelected} onChange={setGateSelected} label="Gate" disabled={!passCategory} /></div>
                                <div className="w-28"><input type="number" className={inputStyle} value={passCount} onChange={(e) => setPassCount(e.target.value)} placeholder="Passes" min="1" disabled={!passCategory} /></div>
                            </div>
                            <div className="border-t pt-3 mt-3">
                                <h3 className="text-md font-semibold text-gray-700 mb-3">Messenger Details</h3>
                                <div className="flex flex-col gap-3">
                                    <div className={formRowStyle}><label className={labelStyle}>Name ::</label><input type="text" className={inputStyle} value={messengerName} onChange={(e) => setMessengerName(e.target.value)} /></div>
                                    <div className={formRowStyle}><label className={labelStyle}>Designation ::</label><input type="text" className={inputStyle} value={messengerDesignation} onChange={(e) => setMessengerDesignation(e.target.value)} /></div>
                                    <div className={formRowStyle}><label className={labelStyle}>Mobile ::</label><input type="tel" className={inputStyle} value={messengerMobile} onChange={(e) => setMessengerMobile(e.target.value)} /></div>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleSave} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition duration-200 ease-in-out disabled:bg-gray-400" disabled={!isAuthReady || isLoading}>
                            {isLoading ? 'Processing...' : (editingEntryId ? 'Update Entry' : 'Save Entry')}
                        </button>
                        {editingEntryId && <button onClick={clearForm} className="mt-2 w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md">Cancel Edit</button>}
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-lg overflow-y-auto">
                        <h2 className={sectionTitleStyle}>Records Table</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50"><tr>
                                    <th className={tableHeaderStyle}>#</th><th className={tableHeaderStyle}>Name</th><th className={tableHeaderStyle}>Palace</th><th className={tableHeaderStyle}>Torchlight</th><th className={tableHeaderStyle}>Total</th><th className={tableHeaderStyle}>Actions</th>
                                </tr></thead>
                                <tbody className="divide-y divide-gray-200">
                                    {passEntries.map((entry, index) => (
                                        <tr key={entry.id} className="hover:bg-gray-50">
                                            <td className={tableCellStyle}>{index + 1}</td><td className={tableCellStyle}>{entry.recipientName}</td>
                                            <td className={tableCellStyle}>{(entry.palacePassesPerGate || []).reduce((s, c) => s + c, 0)}</td>
                                            <td className={tableCellStyle}>{(entry.torchlightPassesPerGate || []).reduce((s, c) => s + c, 0)}</td>
                                            <td className={tableCellStyle}>{entry.totalPassesRequested}</td>
                                            <td className={`${tableCellStyle} flex gap-2`}>
                                                <button onClick={() => handleEditRecord(entry)} className="text-blue-600 hover:text-blue-900 font-medium">Edit</button>
                                                <button onClick={() => handleDeleteClick(entry.id)} className="text-red-600 hover:text-red-900 font-medium">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {passEntries.length === 0 && !isLoading && <tr><td colSpan="6" className="text-center py-4 text-gray-500">No records found.</td></tr>}
                                    {isLoading && <tr><td colSpan="6" className="text-center py-4 text-gray-500">Loading records...</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-lg flex-1 overflow-y-auto">
                    <SummaryTable title="Palace Summary" type="palace" gates={GATES} totals={palaceTotalPasses} distributed={distributedPalace} balance={balancePalace} onEdit={handleEditTotalPasses} />
                    <SummaryTable title="Torchlight Summary" type="torchlight" gates={GATES} totals={torchlightTotalPasses} distributed={distributedTorchlight} balance={balanceTorchlight} onEdit={handleEditTotalPasses} />
                </div>
            </main>

            {showEditTotalModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                        <h3 className="text-lg font-bold mb-4">Edit Total for Gate {GATES[editTotalGateIndex]}</h3>
                        <input type="number" className={inputStyle} value={editTotalValue} onChange={(e) => setEditTotalValue(e.target.value)} min="0" />
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setShowEditTotalModal(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancel</button>
                            <button onClick={handleSaveTotalPasses} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
                        </div>
                    </div>
                </div>
            )}
            {showConfirmDeleteModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                        <h3 className="text-lg font-bold mb-4">Confirm Deletion</h3>
                        <p className="text-gray-700 mb-6">Are you sure you want to delete this entry? This cannot be undone.</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setShowConfirmDeleteModal(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancel</button>
                            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
