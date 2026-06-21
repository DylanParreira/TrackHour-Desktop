const fs = require('fs').promises;
const path = require('path');

const SUPPORTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.dwg', '.dxf', '.png', '.jpg', '.jpeg', '.zip', '.rar'];

function getFileType(ext) {
    const types = {
        '.pdf': 'PDF', '.doc': 'Word', '.docx': 'Word',
        '.xls': 'Excel', '.xlsx': 'Excel', '.txt': 'Texte',
        '.dwg': 'AutoCAD', '.dxf': 'AutoCAD',
        '.png': 'Image', '.jpg': 'Image', '.jpeg': 'Image',
        '.zip': 'Archive', '.rar': 'Archive'
    };
    return types[ext.toLowerCase()] || 'Autre';
}

async function scanDocumentFolder(folderPath, recursive = false) {
    const files = [];
    let entries;
    try { entries = await fs.readdir(folderPath, { withFileTypes: true }); }
    catch { return files; }

    for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (SUPPORTED_EXTENSIONS.includes(ext)) {
                try {
                    const stats = await fs.stat(fullPath);
                    files.push({ name: entry.name, path: fullPath, extension: ext, size: stats.size, modified: stats.mtime, type: getFileType(ext) });
                } catch {}
            }
        } else if (entry.isDirectory() && recursive) {
            const subFiles = await scanDocumentFolder(fullPath, true);
            subFiles.forEach(f => { f.name = `${entry.name}/${f.name}`; files.push(f); });
        }
    }
    return files;
}

async function browseFolder(basePath, subPath) {
    const fullPath = subPath ? path.join(basePath, subPath) : basePath;
    const folders = [];
    const files = [];

    let entries;
    try { entries = await fs.readdir(fullPath, { withFileTypes: true }); }
    catch (e) { return { success: false, error: e.message, folders: [], files: [] }; }

    for (const entry of entries) {
        const entryPath = path.join(fullPath, entry.name);
        if (entry.isDirectory()) {
            folders.push({ name: entry.name, path: entryPath });
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            try {
                const stats = await fs.stat(entryPath);
                files.push({ name: entry.name, path: entryPath, extension: ext, size: stats.size, modified: stats.mtime, type: getFileType(ext) });
            } catch {}
        }
    }
    return { success: true, folders, files };
}

async function getDocuments(projectPath) {
    const documents = { bus: [], plans: [], supervision: [], schemas: [] };

    try { await fs.access(projectPath); }
    catch { return { success: false, error: 'Dossier projet inaccessible', documents }; }

    documents.bus = await scanDocumentFolder(path.join(projectPath, '1- Documentations', 'Bus'), true);
    documents.plans = await scanDocumentFolder(path.join(projectPath, '1- Documentations', 'Plans'), true);
    documents.supervision = await scanDocumentFolder(path.join(projectPath, '3- Supervision'), false);
    documents.schemas = await scanDocumentFolder(path.join(projectPath, '4- Schémas Electrique', 'PDF'), true);

    return { success: true, documents };
}

async function searchProjects(nasPath, searchTerm) {
    const results = [];
    const searchUpper = searchTerm.toUpperCase();

    let clients;
    try { clients = await fs.readdir(nasPath, { withFileTypes: true }); }
    catch (e) { return { success: false, error: e.message, results: [] }; }

    for (const client of clients) {
        if (!client.isDirectory()) continue;
        const clientPath = path.join(nasPath, client.name);
        try {
            const chantiers = await fs.readdir(clientPath, { withFileTypes: true });
            for (const chantier of chantiers) {
                if (!chantier.isDirectory()) continue;
                const chantierPath = path.join(clientPath, chantier.name);
                if (matchesProject(chantier.name, searchUpper)) {
                    results.push({ client: client.name, chantier: 'Root', projet: chantier.name, path: chantierPath });
                }
                try {
                    const subs = await fs.readdir(chantierPath, { withFileTypes: true });
                    for (const sub of subs) {
                        if (!sub.isDirectory()) continue;
                        if (matchesProject(sub.name, searchUpper)) {
                            results.push({ client: client.name, chantier: chantier.name, projet: sub.name, path: path.join(chantierPath, sub.name) });
                        }
                    }
                } catch {}
            }
        } catch {}
    }
    return { success: true, results };
}

function matchesProject(name, searchUpper) {
    if (!/^AF|^-\s*AF|^A\d|AF\d/i.test(name)) return false;
    const upper = name.toUpperCase();
    if (upper.includes(searchUpper)) return true;
    return name.split(/[\s\-_]+/).some(p => p.toUpperCase().includes(searchUpper));
}

module.exports = { browseFolder, getDocuments, searchProjects };
