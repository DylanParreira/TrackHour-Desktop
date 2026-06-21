const fs = require('fs');
const path = require('path');

let CACHE_FILE = null;

function setCachePath(userDataPath) {
    CACHE_FILE = path.join(userDataPath, 'nas-cache.json');
    localCache = loadCacheFromDisk();
}

const BLACKLIST_FOLDERS = [
    '1- Documentations','2- Programmes','3- Supervision','4- Schémas Electrique',
    '5- Suivi de chantier','Plans','Photos','Correspondance','Archives','Sauvegardes',
    'Export','Images','GPUCache','transfert','C.WEB','ARCHITECTURE','LISTE MATERIEL','PID'
];

function isBlacklisted(name) { return BLACKLIST_FOLDERS.includes(name); }
function isRealProject(name) { return [/^AF/i, /^-\s*AF/i, /^A\d/i, /AF\d/i].some(p => p.test(name)); }
function isRecentProject(name) {
    const match = name.match(/AF(\d{2})(\d{2})\d+/);
    if (!match) return false;
    const year = 2000 + parseInt(match[1]);
    const month = parseInt(match[2]);
    const projectDate = new Date(year, month - 1, 1);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return projectDate >= threeMonthsAgo;
}

function scanDirectory(dirPath, clientName, chantierName = '', cache = []) {
    let entries;
    try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (isBlacklisted(entry.name)) continue;
        const fullPath = path.join(dirPath, entry.name);
        if (isRealProject(entry.name)) {
            cache.push({
                Client: clientName,
                Chantier: chantierName || 'Divers',
                Projet: entry.name,
                Type: 'Projet',
                IsRecent: isRecentProject(entry.name),
                Path: fullPath
            });
        } else {
            scanDirectory(fullPath, clientName, entry.name, cache);
        }
    }
}

let localCache = [];

function loadCacheFromDisk() {
    try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')); }
    catch { return []; }
}

function saveCacheToDisk() {
    try { fs.writeFileSync(CACHE_FILE, JSON.stringify(localCache)); }
    catch {}
}

async function scanNas(nasPath) {
    if (!fs.existsSync(nasPath)) {
        return { success: false, error: `Chemin NAS inaccessible : ${nasPath}` };
    }

    const nasCache = [];
    let clients;
    try { clients = fs.readdirSync(nasPath, { withFileTypes: true }); }
    catch (e) { return { success: false, error: e.message }; }

    for (const client of clients) {
        if (!client.isDirectory()) continue;
        scanDirectory(path.join(nasPath, client.name), client.name, '', nasCache);
    }

    localCache = nasCache;
    saveCacheToDisk();
    return { success: true, count: nasCache.length };
}

function getLocalCache() {
    return localCache;
}

function searchLocalCache(searchText, clientFilter) {
    let results = localCache;
    if (clientFilter) {
        results = results.filter(e => e.Client === clientFilter);
    }
    if (searchText) {
        const upper = searchText.toUpperCase();
        results = results.filter(e =>
            e.Projet.toUpperCase().includes(upper) ||
            e.Client.toUpperCase().includes(upper) ||
            e.Chantier.toUpperCase().includes(upper)
        );
    }
    return results;
}

function getLocalClients() {
    return [...new Set(localCache.map(e => e.Client))].sort();
}

module.exports = { scanNas, getLocalCache, searchLocalCache, getLocalClients, setCachePath };
