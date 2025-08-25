const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const JSZip = require('jszip');
const instaloader = require('instaloader');
const luhn = require('luhn');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

// بيانات البوت
const TOKEN = "8018964869:AAHevMgPMsip0CKx4-virvESUiNdcRRcKz8";
const ADMIN_ID = 6808883615;
const DEVELOPER_USERNAME = "@QR_l4";

// تهيئة البوت
const bot = new TelegramBot(TOKEN, { polling: true });

// ملفات التخزين
const DATA_FILE = "bot_data.json";
const CHANNELS_FILE = "channels_data.json";

// APIs
const VIRUSTOTAL_API_KEY = "19462df75ad313db850e532a2e8869dc8713c07202b1c62ebf1aa7a18a2e0173";
const VIDEO_API_BASE = "https://api.yabes-desu.workers.dev/ai/tool/txt2video";
const SHORTENER_API = "https://api.dfkz.xo.je/apis/v1/short.php?url=";
const INSTA_INFO_API = "https://sherifbots.serv00.net/Api/insta.php?user=";
const AI_API_URL = 'https://ai-api.magicstudio.com/api/ai-art-generator';

// إعدادات أخرى
let COLUMNS = 2;
const DOWNLOAD_FOLDER = "site_download";
const ZIP_FILE_NAME = "site_download.zip";

// متغيرات صيد اليوزرات
const insta = "1234567890qwertyuiopasdfghjklzxcvbnm";
const all_chars = "_.";
const user_sessions = {};
const good_users_cache = {};

// لغات الترجمة المدعومة
const SUPPORTED_LANGUAGES = {
    "العربية": "ar",
    "الإنجليزية": "en",
    "الإسبانية": "es",
    "الفرنسية": "fr",
    "الألمانية": "de",
    "الإيطالية": "it",
    "البرتغالية": "pt",
    "الروسية": "ru",
    "الصينية": "zh",
    "اليابانية": "ja",
    "الكورية": "ko",
    "التركية": "tr",
    "الفارسية": "fa",
    "العبرية": "he"
};

// BINs شائعة للفيزا
const COMMON_VISA_BINS = [
    '453201', '453202', '453203', '453204', '453205', '453206', '453207', '453208', '453209',
    '453210', '453211', '453212', '453213', '453214', '453215', '453216', '453217', '453218',
    '453219', '453220', '453221', '453222', '453223', '453224', '453225', '453226', '453227',
    '453228', '453229', '453230', '453231', '453232', '453233', '453234', '453235', '453236',
    '453237', '453238', '453239', '453240', '453241', '453242', '453243', '453244', '453245',
    '453246', '453247', '453248', '453249', '453250', '453251', '453252', '453253', '453254',
    '453255', '453256', '453257', '453258', '453259', '453260', '453261', '453262', '453263',
    '453264', '453265', '453266', '453267', '453268', '453269', '453270', '453271', '453272',
    '453273', '453274', '453275', '453276', '453277', '453278', '453279', '453280', '453281',
    '453282', '453283', '453284', '453285', '453286', '453287', '453288', '453289', '453290',
    '453291', '453292', '453293', '453294', '453295', '453296', '453297', '453298', '453299',
    '454000', '454001', '454002', '454003', '454004', '454005', '454006', '454007', '454008',
    '454009', '454010', '454011', '454012', '454013', '454014', '454015', '454016', '454017',
    '454018', '454019', '454020', '454021', '454022', '454023', '454024', '454025', '454026',
    '454027', '454028', '454029', '454030', '454031', '454032', '454033', '454034', '454035',
    '454036', '454037', '454038', '454039', '454040', '454041', '454042', '454043', '454044',
    '454045', '454046', '454047', '454048', '454049', '454050', '454051', '454052', '454053',
    '454054', '454055', '454056', '454057', '454058', '454059', '454060', '454061', '454062',
    '454063', '454064', '454065', '454066', '454067', '454068', '454069', '454070', '454071',
    '454072', '454073', '454074', '454075', '454076', '454077', '454078', '454079', '454080',
    '454081', '454082', '454083', '454084', '454085', '454086', '454087', '454088', '454089',
    '454090', '454091', '454092', '454093', '454094', '454095', '454096', '454097', '454098',
    '454099'
];

// تحميل البيانات
function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    return { 
        buttons: [], 
        services_order: [
            "translation", "visa", "image", "video", "tiktok", 
            "file_check", "site_download", "shortener", "insta_info"
        ] 
    };
}

function loadChannels() {
    if (fs.existsSync(CHANNELS_FILE)) {
        return JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
    }
    return { channels: [] };
}

// حفظ البيانات
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function saveChannels(data) {
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(data, null, 2));
}

// تحقق من صلاحية المشرف
function isAdmin(userId) {
    return userId === ADMIN_ID;
}

// دالة لترتيب الأزرار في أعمدة
function arrangeButtonsInColumns(buttonsList, columns = COLUMNS) {
    const keyboard = [];
    for (let i = 0; i < buttonsList.length; i += columns) {
        const row = buttonsList.slice(i, i + columns);
        keyboard.push(row);
    }
    return keyboard;
}

