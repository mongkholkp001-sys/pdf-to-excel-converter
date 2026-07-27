const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.traineddata': 'application/octet-stream',
    '.gz': 'application/octet-stream'
};

const CONFIG_FILE = path.join(__dirname, 'config.json');

function getGSheetUrl() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
            return JSON.parse(data).gsheetUrl || "";
        }
    } catch (_) {}
    return "https://script.google.com/macros/s/AKfycbyaF7hmMRO7J4oBbK0-fuPAWqsxytNpp0_YpY8GIpnmdqEvGrBX_wNQD8I3GNwQtCC1/exec";
}

function saveGSheetUrl(url) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ gsheetUrl: url }, null, 2), 'utf-8');
    } catch (_) {}
}

function callGScript(payload, callback) {
    const url = getGSheetUrl();
    if (!url) {
        return callback(new Error("Google Sheets URL not configured"));
    }
    
    const sendRequest = (targetUrl, method = 'POST', requestBody = JSON.stringify(payload)) => {
        try {
            const parsedUrl = new URL(targetUrl);
            
            const options = {
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname + parsedUrl.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (method === 'POST') {
                options.headers['Content-Length'] = Buffer.byteLength(requestBody);
            }
            
            const req = https.request(options, (res) => {
                if (res.statusCode === 302 || res.statusCode === 301) {
                    const redirectUrl = res.headers.location;
                    if (redirectUrl) {
                        sendRequest(redirectUrl, 'GET', '');
                    }
                    return;
                }
                if (res.statusCode === 307) {
                    const redirectUrl = res.headers.location;
                    if (redirectUrl) {
                        sendRequest(redirectUrl, 'POST', requestBody);
                    }
                    return;
                }
                
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        callback(null, parsed);
                    } catch (e) {
                        callback(new Error("Invalid JSON response from Google Script"));
                    }
                });
            });
            
            req.on('error', (e) => {
                callback(e);
            });
            
            if (method === 'POST') {
                req.write(requestBody);
            }
            req.end();
        } catch (e) {
            callback(e);
        }
    };
    
    sendRequest(url);
}

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Add CORS headers for offline/local asset requests (like Tesseract language data)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // 1. Auth Endpoint: Register
    if (req.method === 'POST' && req.url === '/api/auth/register') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { username, password } = JSON.parse(body);
                if (!username || !password) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }));
                    return;
                }
                callGScript({ action: 'register', username, password }, (err, result) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ success: false, error: err.message }));
                        return;
                    }
                    res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(result));
                });
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'ข้อมูลคำขอไม่ถูกต้อง' }));
            }
        });
        return;
    }
    
    // 2. Auth Endpoint: Login
    if (req.method === 'POST' && req.url === '/api/auth/login') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { username, password } = JSON.parse(body);
                callGScript({ action: 'login', username, password }, (err, result) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ success: false, error: err.message }));
                        return;
                    }
                    if (!result.success) {
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify(result));
                        return;
                    }
                    
                    const user = result.user;
                    if (user.status !== 'active') {
                        const errorMsg = user.status === 'suspended' 
                            ? 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' 
                            : 'บัญชีของคุณยังไม่ได้รับการอนุมัติใช้งาน กรุณารอผู้ดูแลระบบอนุมัติใน Google Sheet';
                        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ success: false, error: errorMsg }));
                        return;
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        token: user.username, 
                        user: { username: user.username, role: user.role }
                    }));
                });
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'ข้อมูลคำขอไม่ถูกต้อง' }));
            }
        });
        return;
    }
    
    // 3. Admin Endpoint: Get Users List
    if (req.method === 'GET' && req.url === '/api/admin/users') {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace('Bearer ', '').trim();
        
        callGScript({ action: 'getUsers' }, (err, result) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: err.message }));
                return;
            }
            
            const currentDbUser = result.users ? result.users.find(u => u.username === token) : null;
            if (!currentDbUser || currentDbUser.role !== 'admin' || currentDbUser.status !== 'active') {
                res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' }));
                return;
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(result));
        });
        return;
    }
    
    // 4. Admin Endpoint: Change User Status (Approve/Suspend)
    if (req.method === 'POST' && req.url === '/api/admin/users/status') {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace('Bearer ', '').trim();
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { targetUsername, status } = JSON.parse(body);
                if (targetUsername === token) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, error: 'ไม่สามารถระงับการใช้งานบัญชีของตนเองได้' }));
                    return;
                }
                
                callGScript({ action: 'getUsers' }, (err, result) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ success: false, error: err.message }));
                        return;
                    }
                    
                    const currentDbUser = result.users ? result.users.find(u => u.username === token) : null;
                    if (!currentDbUser || currentDbUser.role !== 'admin' || currentDbUser.status !== 'active') {
                        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ success: false, error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' }));
                        return;
                    }
                    callGScript({ action: 'updateStatus', targetUsername, status }, (sErr, sResult) => {
                        if (sErr) {
                            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                            res.end(JSON.stringify({ success: false, error: sErr.message }));
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify(sResult));
                    });
                });
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'ข้อมูลคำขอไม่ถูกต้อง' }));
            }
        });
        return;
    }
    
    // 6. Settings Endpoints (Get and Save Google Sheet URL)
    if (req.method === 'GET' && req.url === '/api/settings') {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace('Bearer ', '').trim();
        
        callGScript({ action: 'getUsers' }, (err, result) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: err.message }));
                return;
            }
            
            const currentUser = result.users ? result.users.find(u => u.username === token) : null;
            if (!currentUser || currentUser.role !== 'admin' || currentUser.status !== 'active') {
                res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' }));
                return;
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, settings: { gsheetUrl: getGSheetUrl() } }));
        });
        return;
    }
    
    if (req.method === 'POST' && req.url === '/api/settings') {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace('Bearer ', '').trim();
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { gsheetUrl } = JSON.parse(body);
                
                callGScript({ action: 'getUsers' }, (err, result) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ success: false, error: err.message }));
                        return;
                    }
                    
                    const currentUser = result.users ? result.users.find(u => u.username === token) : null;
                    if (!currentUser || currentUser.role !== 'admin' || currentUser.status !== 'active') {
                        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ success: false, error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' }));
                        return;
                    }
                    
                    saveGSheetUrl(gsheetUrl);
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ' }));
                });
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'ข้อมูลคำขอไม่ถูกต้อง' }));
            }
        });
        return;
    }
    
    // 5. Protected Conversion API
    if (req.method === 'POST' && req.url === '/api/convert') {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace('Bearer ', '').trim();
        
        callGScript({ action: 'getUsers' }, (err, result) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: err.message }));
                return;
            }
            
            const currentUser = result.users ? result.users.find(u => u.username === token) : null;
            if (!currentUser || currentUser.status !== 'active') {
                res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'สิทธิ์การใช้งานถูกระงับ หรือไม่ได้รับสิทธิ์เข้าใช้' }));
                return;
            }
            
            let bodyChunks = [];
            req.on('data', chunk => {
                bodyChunks.push(chunk);
            });
            req.on('end', () => {
                const buffer = Buffer.concat(bodyChunks);
                const tempPdfPath = path.join(__dirname, 'temp.pdf');
                fs.writeFileSync(tempPdfPath, buffer);
                
                const { exec } = require('child_process');
                const scriptPath = path.join(__dirname, 'parse_pdf_to_json.py');
                exec(`python "${scriptPath}" "${tempPdfPath}"`, { encoding: 'utf-8' }, (err, stdout, stderr) => {
                    try { fs.unlinkSync(tempPdfPath); } catch(_) {}
                    
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ success: false, error: err.message }));
                        return;
                    }
                    
                    // Automatically append scanned rows to Google Sheets in real-time
                    try {
                        const parsedResult = JSON.parse(stdout);
                        if (parsedResult.success && parsedResult.rows && parsedResult.rows.length > 0) {
                            callGScript({ 
                                action: 'appendScan', 
                                scanRows: parsedResult.rows, 
                                username: currentUser.username 
                            }, (gErr, gResult) => {
                                if (gErr) console.error("Failed to push to Google Sheets:", gErr);
                            });
                        }
                    } catch (e) {
                        console.error("Failed to parse conversion result:", e);
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(stdout);
                });
            });
        });
        return;
    }
    
    // Normalize URL and prevent directory traversal
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    const extname = path.extname(filePath);
    let contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server.');
});
