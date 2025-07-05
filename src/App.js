import React, { useState, useEffect } from 'react';
// Import Firebase services directly
import { initializeApp } from 'firebase/app';
// **UPGRADE:** Import setPersistence and browserLocalPersistence for data persistence
import { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, addDoc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';

// --- Main App Component ---
const App = () => {
    // --- State Management ---

    // Firebase instances and auth state
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Form input states
    const [recipientName, setRecipientName] = useState('');
    const [officeName, setOfficeName] = useState('');
    const [recipientMobile, setRecipientMobile] = useState('');
    const [passCategoryPalace, setPassCategoryPalace] = useState(false);
    const [passCategoryTorchlight, setPassCategoryTorchlight] = useState(false);
    const [palaceGateNo, setPalaceGateNo] = useState('');
    const [torchlightGateNo, setTorchlightGateNo] = useState('');
    const [palacePassesCount, setPalacePassesCount] = useState('');
    const [torchlightPassesCount, setTorchlightPassesCount] = useState('');
    const [totalPassesRequested, setTotalPassesRequested] = useState('');
    const [messengerName, setMessengerName] = useState('');
    const [messengerDesignation, setMessengerDesignation] = useState('');
    const [messengerMobile, setMessengerMobile] = useState('');

    // Data states from Firestore
    const [passEntries, setPassEntries] = useState([]);
    const [palaceTotalPasses, setPalaceTotalPasses] = useState(Array(16).fill(0));
    const [torchlightTotalPasses, setTorchlightTotalPasses] = useState(Array(16).fill(0));

    // UI/Modal states
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

    // Function to show a temporary message toast
    const showTemporaryMessage = (msg, duration = 4000) => {
        setMessage(msg);
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
            setMessage('');
        }, duration);
    };
    
    // Enhanced error handler to detect client-side blocking.
    const handleFirebaseError = (error, operation) => {
        console.error(`Firebase Error during ${operation}:`, error);
        if (error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
            showTemporaryMessage(`Connection to database was blocked. Please disable ad blockers or privacy extensions and refresh the page.`, 8000);
        } else {
            showTemporaryMessage(`Error during ${operation}: ${error.message}`);
        }
    };

    // --- Firebase Initialization and Data Fetching ---

    // Effect for one-time Firebase service setup and authentication
    useEffect(() => {
        // **UPGRADE:** Wrap initialization in an async function to handle persistence.
        const initializeFirebase = async () => {
            console.log("Firebase: Initializing services...");
            try {
                const firebaseConfig = {
                  apiKey: "AIzaSyBeiQ8dG_4YUkg-3G2LQTWcJ1q5xUptNww",
                  authDomain: "dasara-pass-data.firebaseapp.com",
                  projectId: "dasara-pass-data",
                  storageBucket: "dasara-pass-data.appspot.com",
                  messagingSenderId: "1055205777690",
                  appId: "1:1055205777690:web:82e0c017de7bd19ccb8ca3",
                  measurementId: "G-3XK1S6GG0M"
                };

                if (!firebaseConfig.apiKey) {
                    console.error("Firebase API Key is missing.");
                    showTemporaryMessage("Application is not configured correctly.");
                    setIsLoading(false);
                    return;
                }

                const app = initializeApp(firebaseConfig);
                const authInstance = getAuth(app);
                const dbInstance = getFirestore(app);
                
                // **UPGRADE:** This line tells Firebase to save the user's session.
                // When you return, you'll be the same user.
                await setPersistence(authInstance, browserLocalPersistence);
                
                setDb(dbInstance);

                const unsubscribe = onAuthStateChanged(authInstance, (user) => {
                    if (user) {
                        // This will now run every time you open the app, with the same user ID.
                        console.log("Firebase: User is signed in with persistent UID:", user.uid);
                        setUserId(user.uid);
                        setIsAuthReady(true);
                    } else {
                        // This will only run on the very first visit to create your persistent user.
                        console.log("Firebase: No persistent user. Signing in anonymously for the first time...");
                        signInAnonymously(authInstance).catch((error) => {
                            handleFirebaseError(error, "initial anonymous sign-in");
                        });
                    }
                });

                // Note: The 'unsubscribe' function for cleanup is implicitly returned
                // if we were to need it, but since this runs once, it's okay.
            } catch (error) {
                handleFirebaseError(error, "Firebase initialization");
                setIsLoading(false);
            }
        };

        initializeFirebase();
    }, []); // The empty dependency array ensures this runs only once.

    // Effect for setting up real-time Firestore listeners once auth is ready
    useEffect(() => {
        if (!isAuthReady || !db || !userId) {
            console.log("Skipping Firestore listeners: Firebase not fully ready.");
            return;
        }
        
        const projectId = db.app.options.projectId;
        console.log(`Setting up Firestore listeners for project '${projectId}' and user '${userId}'`);
        setIsLoading(true);

        const entriesCollectionRef = collection(db, `artifacts/${projectId}/users/${userId}/passEntries`);
        const unsubscribeEntries = onSnapshot(entriesCollectionRef, (snapshot) => {
            const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPassEntries(entries);
            console.log("Firestore: Pass entries updated.");
        }, (error) => handleFirebaseError(error, "fetching entries"));

        const totalsDocRef = doc(db, `artifacts/${projectId}/users/${userId}/passTotals/summary`);
        const unsubscribeTotals = onSnapshot(totalsDocRef, async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                const palaceTotals = Array.isArray(data.palaceTotals) ? data.palaceTotals : [];
                const torchlightTotals = Array.isArray(data.torchlightTotals) ? data.torchlightTotals : [];
                setPalaceTotalPasses([...palaceTotals, ...Array(16).fill(0)].slice(0, 16));
                setTorchlightTotalPasses([...torchlightTotals, ...Array(16).fill(0)].slice(0, 16));
                console.log("Firestore: Total passes summary updated.");
            } else {
                console.log("Firestore: Total passes document not found. Initializing...");
                const initialTotals = {
                    palaceTotals: Array(16).fill(0),
                    torchlightTotals: Array(16).fill(0)
                };
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

        return () => {
            unsubscribeEntries();
            unsubscribeTotals();
            console.log("Firestore: Listeners unsubscribed.");
        };
    }, [isAuthReady, db, userId]);


    // --- Data Calculation ---

    const { distributedPalace, balancePalace, distributedTorchlight, balanceTorchlight } = React.useMemo(() => {
        const distPalace = Array(16).fill(0);
        const distTorchlight = Array(16).fill(0);

        passEntries.forEach(entry => {
            (entry.palaceGates || []).forEach((gateNum, index) => {
                const pCount = parseInt((entry.palacePassesPerGate || [])[index]) || 0;
                if (gateNum >= 1 && gateNum <= 16) distPalace[gateNum - 1] += pCount;
            });
            (entry.torchlightGates || []).forEach((gateNum, index) => {
                const tCount = parseInt((entry.torchlightPassesPerGate || [])[index]) || 0;
                if (gateNum >= 17 && gateNum <= 32) distTorchlight[gateNum - 17] += tCount;
            });
        });

        const balPalace = palaceTotalPasses.map((total, i) => total - distPalace[i]);
        const balTorchlight = torchlightTotalPasses.map((total, i) => total - distTorchlight[i]);

        return { distributedPalace: distPalace, balancePalace: balPalace, distributedTorchlight: distTorchlight, balanceTorchlight: balTorchlight };
    }, [passEntries, palaceTotalPasses, torchlightTotalPasses]);


    // --- Event Handlers ---

    const clearForm = () => {
        setRecipientName('');
        setOfficeName('');
        setRecipientMobile('');
        setPassCategoryPalace(false);
        setPassCategoryTorchlight(false);
        setPalaceGateNo('');
        setTorchlightGateNo('');
        setPalacePassesCount('');
        setTorchlightPassesCount('');
        setTotalPassesRequested('');
        setMessengerName('');
        setMessengerDesignation('');
        setMessengerMobile('');
        setEditingEntryId(null);
    };

    const handleSave = async () => {
        if (!db || !userId) {
            showTemporaryMessage("Database connection not ready. Please wait.");
            return;
        }

        const parseAndFilter = (str, min, max) => str.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= min && n <= max);
        const parseCounts = (str) => str.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 0);

        const palaceGates = passCategoryPalace ? parseAndFilter(palaceGateNo, 1, 16) : [];
        const palaceCounts = passCategoryPalace ? parseCounts(palacePassesCount) : [];
        const torchlightGates = passCategoryTorchlight ? parseAndFilter(torchlightGateNo, 17, 32) : [];
        const torchlightCounts = passCategoryTorchlight ? parseCounts(torchlightPassesCount) : [];
        const requestedTotal = parseInt(totalPassesRequested) || 0;

        if (!recipientName || (!passCategoryPalace && !passCategoryTorchlight)) return showTemporaryMessage("Recipient Name and at least one Pass Category are required.");
        if (passCategoryPalace && palaceGates.length !== palaceCounts.length) return showTemporaryMessage("Palace: The number of gates must match the number of pass counts.");
        if (passCategoryTorchlight && torchlightGates.length !== torchlightCounts.length) return showTemporaryMessage("Torchlight: The number of gates must match the number of pass counts.");
        if (requestedTotal !== [...palaceCounts, ...torchlightCounts].reduce((a, b) => a + b, 0)) return showTemporaryMessage("The 'Total No. of Passes' must equal the sum of all individual pass counts.");

        const tempDistributed = { palace: [...distributedPalace], torchlight: [...distributedTorchlight] };
        if (editingEntryId) {
            const oldEntry = passEntries.find(e => e.id === editingEntryId);
            if (oldEntry) {
                (oldEntry.palaceGates || []).forEach((gate, i) => { tempDistributed.palace[gate - 1] -= (oldEntry.palacePassesPerGate || [])[i] || 0; });
                (oldEntry.torchlightGates || []).forEach((gate, i) => { tempDistributed.torchlight[gate - 17] -= (oldEntry.torchlightPassesPerGate || [])[i] || 0; });
            }
        }

        for (let i = 0; i < palaceGates.length; i++) {
            if (tempDistributed.palace[palaceGates[i] - 1] + palaceCounts[i] > palaceTotalPasses[palaceGates[i] - 1]) return showTemporaryMessage(`Not enough passes for Palace Gate ${palaceGates[i]}.`);
        }
        for (let i = 0; i < torchlightGates.length; i++) {
            if (tempDistributed.torchlight[torchlightGates[i] - 17] + torchlightCounts[i] > torchlightTotalPasses[torchlightGates[i] - 17]) return showTemporaryMessage(`Not enough passes for Torchlight Gate ${torchlightGates[i]}.`);
        }

        const entryData = {
            recipientName, officeName, recipientMobile, messengerName, messengerDesignation, messengerMobile,
            passCategory: { palace: passCategoryPalace, torchlight: passCategoryTorchlight },
            palaceGates, palacePassesPerGate: palaceCounts,
            torchlightGates, torchlightPassesPerGate: torchlightCounts,
            totalPassesRequested: requestedTotal,
            timestamp: new Date().toISOString(),
        };

        setIsLoading(true);
        try {
            const projectId = db.app.options.projectId;
            const collectionRef = collection(db, `artifacts/${projectId}/users/${userId}/passEntries`);
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
        setRecipientName(entry.recipientName || '');
        setOfficeName(entry.officeName || '');
        setRecipientMobile(entry.recipientMobile || '');
        setPassCategoryPalace(entry.passCategory?.palace || false);
        setPassCategoryTorchlight(entry.passCategory?.torchlight || false);
        setPalaceGateNo((entry.palaceGates || []).join(', '));
        setPalacePassesCount((entry.palacePassesPerGate || []).join(', '));
        setTorchlightGateNo((entry.torchlightGates || []).join(', '));
        setTorchlightPassesCount((entry.torchlightPassesPerGate || []).join(', '));
        setTotalPassesRequested(entry.totalPassesRequested?.toString() || '');
        setMessengerName(entry.messengerName || '');
        setMessengerDesignation(entry.messengerDesignation || '');
        setMessengerMobile(entry.messengerMobile || '');
        window.scrollTo(0, 0);
        showTemporaryMessage("Editing entry. Make changes and click 'Update Entry'.");
    };

    const handleDeleteClick = (id) => {
        setEntryToDeleteId(id);
        setShowConfirmDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!db || !userId || !entryToDeleteId) return;
        setIsLoading(true);
        try {
            const projectId = db.app.options.projectId;
            await deleteDoc(doc(db, `artifacts/${projectId}/users/${userId}/passEntries`, entryToDeleteId));
            showTemporaryMessage("Entry deleted successfully!");
        } catch (error) {
            handleFirebaseError(error, "deleting entry");
        } finally {
            setIsLoading(false);
            setShowConfirmDeleteModal(false);
            setEntryToDeleteId(null);
        }
    };

    const handleEditTotalPasses = (type, gateIndex) => {
        setEditTotalType(type);
        setEditTotalGateIndex(gateIndex);
        const currentValue = type === 'palace' ? palaceTotalPasses[gateIndex] : torchlightTotalPasses[gateIndex];
        setEditTotalValue(currentValue.toString());
        setShowEditTotalModal(true);
    };

    const handleSaveTotalPasses = async () => {
        if (!db || !userId) return;
        const value = parseInt(editTotalValue);
        if (isNaN(value) || value < 0) return showTemporaryMessage("Please enter a valid non-negative number.");

        const distributedCount = editTotalType === 'palace' ? distributedPalace[editTotalGateIndex] : torchlightTotalPasses[editTotalGateIndex];
        if (value < distributedCount) return showTemporaryMessage(`Cannot set total to ${value}. Already distributed ${distributedCount}.`);

        setIsLoading(true);
        const projectId = db.app.options.projectId;
        const totalsDocRef = doc(db, `artifacts/${projectId}/users/${userId}/passTotals/summary`);
        const newTotals = {
            palaceTotals: [...palaceTotalPasses],
            torchlightTotals: [...torchlightTotalPasses],
        };
        if (editTotalType === 'palace') {
            newTotals.palaceTotals[editTotalGateIndex] = value;
        } else {
            newTotals.torchlightTotals[editTotalGateIndex] = value;
        }

        try {
            await setDoc(totalsDocRef, newTotals);
            showTemporaryMessage("Total passes updated successfully!");
        } catch (error) {
            handleFirebaseError(error, "updating totals");
        } finally {
            setIsLoading(false);
            setShowEditTotalModal(false);
        }
    };

    // --- Render ---

    const inputStyle = "p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-gray-50";
    const labelStyle = "block text-sm font-medium text-gray-700 mb-1";
    const sectionTitleStyle = "text-xl font-semibold text-gray-800 mb-4 border-b pb-2";
    const tableHeaderStyle = "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
    const tableCellStyle = "px-4 py-2 whitespace-nowrap text-sm text-gray-800";

    return (
        <div className="min-h-screen bg-gray-50 p-4 font-sans flex flex-col items-center">
            {showMessage && <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all">{message}</div>}

            <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">MYSURU DASARA PASSES DISTRIBUTION 2025</h1>
            {userId && <div className="bg-blue-100 text-blue-800 p-2 rounded-md mb-6 text-xs">Persistent User ID: <span className="font-mono">{userId}</span></div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-screen-2xl">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className={sectionTitleStyle}>Input Section</h2>
                    {isLoading && <div className="text-center text-blue-600 p-4">Loading Data...</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="recipientName" className={labelStyle}>Recipient Name</label>
                            <input type="text" id="recipientName" className={inputStyle} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="officeName" className={labelStyle}>Office Name</label>
                            <input type="text" id="officeName" className={inputStyle} value={officeName} onChange={(e) => setOfficeName(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="recipientMobile" className={labelStyle}>Recipient Mobile</label>
                            <input type="tel" id="recipientMobile" className={inputStyle} value={recipientMobile} onChange={(e) => setRecipientMobile(e.target.value)} />
                        </div>
                        <div className="col-span-full">
                            <label className={labelStyle}>Pass Category</label>
                            <div className="flex gap-6 mt-2">
                                <label className="inline-flex items-center"><input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600 rounded" checked={passCategoryPalace} onChange={(e) => setPassCategoryPalace(e.target.checked)} /><span className="ml-2 text-gray-700">Palace</span></label>
                                <label className="inline-flex items-center"><input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600 rounded" checked={passCategoryTorchlight} onChange={(e) => setPassCategoryTorchlight(e.target.checked)} /><span className="ml-2 text-gray-700">Torchlight Parade</span></label>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="palaceGateNo" className={labelStyle}>Palace Gate No. (1-16)</label>
                            <input type="text" id="palaceGateNo" className={inputStyle} value={palaceGateNo} onChange={(e) => setPalaceGateNo(e.target.value)} placeholder="e.g., 1, 5" disabled={!passCategoryPalace} />
                        </div>
                        <div>
                            <label htmlFor="torchlightGateNo" className={labelStyle}>Torchlight Gate No. (17-32)</label>
                            <input type="text" id="torchlightGateNo" className={inputStyle} value={torchlightGateNo} onChange={(e) => setTorchlightGateNo(e.target.value)} placeholder="e.g., 17, 20" disabled={!passCategoryTorchlight} />
                        </div>
                         <div className="col-span-full">
                            <label className={labelStyle}>Passes Count (comma-separated)</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div><input type="text" className={inputStyle} value={palacePassesCount} onChange={(e) => setPalacePassesCount(e.target.value)} placeholder="Palace counts, e.g., 5, 3" disabled={!passCategoryPalace} /></div>
                                <div><input type="text" className={inputStyle} value={torchlightPassesCount} onChange={(e) => setTorchlightPassesCount(e.target.value)} placeholder="Torchlight counts, e.g., 10, 7" disabled={!passCategoryTorchlight} /></div>
                            </div>
                        </div>
                        <div className="col-span-full">
                            <label htmlFor="totalPassesRequested" className={labelStyle}>Total No. of Passes</label>
                            <input type="number" id="totalPassesRequested" className={inputStyle} value={totalPassesRequested} onChange={(e) => setTotalPassesRequested(e.target.value)} min="0" />
                        </div>
                        <div className="col-span-full border-t pt-4 mt-4">
                            <h3 className="text-md font-semibold text-gray-700 mb-3">Messenger Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className={labelStyle}>Name</label><input type="text" className={inputStyle} value={messengerName} onChange={(e) => setMessengerName(e.target.value)} /></div>
                                <div><label className={labelStyle}>Designation</label><input type="text" className={inputStyle} value={messengerDesignation} onChange={(e) => setMessengerDesignation(e.target.value)} /></div>
                                <div><label className={labelStyle}>Mobile</label><input type="tel" className={inputStyle} value={messengerMobile} onChange={(e) => setMessengerMobile(e.target.value)} /></div>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleSave} className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md shadow-lg transition duration-200 ease-in-out disabled:bg-gray-400" disabled={isLoading}>
                        {isLoading ? 'Processing...' : (editingEntryId ? 'Update Entry' : 'Save Entry')}
                    </button>
                    {editingEntryId && <button onClick={clearForm} className="mt-2 w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md">Cancel Edit</button>}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                    <h2 className={sectionTitleStyle}>Records Table</h2>
                    <div className="min-w-full inline-block align-middle">
                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50"><tr>
                                    <th className={tableHeaderStyle}>#</th>
                                    <th className={tableHeaderStyle}>Name</th>
                                    <th className={tableHeaderStyle}>Palace</th>
                                    <th className={tableHeaderStyle}>Torchlight</th>
                                    <th className={tableHeaderStyle}>Total</th>
                                    <th className={tableHeaderStyle}>Actions</th>
                                </tr></thead>
                                <tbody className="divide-y divide-gray-200">
                                    {passEntries.map((entry, index) => (
                                        <tr key={entry.id} className="hover:bg-gray-50">
                                            <td className={tableCellStyle}>{index + 1}</td>
                                            <td className={tableCellStyle}>{entry.recipientName}</td>
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
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-screen-2xl mt-6 bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                <h2 className={sectionTitleStyle}>Summary Section</h2>
                {['Palace', 'Torchlight'].map(type => {
                    const isPalace = type === 'Palace';
                    const gateOffset = isPalace ? 1 : 17;
                    const totals = isPalace ? palaceTotalPasses : torchlightTotalPasses;
                    const distributed = isPalace ? distributedPalace : distributedTorchlight;
                    const balance = isPalace ? balancePalace : balanceTorchlight;

                    return (
                        <div key={type} className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-700 mb-3">{type} Summary (Gates {gateOffset}-{gateOffset + 15})</h3>
                            <div className="overflow-hidden border border-gray-200 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200 text-center">
                                    <thead className="bg-gray-50"><tr>
                                        <th className={`${tableHeaderStyle} text-left`}>Category</th>
                                        {Array.from({ length: 16 }, (_, i) => <th key={i} className={tableHeaderStyle}>G{i + gateOffset}</th>)}
                                    </tr></thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {[
                                            { label: 'Total Passes', data: totals, editable: true },
                                            { label: 'Distributed', data: distributed },
                                            { label: 'Balance', data: balance }
                                        ].map(row => (
                                            <tr key={row.label}>
                                                <td className={`${tableCellStyle} text-left font-medium`}>{row.label}</td>
                                                {row.data.map((val, i) => (
                                                    <td key={i} className={`${tableCellStyle} ${row.label === 'Balance' && val < 0 ? 'text-red-500 font-bold' : ''}`}>
                                                        {val}
                                                        {row.editable && <button onClick={() => handleEditTotalPasses(type.toLowerCase(), i)} className="ml-1 text-blue-500 text-xs">[E]</button>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showEditTotalModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                        <h3 className="text-lg font-bold mb-4">Edit Total for Gate {editTotalType === 'palace' ? editTotalGateIndex + 1 : editTotalGateIndex + 17}</h3>
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