// التحقق من اشتراك المستخدم في القنوات
async function checkSubscription(chatId, userId) {
    const channels = loadChannels().channels;
    
    if (!channels.length) {
        return true;
    }
    
    const notSubscribed = [];
    
    for (const channel of channels) {
        try {
            const member = await bot.getChatMember(channel.id, userId);
            if (member.status === 'left' || member.status === 'kicked') {
                notSubscribed.push(channel);
            }
        } catch (error) {
            console.error(`Error checking subscription for channel ${channel.id}:`, error);
            continue;
        }
    }
    
    if (notSubscribed.length) {
        const keyboard = [];
        for (const channel of notSubscribed) {
            const channelId = channel.id;
            const channelName = channel.name;
            const username = channel.username || "";
            
            const url = username ? `https://t.me/${username}` : `https://t.me/c/${String(channelId).replace('-100', '')}`;
            
            keyboard.push([{ text: `انضم إلى ${channelName}`, url }]);
        }
        
        keyboard.push([{ text: "✅ تحقق من الاشتراك", callback_data: "check_subscription" }]);
        
        await bot.sendMessage(chatId, "⚠️ يجب عليك الانضمام إلى القنوات التالية لاستخدام البوت:", {
            reply_markup: { inline_keyboard: keyboard }
        });
        
        return false;
    }
    
    return true;
}

// تطبيق خوارزمية لوهن (Luhn algorithm) للتحقق من صحة رقم البطاقة
function luhnCheck(cardNumber) {
    return luhn.validate(cardNumber);
}

// توليد رقم بطاقة صحيح باستخدام خوارزمية لوهن
function generateValidCard(bin) {
    const length = 16 - bin.length;
    let randomPart = '';
    for (let i = 0; i < length - 1; i++) {
        randomPart += Math.floor(Math.random() * 10);
    }
    
    const baseNumber = bin + randomPart;
    const checksumDigit = luhn.generate(baseNumber);
    const cardNumber = baseNumber + checksumDigit;
    
    return cardNumber;
}

// توليد فيزا حقيقي مع بيانات واقعية
function generateRealisticVisa() {
    const bin = COMMON_VISA_BINS[Math.floor(Math.random() * COMMON_VISA_BINS.length)];
    const cardNumber = generateValidCard(bin);
    const formattedNumber = cardNumber.match(/.{1,4}/g).join(' ');
    
    const currentYear = 2024;
    const month = Math.floor(Math.random() * 12) + 1;
    const year = Math.floor(Math.random() * 6) + currentYear;
    const expiryDate = `${month.toString().padStart(2, '0')}/${year.toString().slice(2)}`;
    
    const cvv = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const firstNames = ["AHMED", "MOHAMMED", "ALI", "OMAR", "KHALED", "HASSAN", "HUSSEIN", "IBRAHIM", "YOUSEF", "ABDULLAH"];
    const lastNames = ["ALI", "HASSAN", "HUSSEIN", "ABDULRAHMAN", "ALSAUD", "ALGHAMDI", "ALOTAIBI", "ALAMRI", "ALSHEHRI", "ALZAHRANI"];
    
    const cardHolder = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    
    return { formattedNumber, expiryDate, cvv, cardHolder };
}

// ترجمة النص إلى الإنجليزية
async function translateToEnglish(text) {
    try {
        const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        const response = await axios.get(translateUrl);
        return response.data[0][0][0];
    } catch (error) {
        console.error("Translation error:", error);
        return text;
    }
}

// إنشاء صورة باستخدام الذكاء الاصطناعي
async function createAiImage(prompt) {
    try {
        const headers = {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9,ar;q=0.8",
            "origin": "https://magicstudio.com",
            "priority": "u=1, i",
            "referer": "https://magicstudio.com/ai-art-generator/",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
        };
        
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('output_format', 'bytes');
        formData.append('user_profile_id', 'null');
        formData.append('user_is_subscribed', 'true');
        
        const response = await axios.post(AI_API_URL, formData, { 
            headers: { ...headers, ...formData.getHeaders() },
            responseType: 'arraybuffer'
        });
        
        return response.data;
    } catch (error) {
        console.error("AI Image generation error:", error);
        throw error;
    }
}

// وظائف إنشاء الفيديو
async function fetchVideoToTemp(prompt) {
    const url = `${VIDEO_API_BASE}?prompt=${encodeURIComponent(prompt)}`;
    
    try {
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
            timeout: 1200000 // 20 دقيقة
        });
        
        const contentType = response.headers['content-type'] || '';
        
        if (contentType.includes('application/json')) {
            const data = response.data;
            const videoUrl = data.url || data.video || data.result || data.data;
            
            if (!videoUrl) {
                throw new Error("❌ ما لكيت رابط فيديو بالـ API response.");
            }
            
            const videoResponse = await axios({
                method: 'get',
                url: videoUrl,
                responseType: 'stream',
                timeout: 1200000
            });
            
            const tempFilePath = path.join(__dirname, `${uuidv4()}.mp4`);
            const writer = fs.createWriteStream(tempFilePath);
            
            videoResponse.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(tempFilePath));
                writer.on('error', reject);
            });
        } else {
            const tempFilePath = path.join(__dirname, `${uuidv4()}.mp4`);
            const writer = fs.createWriteStream(tempFilePath);
            
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(tempFilePath));
                writer.on('error', reject);
            });
        }
    } catch (error) {
        console.error("Video generation error:", error);
        throw error;
    }
}

// وظائف صيد يوزرات انستجرام
async function checkInstagramUser(user) {
    const url = 'https://www.instagram.com/accounts/web_create_ajax/attempt/';
    
    const headers = {
        'Host': 'www.instagram.com',
        'content-length': '85',
        'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="101"',
        'x-ig-app-id': '936619743392459',
        'x-ig-www-claim': '0',
        'sec-ch-ua-mobile': '?0',
        'x-instagram-ajax': '81f3a3c9dfe2',
        'content-type': 'application/x-www-form-urlencoded',
        'accept': '*/*',
        'x-requested-with': 'XMLHttpRequest',
        'x-asbd-id': '198387',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.40 Safari/537.36',
        'x-csrftoken': 'jzhjt4G11O37lW1aDFyFmy1K0yIEN9Qv',
        'sec-ch-ua-platform': '"Linux"',
        'origin': 'https://www.instagram.com',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'referer': 'https://www.instagram.com/accounts/emailsignup/',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-IQ,en;q=0.9',
        'cookie': 'csrftoken=jzhjt4G11O37lW1aDFyFmy1K0yIEN9Qv; mid=YtsQ1gABAAEszHB5wT9VqccwQIUL; ig_did=227CCCC2-3675-4A04-8DA5-BA3195B46425; ig_nrcb=1'
    };
    
    const data = `email=aakmnnsjskksmsnsn%40gmail.com&username=${user}&first_name=&opt_into_one_tap=false`;
    
    try {
        const response = await axios.post(url, data, { headers, timeout: 10000 });
        const responseText = JSON.stringify(response.data);
        
        if (responseText.includes('{"message":"feedback_required","spam":true,')) {
            return false;
        } else if (responseText.includes('"errors": {"username":') || responseText.includes('"code": "username_is_taken"')) {
            return false;
        } else {
            return true;
        }
    } catch (error) {
        console.error(`Error checking user ${user}:`, error);
        return false;
    }
}

function generate4charUsers(count) {
    const users = [];
    for (let i = 0; i < count; i++) {
        if (Math.random() < 0.3) {
            let user = '';
            for (let j = 0; j < 4; j++) {
                user += insta[Math.floor(Math.random() * insta.length)];
            }
            users.push(user);
        } else {
            const numSymbols = Math.floor(Math.random() * 2) + 1;
            const positions = [];
            while (positions.length < numSymbols) {
                const pos = Math.floor(Math.random() * 4);
                if (!positions.includes(pos)) positions.push(pos);
            }
            
            let user = '';
            for (let j = 0; j < 4; j++) {
                if (positions.includes(j)) {
                    user += all_chars[Math.floor(Math.random() * all_chars.length)];
                } else {
                    user += insta[Math.floor(Math.random() * insta.length)];
                }
            }
            users.push(user);
        }
    }
    return users;
}

function generate5charUsers(count) {
    const users = [];
    for (let i = 0; i < count; i++) {
        if (Math.random() < 0.4) {
            let user = '';
            for (let j = 0; j < 5; j++) {
                user += insta[Math.floor(Math.random() * insta.length)];
            }
            users.push(user);
        } else {
            const numSymbols = Math.floor(Math.random() * 3) + 1;
            const positions = [];
            while (positions.length < numSymbols) {
                const pos = Math.floor(Math.random() * 5);
                if (!positions.includes(pos)) positions.push(pos);
            }
            
            let user = '';
            for (let j = 0; j < 5; j++) {
                if (positions.includes(j)) {
                    user += all_chars[Math.floor(Math.random() * all_chars.length)];
                } else {
                    user += insta[Math.floor(Math.random() * insta.length)];
                }
            }
            users.push(user);
        }
    }
    return users;
}

function generateSpecialUsers(count, length = 6) {
    const users = [];
    for (let i = 0; i < count; i++) {
        if (Math.random() < 0.2) {
            let user = '';
            for (let j = 0; j < length; j++) {
                user += insta[Math.floor(Math.random() * insta.length)];
            }
            users.push(user);
        } else {
            const numSymbols = Math.floor(Math.random() * 3) + 2;
            const positions = [];
            while (positions.length < numSymbols) {
                const pos = Math.floor(Math.random() * length);
                if (!positions.includes(pos)) positions.push(pos);
            }
            
            let user = '';
            for (let j = 0; j < length; j++) {
                if (positions.includes(j)) {
                    user += all_chars[Math.floor(Math.random() * all_chars.length)];
                } else {
                    user += insta[Math.floor(Math.random() * insta.length)];
                }
            }
            users.push(user);
        }
    }
    return users;
}

function generateEasy4charUsers(count) {
    const users = [];
    for (let i = 0; i < count; i++) {
        if (Math.random() < 0.1) {
            let user = '';
            for (let j = 0; j < 4; j++) {
                user += insta[Math.floor(Math.random() * insta.length)];
            }
            users.push(user);
        } else {
            const positions = [];
            while (positions.length < 2) {
                const pos = Math.floor(Math.random() * 4);
                if (!positions.includes(pos)) positions.push(pos);
            }
            
            let user = '';
            for (let j = 0; j < 4; j++) {
                if (positions.includes(j)) {
                    user += all_chars[Math.floor(Math.random() * all_chars.length)];
                } else {
                    user += insta[Math.floor(Math.random() * insta.length)];
                }
            }
            users.push(user);
        }
    }
    return users;
}

async function checkUsersBatch(users) {
    const goodUsers = [];
    for (const user of users) {
        if (await checkInstagramUser(user)) {
            goodUsers.push(user);
            if (goodUsers.length >= 5) break;
        }
    }
    return goodUsers;
}

async function instagramCheckProcess(chatId, userType) {
    user_sessions[chatId] = true;
    let totalChecked = 0;
    let foundUsers = 0;
    
    const typeName = userType === "5char" ? "خماسية" : 
                    userType === "4char" ? "رباعية" : 
                    userType === "easy4char" ? "رباعية سهلة" : "خاصة";
    
    await bot.sendMessage(chatId, `🔍 بدء البحث عن 5 يوزرات ${typeName} متاحة...`);
    
    while (user_sessions[chatId] && foundUsers < 5) {
        let usersBatch;
        if (userType === "5char") {
            usersBatch = generate5charUsers(15);
        } else if (userType === "4char") {
            usersBatch = generate4charUsers(15);
        } else if (userType === "easy4char") {
            usersBatch = generateEasy4charUsers(15);
        } else {
            usersBatch = generateSpecialUsers(15);
        }
        
        const goodUsers = await checkUsersBatch(usersBatch);
        totalChecked += usersBatch.length;
        
        if (!good_users_cache[chatId]) {
            good_users_cache[chatId] = [];
        }
        
        for (const user of goodUsers) {
            if (!good_users_cache[chatId].includes(user)) {
                good_users_cache[chatId].push(user);
                foundUsers++;
                
                const symbolCount = user.split('').filter(char => all_chars.includes(char)).length;
                let userTypeDesc = "";
                if (symbolCount === 0) {
                    userTypeDesc = "بدون رموز";
                } else if (symbolCount === 1) {
                    userTypeDesc = "برمز واحد";
                } else if (symbolCount === 2) {
                    userTypeDesc = "برمزين";
                } else {
                    userTypeDesc = `ب${symbolCount} رموز`;
                }
                
                const message = `✅ يوزر Instagram متاح!

📝 اليوزر: \`${user}\`
🔢 النوع: ${typeName} (${userTypeDesc})
🎯 الحاية: متاح للتسجيل

💾 اليوزر ${foundUsers} من 5`;
                
                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                
                if (foundUsers >= 5) break;
            }
        }
        
        if (foundUsers >= 5) break;
    }
    
    let finalMessage;
    if (foundUsers > 0) {
        const usersList = good_users_cache[chatId].slice(-foundUsers).map(user => `• \`${user}\``).join('\n');
        finalMessage = `🎉 تم العثور على ${foundUsers} يوزر متاح!

${usersList}

📊 إجمالي المفحوصة: ${totalChecked}`;
    } else {
        finalMessage = `❌ لم يتم العثور على يوزرات متاحة

📊 إجمالي المفحوصة: ${totalChecked}`;
    }
    
    await bot.sendMessage(chatId, finalMessage, { parse_mode: 'Markdown' });
    user_sessions[chatId] = false;
}

// دالة جلب معلومات تيك توك
async function getTikTokInfo(username) {
    const apiUrl = `https://tik-batbyte.vercel.app/tiktok?username=${username}`;
    try {
        const response = await axios.get(apiUrl, { timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error("TikTok API error:", error);
        return {};
    }
}

// فحص الملف باستخدام VirusTotal
async function checkFileWithVirusTotal(fileBuffer, fileName) {
    try {
        const formData = new FormData();
        formData.append('file', fileBuffer, fileName);
        
        const headers = {
            'x-apikey': VIRUSTOTAL_API_KEY,
            ...formData.getHeaders()
        };
        
        const uploadUrl = "https://www.virustotal.com/api/v3/files";
        const uploadResponse = await axios.post(uploadUrl, formData, { headers });
        const analysisId = uploadResponse.data.data.id;
        
        const analysisUrl = `https://www.virustotal.com/api/v3/analyses/${analysisId}`;
        let result;
        let status;
        
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const analysisResponse = await axios.get(analysisUrl, { headers });
            result = analysisResponse.data;
            status = result.data.attributes.status;
            if (status === "completed") break;
        }
        
        const stats = result.data.attributes.stats;
        const malicious = stats.malicious || 0;
        const suspicious = stats.suspicious || 0;
        const harmless = stats.harmless || 0;
        const undetected = stats.undetected || 0;
        const sha256 = result.meta.file_info.sha256;
        
        return {
            malicious,
            suspicious,
            harmless,
            undetected,
            sha256,
            success: true
        };
    } catch (error) {
        console.error("VirusTotal error:", error);
        return { success: false, error: error.message };
    }
}

// وظائف سحب ملفات الموقع
async function cleanupSiteFiles(zipPath, folderPath) {
    await new Promise(resolve => setTimeout(resolve, 180000));
    try {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        if (fs.existsSync(folderPath)) fs.rmSync(folderPath, { recursive: true });
    } catch (error) {
        console.error("Error cleaning up site files:", error);
    }
}

async function downloadSiteSimple(url, folder) {
    try {
        if (fs.existsSync(folder)) {
            fs.rmSync(folder, { recursive: true });
        }
        fs.mkdirSync(folder, { recursive: true });
        
        const response = await axios.get(url, { timeout: 30000 });
        const parsedUrl = new URL(url);
        let filename = path.basename(parsedUrl.pathname);
        
        if (!filename || !path.extname(filename)) {
            filename = "index.html";
        }
        
        const mainFile = path.join(folder, filename);
        fs.writeFileSync(mainFile, response.data, 'utf8');
        
        return true;
    } catch (error) {
        console.error("Error downloading site:", error);
        return false;
    }
}

async function zipFolderSite(folder, zipName) {
    const zip = new JSZip();
    const files = await fs.readdir(folder, { recursive: true });
    
    for (const file of files) {
        const filePath = path.join(folder, file);
        if ((await fs.stat(filePath)).isFile()) {
            const fileData = await fs.readFile(filePath);
            zip.file(file, fileData);
        }
    }
    
    const zipData = await zip.generateAsync({ type: 'nodebuffer' });
    await fs.writeFile(zipName, zipData);
}

// إنشاء لوحة المفاتيح الرئيسية مع الترتيب المطلوب
function createMainKeyboard(userId) {
    const data = loadData();
    const keyboard = [];
    
    // إضافة أزرار المواقع أولاً
    const buttonsList = data.buttons.map(btn => ({
        text: btn.text,
        web_app: { url: btn.url }
    }));
    
    if (buttonsList.length) {
        keyboard.push(...arrangeButtonsInColumns(buttonsList));
    }
    
    // إضافة أزرار الخدمات حسب الترتيب المحدد
    const servicesOrder = data.services_order || [
        "translation", "visa", "image", "video", "tiktok", 
        "file_check", "site_download", "shortener", "insta_info"
    ];
    
    const serviceButtons = servicesOrder.map(service => {
        switch (service) {
            case "translation":
                return { text: "خدمة الترجمة 🌐", callback_data: "translation_service" };
            case "visa":
                return { text: "توليد فيزا 💳", callback_data: "generate_visa" };
            case "image":
                return { text: "إنشاء صورة 🎨", callback_data: "generate_image" };
            case "video":
                return { text: "إنشاء فيديو 🎬", callback_data: "generate_video" };
            case "tiktok":
                return { text: "معلومات تيك توك 📱", callback_data: "tiktok_service" };
            case "file_check":
                return { text: "فحص الملفات 🔍", callback_data: "file_check_service" };
            case "site_download":
                return { text: "سحب ملفات الموقع 🌐", callback_data: "site_download_service" };
            case "shortener":
                return { text: "اختصار الروابط 🔗", callback_data: "shortener_service" };
            case "insta_info":
                return { text: "معلومات انستجرام 📷", callback_data: "insta_info_service" };
        }
    });
    
    if (serviceButtons.length) {
        keyboard.push(...arrangeButtonsInColumns(serviceButtons));
    }
    
    // إضافة الأزرار الثابتة الجديدة
    keyboard.push([{ text: "صيد يوزرات انستا 🎯", callback_data: "instagram_hunt" }]);
    keyboard.push([{ text: "المزيد من المميزات 🦾", url: "https://t.me/VIP_H3bot" }]);
    keyboard.push([{ text: "مطور البوت 👑", url: `https://t.me/${DEVELOPER_USERNAME.replace('@', '')}` }]);
    
    // إضافة زر الإدارة للمشرف فقط
    if (isAdmin(userId)) {
        keyboard.push([{ text: "الإدارة ⚙️", callback_data: "admin_panel" }]);
    }
    
    return { inline_keyboard: keyboard };
}

// أمر البدء
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!await checkSubscription(chatId, userId)) {
        return;
    }
    
    const replyMarkup = createMainKeyboard(userId);
    
    await bot.sendMessage(chatId, "مرحباً! يمكنك التمتع بالخدمات واختيار ما يناسبك من الخيارات المتاحة:", {
        reply_markup: replyMarkup
    });
});

// معالجة استدعاءات الأزرار
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    try {
        await bot.answerCallbackQuery(callbackQuery.id);
        
        if (data === 'check_subscription') {
            if (await checkSubscription(chatId, userId)) {
                await bot.editMessageText("✅ أنت مشترك في جميع القنوات! يمكنك الآن استخدام البوت.", {
                    chat_id: chatId,
                    message_id: message.message_id
                });
            }
            return;
        }
        
        // التحقق من الاشتراك أولاً
        if (!await checkSubscription(chatId, userId)) {
            return;
        }
        
        // معالجة الأزرار المختلفة
        switch (data) {
            case 'generate_visa':
                const { formattedNumber, expiryDate, cvv, cardHolder } = generateRealisticVisa();
                await bot.sendMessage(chatId, 
                    `💳 **بطاقة فيزا محاكاة:**\n\n**الرقم:** \`${formattedNumber}\`\n**تاريخ الانتهاء:** \`${expiryDate}\`\n**CVV:** \`${cvv}\`\n**حامل البطاقة:** \`${cardHolder}\`\n\n`,
                    { parse_mode: 'Markdown' }
                );
                break;
                
            case 'generate_image':
                await bot.editMessageText("🎨 **إنشاء صورة بالذكاء الاصطناعي**\n\nأرسل لي وصفاً للصورة التي تريد إنشاءها.\n\nمثال:\n• منظر غروب الشمس على البحر\n• قطة لطيفة تجلس في الحديقة\n• منزل حديث في الغابة\n\nأرسل الوصف الآن:", {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                user_sessions[chatId] = { action: 'generate_image' };
                break;
                
            case 'generate_video':
                await bot.editMessageText("🎬 **إنشاء فيديو بالذكاء الاصطناعي**\n\nأرسل لي وصفاً للفيديو الذي تريد إنشاءه.\n\nمثال:\n• فيديو لشخص يركض على الشاطئ\n• فيديو لسيارة تسير في طريق جبلي\n• فيديو لطائرة تحلق في السماء\n\nأرسل الوصف الآن:", {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                user_sessions[chatId] = { action: 'generate_video' };
                break;
                
            case 'tiktok_service':
                await bot.editMessageText("📱 **معلومات حساب تيك توك**\n\nأرسل اسم المستخدم الخاص بحساب تيك توك الذي تريد معلومات عنه:", {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                user_sessions[chatId] = { action: 'tiktok_info' };
                break;
                
            case 'file_check_service':
                await bot.editMessageText("🔍 **فحص الملفات مع VirusTotal**\n\nأرسل الملف الذي تريد فحصه (حتى 32 ميجابايت):", {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                user_sessions[chatId] = { action: 'file_check' };
                break;
                
            case 'site_download_service':
                await bot.editMessageText("🌐 **سحب ملفات الموقع**\n\nأرسل رابط الموقع الذي تريد سحب ملفاته:", {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                user_sessions[chatId] = { action: 'site_download' };
                break;
                
            case 'shortener_service':
                await bot.editMessageText("🔗 **اختصار الروابط**\n\nأرسل الرابط الذي تريد اختصاره:", {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                user_sessions[chatId] = { action: 'shortener' };
                break;
                
            case 'insta_info_service':
                await bot.editMessageText("📷 **معلومات حساب انستجرام**\n\nأرسل اسم المستخدم الخاص بحساب انستجرام الذي تريد معلومات عنه:", {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                user_sessions[chatId] = { action: 'insta_info' };
                break;
                
            case 'translation_service':
                await bot.editMessageText("🌐 **خدمة الترجمة**\n\nاختر لغة الترجمة:", {
                    chat_id: chatId,
                    message_id: message.message_id,
                    reply_markup: {
                        inline_keyboard: [
                            ...Object.keys(SUPPORTED_LANGUAGES).map(lang => [{ text: lang, callback_data: `translation_${SUPPORTED_LANGUAGES[lang]}` }])
                        ]
                    },
                    parse_mode: 'Markdown'
                });
                break;
                
            case 'instagram_hunt':
                await bot.editMessageText("🎯 **صيد يوزرات انستجرام**\n\nاختر نوع اليوزرات التي تريد البحث عنها:", {
                    chat_id: chatId,
                    message_id: message.message_id,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "يوزرات رباعية", callback_data: "hunt_4char" }],
                            [{ text: "يوزرات خماسية", callback_data: "hunt_5char" }],
                            [{ text: "يوزرات رباعية سهلة", callback_data: "hunt_easy4char" }],
                            [{ text: "يوزرات خاصة", callback_data: "hunt_special" }]
                        ]
                    },
                    parse_mode: 'Markdown'
                });
                break;
                
            case 'hunt_4char':
                await bot.editMessageText("🔍 بدأ البحث عن يوزرات رباعية...", {
                    chat_id: chatId,
                    message_id: message.message_id
                });
                instagramCheckProcess(chatId, "4char");
                break;
                
            case 'hunt_5char':
                await bot.editMessageText("🔍 بدأ البحث عن يوزرات خماسية...", {
                    chat_id: chatId,
                    message_id: message.message_id
                });
                instagramCheckProcess(chatId, "5char");
                break;
                
            case 'hunt_easy4char':
                await bot.editMessageText("🔍 بدأ البحث عن يوزرات رباعية سهلة...", {
                    chat_id: chatId,
                    message_id: message.message_id
                });
                instagramCheckProcess(chatId, "easy4char");
                break;
                
            case 'hunt_special':
                await bot.editMessageText("🔍 بدأ البحث عن يوزرات خاصة...", {
                    chat_id: chatId,
                    message_id: message.message_id
                });
                instagramCheckProcess(chatId, "special");
                break;
                
            case 'admin_panel':
                if (!isAdmin(userId)) {
                    await bot.sendMessage(chatId, "❌ ليس لديك صلاحية الوصول إلى لوحة الإدارة.");
                    return;
                }
                
                await bot.editMessageText("⚙️ **لوحة إدارة البوت**\n\nاختر الإجراء الذي تريد تنفيذه:", {
                    chat_id: chatId,
                    message_id: message.message_id,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "إضافة زر موقع", callback_data: "admin_add_button" }],
                            [{ text: "إزالة زر موقع", callback_data: "admin_remove_button" }],
                            [{ text: "إضافة قناة اشتراك", callback_data: "admin_add_channel" }],
                            [{ text: "إزالة قناة اشتراك", callback_data: "admin_remove_channel" }],
                            [{ text: "تغيير ترتيب الخدمات", callback_data: "admin_reorder_services" }],
                            [{ text: "العودة", callback_data: "back_to_main" }]
                        ]
                    },
                    parse_mode: 'Markdown'
                });
                break;
                
            case 'back_to_main':
                const replyMarkup = createMainKeyboard(userId);
                await bot.editMessageText("مرحباً! يمكنك التمتع بالخدمات واختيار ما يناسبك من الخيارات المتاحة:", {
                    chat_id: chatId,
                    message_id: message.message_id,
                    reply_markup: replyMarkup
                });
                break;
                
            default:
                if (data.startsWith('translation_')) {
                    const langCode = data.replace('translation_', '');
                    const langName = Object.keys(SUPPORTED_LANGUAGES).find(key => SUPPORTED_LANGUAGES[key] === langCode);
                    
                    user_sessions[chatId] = { action: 'translation', lang: langCode };
                    
                    await bot.editMessageText(`🌐 **ترجمة إلى ${langName}**\n\nأرسل النص الذي تريد ترجمته إلى ${langName}:`, {
                        chat_id: chatId,
                        message_id: message.message_id,
                        parse_mode: 'Markdown'
                    });
                }
                break;
        }
    } catch (error) {
        console.error("Error handling callback query:", error);
    }
});

// معالجة الرسائل النصية
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    if (!text || msg.chat.type !== 'private') return;
    
    // التحقق من الاشتراك أولاً
    if (!await checkSubscription(chatId, userId)) {
        return;
    }
    
    // معالجة الرسائل بناءً على حالة المستخدم
    if (user_sessions[chatId]) {
        const session = user_sessions[chatId];
        
        try {
            switch (session.action) {
                case 'generate_image':
                    await bot.sendMessage(chatId, "⏳ جاري إنشاء صورتك...");
                    
                    try {
                        const imageBuffer = await createAiImage(text);
                        await bot.sendPhoto(chatId, imageBuffer, {
                            caption: "🎨 صورتك جاهزة!\n\nتم إنشاء الصورة باستخدام الذكاء الاصطناعي بناءً على وصفك."
                        });
                    } catch (error) {
                        console.error("Image generation error:", error);
                        await bot.sendMessage(chatId, "❌ حدث خطأ أثناء إنشاء الصورة. يرجى المحاولة مرة أخرى لاحقاً.");
                    }
                    
                    delete user_sessions[chatId];
                    break;
                    
                case 'generate_video':
                    await bot.sendMessage(chatId, "⏳ جاري إنشاء الفيديو...\n\nقد تستغرق هذه العملية بعض الوقت (حتى 20 دقيقة).");
                    
                    try {
                        const videoPath = await fetchVideoToTemp(text);
                        await bot.sendVideo(chatId, videoPath, {
                            caption: "🎬 الفيديو جاهز!\n\nتم إنشاء الفيديو باستخدام الذكاء الاصطناعي بناءً على وصفك."
                        });
                        
                        // تنظيف الملف المؤقت
                        fs.unlinkSync(videoPath);
                    } catch (error) {
                        console.error("Video generation error:", error);
                        await bot.sendMessage(chatId, "❌ حدث خطأ أثناء إنشاء الفيديو. يرجى المحاولة مرة أخرى لاحقاً.");
                    }
                    
                    delete user_sessions[chatId];
                    break;
                    
                case 'tiktok_info':
                    await bot.sendMessage(chatId, "⏳ جاري جلب معلومات حساب تيك توك...");
                    
                    try {
                        const tiktokInfo = await getTikTokInfo(text);
                        
                        if (tiktokInfo && tiktokInfo.user) {
                            const user = tiktokInfo.user;
                            const stats = user.stats || {};
                            
                            let message = `📱 **معلومات حساب تيك توك**\n\n`;
                            message += `👤 **اسم المستخدم:** ${user.uniqueId || 'غير متوفر'}\n`;
                            message += `📛 **الاسم:** ${user.nickname || 'غير متوفر'}\n`;
                            message += `📝 **البايو:** ${user.signature || 'غير متوفر'}\n\n`;
                            
                            message += `📊 **الإحصائيات:**\n`;
                            message += `• المتابعون: ${stats.followerCount || 0}\n`;
                            message += `• المتابَعون: ${stats.followingCount || 0}\n`;
                            message += `• عدد الإعجابات: ${stats.heartCount || 0}\n`;
                            message += `• عدد الفيديوهات: ${stats.videoCount || 0}\n\n`;
                            
                            message += `✅ **الحساب:** ${user.verified ? 'موثق' : 'غير موثق'}\n`;
                            message += `🔒 **الحساب:** ${user.privateAccount ? 'خاص' : 'عام'}\n`;
                            
                            if (user.avatarLarger) {
                                await bot.sendPhoto(chatId, user.avatarLarger, { caption: message, parse_mode: 'Markdown' });
                            } else {
                                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                            }
                        } else {
                            await bot.sendMessage(chatId, "❌ لم أتمكن من العثور على معلومات لهذا الحساب. يرجى التأكد من اسم المستخدم والمحاولة مرة أخرى.");
                        }
                    } catch (error) {
                        console.error("TikTok info error:", error);
                        await bot.sendMessage(chatId, "❌ حدث خطأ أثناء جلب معلومات الحساب. يرجى المحاولة مرة أخرى لاحقاً.");
                    }
                    
                    delete user_sessions[chatId];
                    break;
                    
                case 'insta_info':
                    await bot.sendMessage(chatId, "⏳ جاري جلب معلومات حساب انستجرام...");
                    
                    try {
                        const response = await axios.get(`${INSTA_INFO_API}${text}`);
                        const userInfo = response.data;
                        
                        if (userInfo && userInfo.graphql && userInfo.graphql.user) {
                            const user = userInfo.graphql.user;
                            
                            let message = `📷 **معلومات حساب انستجرام**\n\n`;
                            message += `👤 **اسم المستخدم:** ${user.username || 'غير متوفر'}\n`;
                            message += `📛 **الاسم الكامل:** ${user.full_name || 'غير متوفر'}\n`;
                            message += `📝 **البايو:** ${user.biography || 'غير متوفر'}\n\n`;
                            
                            message += `📊 **الإحصائيات:**\n`;
                            message += `• المتابعون: ${user.edge_followed_by?.count || 0}\n`;
                            message += `• المتابَعون: ${user.edge_follow?.count || 0}\n`;
                            message += `• عدد المنشورات: ${user.edge_owner_to_timeline_media?.count || 0}\n\n`;
                            
                            message += `✅ **الحساب:** ${user.is_verified ? 'موثق' : 'غير موثق'}\n`;
                            message += `🔒 **الحساب:** ${user.is_private ? 'خاص' : 'عام'}\n`;
                            
                            if (user.profile_pic_url_hd) {
                                await bot.sendPhoto(chatId, user.profile_pic_url_hd, { caption: message, parse_mode: 'Markdown' });
                            } else {
                                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                            }
                        } else {
                            await bot.sendMessage(chatId, "❌ لم أتمكن من العثور على معلومات لهذا الحساب. يرجى التأكد من اسم المستخدم والمحاولة مرة أخرى.");
                        }
                    } catch (error) {
                        console.error("Instagram info error:", error);
                        await bot.sendMessage(chatId, "❌ حدث خطأ أثناء جلب معلومات الحساب. يرجى المحاولة مرة أخرى لاحقاً.");
                    }
                    
                    delete user_sessions[chatId];
                    break;
                    
                case 'shortener':
                    await bot.sendMessage(chatId, "⏳ جاري اختصار الرابط...");
                    
                    try {
                        const shortUrl = await axios.get(`${SHORTENER_API}${encodeURIComponent(text)}`);
                        await bot.sendMessage(chatId, `🔗 **تم اختصار الرابط بنجاح!**\n\nالرابط الأصلي: ${text}\n\nالرابط المختصر: ${shortUrl.data}`);
                    } catch (error) {
                        console.error("URL shortening error:", error);
                        await bot.sendMessage(chatId, "❌ حدث خطأ أثناء اختصار الرابط. يرجى المحاولة مرة أخرى لاحقاً.");
                    }
                    
                    delete user_sessions[chatId];
                    break;
                    
                case 'translation':
                    await bot.sendMessage(chatId, "⏳ جاري الترجمة...");
                    
                    try {
                        const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${session.lang}&dt=t&q=${encodeURIComponent(text)}`;
                        const response = await axios.get(translateUrl);
                        const translatedText = response.data[0][0][0];
                        
                        await bot.sendMessage(chatId, `🌐 **تمت الترجمة بنجاح!**\n\nالنص الأصلي:\n${text}\n\nالنص المترجم:\n${translatedText}`);
                    } catch (error) {
                        console.error("Translation error:", error);
                        await bot.sendMessage(chatId, "❌ حدث خطأ أثناء الترجمة. يرجى المحاولة مرة أخرى لاحقاً.");
                    }
                    
                    delete user_sessions[chatId];
                    break;
                    
                case 'site_download':
                    await bot.sendMessage(chatId, "⏳ جاري سحب ملفات الموقع...");
                    
                    try {
                        const folderPath = path.join(__dirname, DOWNLOAD_FOLDER);
                        const zipPath = path.join(__dirname, ZIP_FILE_NAME);
                        
                        const success = await downloadSiteSimple(text, folderPath);
                        
                        if (success) {
                            await zipFolderSite(folderPath, zipPath);
                            
                            await bot.sendDocument(chatId, zipPath, {
                                caption: `🌐 **تم سحب ملفات الموقع بنجاح!**\n\nرابط الموقع: ${text}`
                            });
                            
                            // تنظيف الملفات بعد 3 دقائق
                            setTimeout(() => cleanupSiteFiles(zipPath, folderPath), 180000);
                        } else {
                            await bot.sendMessage(chatId, "❌ حدث خطأ أثناء سحب ملفات الموقع. يرجى التأكد من الرابط والمحاولة مرة أخرى.");
                        }
                    } catch (error) {
                        console.error("Site download error:", error);
                        await bot.sendMessage(chatId, "❌ حدث خطأ أثناء سحب ملفات الموقع. يرجى المحاولة مرة أخرى لاحقاً.");
                    }
                    
                    delete user_sessions[chatId];
                    break;
            }
        } catch (error) {
            console.error("Error processing message:", error);
            await bot.sendMessage(chatId, "❌ حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.");
            delete user_sessions[chatId];
        }
    }
});

// معالجة الملفات المرسلة
bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!await checkSubscription(chatId, userId)) {
        return;
    }
    
    if (user_sessions[chatId] && user_sessions[chatId].action === 'file_check') {
        const fileId = msg.document.file_id;
        const fileName = msg.document.file_name;
        const fileSize = msg.document.file_size;
        
        if (fileSize > 32 * 1024 * 1024) {
            await bot.sendMessage(chatId, "❌ حجم الملف كبير جداً. الحد الأقصى هو 32 ميجابايت.");
            delete user_sessions[chatId];
            return;
        }
        
        await bot.sendMessage(chatId, "⏳ جاري فحص الملف مع VirusTotal...\n\nقد تستغرق هذه العملية بضع دقائق.");
        
        try {
            const fileStream = bot.getFileStream(fileId);
            const chunks = [];
            
            for await (const chunk of fileStream) {
                chunks.push(chunk);
            }
            
            const fileBuffer = Buffer.concat(chunks);
            const result = await checkFileWithVirusTotal(fileBuffer, fileName);
            
            if (result.success) {
                let message = `🔍 **نتيجة فحص الملف**\n\n`;
                message += `📄 **اسم الملف:** ${fileName}\n`;
                message += `🔢 **SHA256:** \`${result.sha256}\`\n\n`;
                message += `📊 **نتيجة الفحص:**\n`;
                message += `✅ غير ضار: ${result.harmless}\n`;
                message += `⚠️ مشبوه: ${result.suspicious}\n`;
                message += `❌ ضار: ${result.malicious}\n`;
                message += `🔍 غير مكتشف: ${result.undetected}\n\n`;
                
                if (result.malicious > 0) {
                    message += `🚨 **تحذير:** هذا الملف تم الإبلاغ عنه كملف ضار من قبل ${result.malicious} من مضادات الفيروسات!`;
                } else if (result.suspicious > 0) {
                    message += `⚠️ **ملاحظة:** هذا الملف تم الإبلاغ عنه كمشبوه من قبل ${result.suspicious} من مضادات الفيروسات.`;
                } else {
                    message += `✅ **آمن:** لم يتم الإبلاغ عن هذا الملف كملف ضار من قبل أي مضاد فيروسات.`;
                }
                
                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            } else {
                await bot.sendMessage(chatId, "❌ حدث خطأ أثناء فحص الملف. يرجى المحاولة مرة أخرى لاحقاً.");
            }
        } catch (error) {
            console.error("File check error:", error);
            await bot.sendMessage(chatId, "❌ حدث خطأ أثناء فحص الملف. يرجى المحاولة مرة أخرى لاحقاً.");
        }
        
        delete user_sessions[chatId];
    }
});

// إعداد خادم Express
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('Telegram Bot is running!');
});

app.listen(port, () => {
    console.log(`Express server running on port ${port}`);
});

console.log('Bot is running...');