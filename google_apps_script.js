// ================================================================
// CẤU HÌNH HỆ THỐNG IPAVIET (Thay đổi trực tiếp tại đây)
// ================================================================
var SECRET_ADMIN_PASS = "200912aB"; 
var TELEGRAM_TOKEN = "7986654042:AAHHbevmrLVmWSJ5dXIsQssUmRM5tPQWQjk"; 
var ADMIN_CHAT_ID = "8103429932"; 
var STC_TOKEN = "8a4d9ebc657c330a53de1062c1f91090"; 

// --- CẤU HÌNH API MỚI (BESTIESTUDIO / BEARS MARKET) ---
var KINGMMO_API_KEY = "sk_live_2ffd83c3355cdf4259715110be62b2ec";
var KINGMMO_API_SECRET = "sk_secret_b7734ac7fd3339e1511843864cfa78fd8432c98410ca6414cc961af43a75b505";
var KINGMMO_BASE_URL = "https://www.bestiestudio.com/api/v1"; 

// Hàm hỗ trợ gửi Telegram an toàn
function sendTelegramMsg(msg) {
  try {
    if (!TELEGRAM_TOKEN || !ADMIN_CHAT_ID) return;
    var url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage";
    UrlFetchApp.fetch(url, { 
      "method": "post", 
      "contentType": "application/json", 
      "payload": JSON.stringify({
        "chat_id": ADMIN_CHAT_ID, 
        "text": msg, 
        "parse_mode": "Markdown"
      }), 
      "muteHttpExceptions": true 
    });
  } catch(e) {
    // Bỏ qua lỗi gửi tin nhắn để không làm sập luồng chính
  }
}

// ===================================================================
// HÀM HỖ TRỢ GỬI THÔNG BÁO PUSH HÀNG LOẠT (EXPO PUSH API V2)
// ===================================================================
function sendPushToAll(title, body, url) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetTokens = ss.getSheetByName("PushTokens");
  if (!sheetTokens) return { success: false, error: "Không tìm thấy bảng PushTokens" };
  
  var dataTokens = sheetTokens.getDataRange().getValues();
  var tokens = [];
  for (var i = 1; i < dataTokens.length; i++) {
    if (dataTokens[i][0]) {
      tokens.push(dataTokens[i][0]);
    }
  }
  
  if (tokens.length === 0) {
    return { success: true, count: 0, message: "Không có thiết bị đăng ký" };
  }
  
  var chunkSize = 100;
  var sentCount = 0;
  
  for (var i = 0; i < tokens.length; i += chunkSize) {
    var chunk = tokens.slice(i, i + chunkSize);
    var messages = chunk.map(function(token) {
      return {
        to: token,
        sound: "default",
        title: title,
        body: body,
        data: url ? { installUrl: url } : {}
      };
    });
    
    try {
      var response = UrlFetchApp.fetch("https://exp.host/--/api/v2/push/send", {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(messages),
        "muteHttpExceptions": true
      });
      
      if (response.getResponseCode() === 200) {
        sentCount += chunk.length;
      }
    } catch(err) {
      // Bỏ qua lỗi lô này để chạy tiếp
    }
  }
  
  return { success: true, count: sentCount, total: tokens.length };
}

// ===================================================================
// TRIGGER HẸN GIỜ: CHẠY ĐỂ QUÉT VÀ GỬI THÔNG BÁO TỚI GIỜ HẸN
// (Cần tạo trigger chạy tự động mỗi 5 hoặc 10 phút)
// ===================================================================
function checkAndSendScheduledPushes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetScheduled = ss.getSheetByName("ScheduledPushes");
  if (!sheetScheduled) return;
  
  var dataScheduled = sheetScheduled.getDataRange().getValues();
  var now = new Date().getTime();
  
  for (var i = 1; i < dataScheduled.length; i++) {
    var status = dataScheduled[i][5];
    if (status === "PENDING") {
      var scheduledTimeStr = dataScheduled[i][4];
      var scheduledTime = new Date(scheduledTimeStr).getTime();
      
      if (!isNaN(scheduledTime) && scheduledTime <= now) {
        var row = i + 1;
        // Đánh dấu SENDING tránh gửi trùng lặp
        sheetScheduled.getRange(row, 6).setValue("SENDING");
        SpreadsheetApp.flush();
        
        var title = dataScheduled[i][1];
        var body = dataScheduled[i][2];
        var url = dataScheduled[i][3];
        
        var result = sendPushToAll(title, body, url);
        if (result.success) {
          sheetScheduled.getRange(row, 6).setValue("SENT");
        } else {
          sheetScheduled.getRange(row, 6).setValue("FAILED: " + (result.error || "Lỗi"));
        }
      }
    }
  }
}

function doGet(e) {
  var output = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  
  try {
    var action = e ? e.parameter.action : null;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetThuNgan = ss.getSheetByName("ThuNgan") || ss.getSheets()[0];
    var sheetDonMMO = ss.getSheetByName("DonMMO");
    var sheetConfigMMO = ss.getSheetByName("ConfigMMO");

    // =========================================================
    // TỰ ĐỘNG TẠO SHEET CERTAPPLE, COUPONS, PUSHTOKENS & SCHEDULEDPUSHES NẾU CHƯA CÓ
    // =========================================================
    var sheetCertApple = ss.getSheetByName("CERTAPPLE");
    if (!sheetCertApple) {
      sheetCertApple = ss.insertSheet("CERTAPPLE");
      sheetCertApple.appendRow(["Mã Đơn", "UID Khách", "Mã Gói", "Số Lượng", "Trạng Thái", "Mã UDID", "Thời Gian", "Tên Gói", "Tổng Tiền", "Thanh Toán"]);
      sheetCertApple.setFrozenRows(1);
      sheetCertApple.getRange("A1:J1").setFontWeight("bold");
    }

    var sheetCoupons = ss.getSheetByName("COUPONS");
    if (!sheetCoupons) {
      sheetCoupons = ss.insertSheet("COUPONS");
      sheetCoupons.appendRow(["Mã Code", "Loại (PERCENT/CASH)", "Giá Trị Giảm", "Trạng Thái (ACTIVE/OFF)", "Mô Tả"]);
      sheetCoupons.appendRow(["KM23", "PERCENT", "10", "ACTIVE", "Giảm 10% tổng đơn"]); 
      sheetCoupons.setFrozenRows(1);
      sheetCoupons.getRange("A1:E1").setFontWeight("bold");
    }
    
    var sheetTokens = ss.getSheetByName("PushTokens");
    if (!sheetTokens) {
      sheetTokens = ss.insertSheet("PushTokens");
      sheetTokens.appendRow(["Token", "UID", "Platform", "Updated At"]);
      sheetTokens.setFrozenRows(1);
      sheetTokens.getRange("A1:D1").setFontWeight("bold");
    }
    
    var sheetScheduled = ss.getSheetByName("ScheduledPushes");
    if (!sheetScheduled) {
      sheetScheduled = ss.insertSheet("ScheduledPushes");
      sheetScheduled.appendRow(["ID", "Title", "Body", "Action URL", "Scheduled Time", "Status", "Created At"]);
      sheetScheduled.setFrozenRows(1);
      sheetScheduled.getRange("A1:G1").setFontWeight("bold");
    }

    // =========================================================
    // ĐĂNG KÝ VÀ KIỂM TRA THÔNG BÁO PUSH
    // =========================================================
    if (action === 'register_push_token') {
      var token = e.parameter.token;
      var uid = e.parameter.uid || "";
      var platform = e.parameter.platform || "";
      if (!token) return output.setContent(JSON.stringify({ success: false, error: "Thiếu Token" }));
      
      var dataTokens = sheetTokens.getDataRange().getValues();
      var foundRow = -1;
      for (var i = 1; i < dataTokens.length; i++) {
        if (dataTokens[i][0] === token) {
          foundRow = i + 1;
          break;
        }
      }
      
      var nowStr = new Date().toISOString();
      if (foundRow !== -1) {
        sheetTokens.getRange(foundRow, 2, 1, 3).setValues([[uid, platform, nowStr]]);
      } else {
        sheetTokens.appendRow([token, uid, platform, nowStr]);
      }
      return output.setContent(JSON.stringify({ success: true }));
    }
    
    if (action === 'get_push_tokens_count') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({ success: false, error: "Sai PIN" }));
      var count = Math.max(0, sheetTokens.getLastRow() - 1);
      return output.setContent(JSON.stringify({ success: true, count: count }));
    }
    
    if (action === 'send_push_now') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({ success: false, error: "Sai PIN" }));
      var title = e.parameter.title;
      var body = e.parameter.body;
      var url = e.parameter.url || "";
      var result = sendPushToAll(title, body, url);
      return output.setContent(JSON.stringify(result));
    }
    
    if (action === 'schedule_push') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({ success: false, error: "Sai PIN" }));
      var title = e.parameter.title;
      var body = e.parameter.body;
      var url = e.parameter.url || "";
      var timeStr = e.parameter.time; // Định dạng ISO: YYYY-MM-DDTHH:MM:SS.mmmZ
      
      if (!title || !body || !timeStr) {
        return output.setContent(JSON.stringify({ success: false, error: "Nhập thiếu tiêu đề, nội dung hoặc thời gian." }));
      }
      
      var pushId = "PUSH" + Date.now();
      sheetScheduled.appendRow([pushId, title, body, url, timeStr, "PENDING", new Date().toISOString()]);
      return output.setContent(JSON.stringify({ success: true }));
    }
    
    if (action === 'get_scheduled_pushes') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({ success: false, error: "Sai PIN" }));
      var data = sheetScheduled.getDataRange().getValues();
      var list = [];
      for (var i = 1; i < data.length; i++) {
        list.push({
          row: i + 1,
          id: data[i][0],
          title: data[i][1],
          body: data[i][2],
          url: data[i][3],
          time: data[i][4],
          status: data[i][5],
          createdAt: data[i][6]
        });
      }
      return output.setContent(JSON.stringify({ success: true, data: list.reverse() }));
    }
    
    if (action === 'delete_scheduled_push') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({ success: false, error: "Sai PIN" }));
      var row = parseInt(e.parameter.row);
      if (row > 1 && row <= sheetScheduled.getLastRow()) {
        sheetScheduled.deleteRow(row);
        return output.setContent(JSON.stringify({ success: true }));
      }
      return output.setContent(JSON.stringify({ success: false, error: "Dòng không hợp lệ." }));
    }

    // =========================================================
    // LỆNH MỚI: KIỂM TRA MÃ GIẢM GIÁ (COUPON)
    // =========================================================
    if (action === 'check_coupon') {
      var codeInput = e.parameter.code ? String(e.parameter.code).trim().toUpperCase() : "";
      if (!codeInput) return output.setContent(JSON.stringify({ success: false, error: "Vui lòng nhập mã" }));

      var couponData = sheetCoupons.getDataRange().getValues();
      for (var i = 1; i < couponData.length; i++) {
        if (String(couponData[i][0]).trim().toUpperCase() === codeInput) {
          if (String(couponData[i][3]).trim().toUpperCase() !== "ACTIVE") {
            return output.setContent(JSON.stringify({ success: false, error: "Mã giảm giá đã hết hạn hoặc bị tắt" }));
          }
          return output.setContent(JSON.stringify({
            success: true,
            code: couponData[i][0],
            type: couponData[i][1], // PERCENT hoặc CASH
            value: parseFloat(couponData[i][2]) || 0,
            desc: couponData[i][4]
          }));
        }
      }
      return output.setContent(JSON.stringify({ success: false, error: "Mã giảm giá không tồn tại" }));
    }

    // =========================================================
    // HỆ THỐNG BẢO TRÌ & ADMIN BYPASS
    // =========================================================
    if (action === 'check_maintenance') {
      var isMaintenance = false;
      if (sheetConfigMMO) {
        var dataCfg = sheetConfigMMO.getDataRange().getValues();
        for (var i = 1; i < dataCfg.length; i++) {
          if (String(dataCfg[i][0]) === 'SYSTEM___MAINTENANCE') {
            isMaintenance = (String(dataCfg[i][4]).toUpperCase() === "TRUE");
            break;
          }
        }
      }
      if (e.parameter.pin && String(e.parameter.pin) === String(SECRET_ADMIN_PASS)) {
        isMaintenance = false;
      }
      return output.setContent(JSON.stringify({ maintenance: isMaintenance }));
    }

    if (action === 'get_ipa_data') { 
      return output.setContent(UrlFetchApp.fetch('https://raw.githubusercontent.com/apptesters-org/AppTesters_Repo/main/apps.json', { "muteHttpExceptions": true }).getContentText()); 
    }
    
    if (action === 'create_order') {
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
        sheetThuNgan.appendRow([e.parameter.orderId, e.parameter.uid, parseInt(e.parameter.amount), parseInt(e.parameter.amount), "PENDING", new Date().toISOString()]);
        return output.setContent(JSON.stringify({success: true}));
      } finally { lock.releaseLock(); }
    }

    if (action === 'check_stc_payment') {
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
        var orderId = String(e.parameter.orderId).trim().toUpperCase(); 
        var dataSheet = sheetThuNgan.getDataRange().getValues();
        var isPending = false; 
        var rowToUpdate = -1;
        
        for (var row = 1; row < dataSheet.length; row++) {
          if (String(dataSheet[row][0]).trim().toUpperCase() === orderId) {
            if (dataSheet[row][4] === "CLAIMED") return output.setContent(JSON.stringify({success: true, amount: dataSheet[row][2]}));
            if (dataSheet[row][4] === "PENDING") { isPending = true; rowToUpdate = row + 1; break; }
          }
        }
        if (!isPending) return output.setContent(JSON.stringify({success: false, error: "Đơn không tồn tại hoặc đã xử lý"}));
        
        var resApi = UrlFetchApp.fetch("https://api.sieuthicode.net/v1/transactions/list", { 
          "headers": { "Authorization": "Bearer " + STC_TOKEN },
          "muteHttpExceptions": true
        });
        
        if(resApi.getResponseCode() === 200) {
          var res = JSON.parse(resApi.getContentText());
          if (res.status === "success") {
            for (var i = 0; i < res.transactions.length; i++) {
              var tx = res.transactions[i];
              if (tx.type === "IN" && tx.description.toUpperCase().includes(orderId)) {
                var realAmount = parseInt(tx.amount);
                sheetThuNgan.getRange(rowToUpdate, 3, 1, 3).setValues([[realAmount, realAmount, "CLAIMED"]]);
                sendTelegramMsg("💰 *NẠP TIỀN VÍ!*\n💵 +" + realAmount.toLocaleString('vi-VN') + "đ\n💳 Mã: `" + orderId + "`");
                return output.setContent(JSON.stringify({success: true, amount: realAmount}));
              }
            }
          }
        }
        return output.setContent(JSON.stringify({success: false}));
      } catch (err) {
        return output.setContent(JSON.stringify({success: false, error: "Hệ thống bận, thử lại sau."}));
      } finally {
        lock.releaseLock();
      }
    }

    if (action === 'get_user_transactions') {
        if (!sheetThuNgan) return output.setContent(JSON.stringify({success: true, data: []}));
        var data = sheetThuNgan.getDataRange().getValues(); var result = [];
        for (var i = 1; i < data.length; i++) { if (String(data[i][1]) === String(e.parameter.uid)) result.push({ orderId: data[i][0], amount: data[i][2], status: data[i][4], time: data[i][5] }); }
        return output.setContent(JSON.stringify({success: true, data: result.reverse()}));
    }

    // ===================================================================
    // KÉO SẢN PHẨM: TỰ ĐỘNG TĂNG 23% GIÁ & GIỮ LẠI TRƯỜNG GIÁ GỐC CHO ADMIN
    // ===================================================================
    if (action === 'get_kingmmo_products') {
      try {
        var allScannedProducts = []; 
        var seenIds = {};
        
        var page = 1; var limit = 100; var hasMore = true; var maxPages = 5;

        while(hasMore && page <= maxPages) {
            var urlProducts = KINGMMO_BASE_URL + "/products/list?limit=" + limit + "&page=" + page; 
            var optionsFetch = {
              "method": "GET",
              "headers": {
                "X-API-Key": KINGMMO_API_KEY,
                "X-API-Secret": KINGMMO_API_SECRET
              },
              "muteHttpExceptions": true
            };

            var resApi = UrlFetchApp.fetch(urlProducts, optionsFetch);
            var kingMmoRaw;
            try { kingMmoRaw = JSON.parse(resApi.getContentText()); } catch(e) {
                return output.setContent(JSON.stringify({success: false, error: "Lỗi từ Server Mẹ: " + resApi.getContentText()}));
            }

            if (kingMmoRaw.success && kingMmoRaw.data && kingMmoRaw.data.products) {
                var products = kingMmoRaw.data.products;
                
                for (var i = 0; i < products.length; i++) {
                    var p = products[i];
                    var catName = (p.category && p.category.name) ? p.category.name : "Chưa phân loại";
                    
                    if (p.plans && Array.isArray(p.plans)) {
                        for (var j = 0; j < p.plans.length; j++) {
                            var plan = p.plans[j];
                            var planId = String(plan.id); 

                            if (!seenIds[planId]) {
                                seenIds[planId] = true;
                                
                                var displayName = p.name;
                                if (p.plans.length > 1 && plan.name) {
                                    displayName = p.name + " - " + plan.name;
                                }

                                // 1. Lấy giá gốc chuẩn từ API mẹ
                                var baseOriginalPrice = parseInt((plan.final_price !== undefined && plan.final_price !== null) ? plan.final_price : plan.price) || 0;
                                
                                // 2. TỰ ĐỘNG TĂNG 23% GIÁ BÁN TRÊN CỬA HÀNG
                                var autoMarkedUpPrice = Math.floor(baseOriginalPrice * 1.23);

                                var stock = 9999;
                                if (plan.stock_count !== undefined && plan.stock_count !== null) {
                                    stock = parseInt(plan.stock_count);
                                } else if (plan.in_stock === false) {
                                    stock = 0;
                                }

                                var planDesc = plan.description || p.description || "Sản phẩm chính hãng.";

                                allScannedProducts.push({ 
                                    id: planId, 
                                    name: String(displayName), 
                                    price: autoMarkedUpPrice,        // Giá đã cộng thêm 23% cho khách
                                    originalPrice: baseOriginalPrice, // GIỮ NGUYÊN GIÁ GỐC TRẢ VỀ ADMIN
                                    stock: stock, 
                                    cat: String(catName), 
                                    desc: String(planDesc) 
                                });
                            }
                        }
                    }
                }
                if (kingMmoRaw.data.pagination && kingMmoRaw.data.pagination.has_more) { page++; } else { hasMore = false; }
            } else {
                hasMore = false;
                if(page === 1) return output.setContent(JSON.stringify({success: false, error: kingMmoRaw.message || "Lỗi API Server Mẹ"}));
            }
        }

        // XỬ LÝ CONFIG TỪ ADMIN
        var configs = {}; var customProducts = []; 
        if (sheetConfigMMO) {
            var confData = sheetConfigMMO.getDataRange().getValues();
            for(var i = 1; i < confData.length; i++) {
                var cId = String(confData[i][0]);
                var isHidden = confData[i][4] === true || String(confData[i][4]).toUpperCase() === "TRUE";
                var cCat = confData[i][6] || ""; 
                var cStock = confData[i][7];
                var rawDesc = confData[i][8];
                var safeDesc = Object.prototype.toString.call(rawDesc) === '[object Date]' ? rawDesc.toISOString() : String(rawDesc || "");

                configs[cId] = { price: confData[i][1], fakePrice: confData[i][2], icon: confData[i][3], isHidden: isHidden, name: confData[i][5] || "", cat: cCat, stock: cStock, desc: safeDesc };
                
                if (cId.indexOf('CUSTOM_') === 0) {
                    var parsedStock = (cStock !== "" && cStock !== undefined) ? parseInt(cStock) : 9999;
                    if(isNaN(parsedStock)) parsedStock = 0;
                    customProducts.push({ id: cId, name: confData[i][5] || 'SP Thủ Công', cat: cCat || 'Khác', price: parseInt(confData[i][1]) || 0, fakePrice: parseInt(confData[i][2]) || 0, icon: confData[i][3], isHidden: isHidden, stock: parsedStock, desc: safeDesc, isCustom: true });
                }
            }
        }
        return output.setContent(JSON.stringify({ success: true, kingmmoProducts: allScannedProducts, configs: configs, customProducts: customProducts }));
      } catch (error) { return output.setContent(JSON.stringify({success: false, error: error.message})); }
    }

    if (action === 'buy_cert_pending') {
      if (!sheetCertApple) return output.setContent(JSON.stringify({success: false, error: "Lỗi khởi tạo Sheet CERTAPPLE"}));
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(12000);
        var orderId = "CERT" + Date.now();
        var amount = parseInt(e.parameter.amount || 1);
        var pId = String(e.parameter.productId);
        var clientPrice = parseInt(e.parameter.price) || 0;
        var finalPrice = clientPrice; 
        var udid = e.parameter.udid ? String(e.parameter.udid).trim() : "Chưa cung cấp";

        if (sheetConfigMMO) {
            var dataCfg = sheetConfigMMO.getDataRange().getValues();
            for (var i = 1; i < dataCfg.length; i++) {
                if (String(dataCfg[i][0]) === pId) {
                    var serverPrice = parseInt(dataCfg[i][1]);
                    if (!isNaN(serverPrice)) { finalPrice = serverPrice * amount; }
                    var currentStock = dataCfg[i][7];
                    if (currentStock !== "" && !isNaN(currentStock)) {
                        var newStock = Math.max(0, parseInt(currentStock) - amount);
                        sheetConfigMMO.getRange(i + 1, 8).setValue(newStock); 
                    }
                    break;
                }
            }
        }
        sheetCertApple.appendRow([orderId, e.parameter.uid, pId, amount, "PENDING", udid, new Date().toISOString(), e.parameter.productName, finalPrice, "PENDING_PAYMENT"]);
        var teleMsg = "🛒 *KHÁCH VỪA MUA CHỨNG CHỈ*\n📦 SP: *" + e.parameter.productName + "*\n📱 UDID: `" + udid + "`\n💰 Giá trị: " + finalPrice.toLocaleString('vi-VN') + "đ\n💳 Đơn: `" + orderId + "`";
        sendTelegramMsg(teleMsg);
        return output.setContent(JSON.stringify({success: true, orderId: orderId}));
      } catch(err) { return output.setContent(JSON.stringify({success: false, error: "Lỗi tạo đơn: " + err.message})); } finally { lock.releaseLock(); }
    }

    if (action === 'buy_mmo_pending') {
      if (!sheetDonMMO) return output.setContent(JSON.stringify({success: false, error: "Chưa tạo Sheet DonMMO"}));
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(12000);
        var orderId = "MMO" + Date.now();
        var amount = parseInt(e.parameter.amount || 1);
        var pId = String(e.parameter.productId);
        var clientPrice = parseInt(e.parameter.price) || 0;
        var finalPrice = clientPrice; 

        if (sheetConfigMMO) {
            var dataCfg = sheetConfigMMO.getDataRange().getValues();
            for (var i = 1; i < dataCfg.length; i++) {
                if (String(dataCfg[i][0]) === pId) {
                    var serverPrice = parseInt(dataCfg[i][1]);
                    if (!isNaN(serverPrice)) { finalPrice = serverPrice * amount; }
                    var currentStock = dataCfg[i][7];
                    if (currentStock !== "" && !isNaN(currentStock)) {
                        var newStock = Math.max(0, parseInt(currentStock) - amount);
                        sheetConfigMMO.getRange(i + 1, 8).setValue(newStock); 
                    }
                    break;
                }
            }
        }
        sheetDonMMO.appendRow([orderId, e.parameter.uid, pId, amount, "PENDING", "", new Date().toISOString(), e.parameter.productName, finalPrice, "PAID"]);
        sendTelegramMsg("🛒 *KHÁCH VỪA MUA MALL*\n📦 SP: " + e.parameter.productName + "\n💳 Đơn: `" + orderId + "`\n💰 Giá trị: " + finalPrice.toLocaleString() + "đ");
        return output.setContent(JSON.stringify({success: true, orderId: orderId}));
      } catch(err) { return output.setContent(JSON.stringify({success: false, error: "Lỗi tạo đơn: " + err.message})); } finally { lock.releaseLock(); }
    }

    if (action === 'get_user_mmo_orders') {
      if (!sheetDonMMO) return output.setContent(JSON.stringify({success: true, data: []}));
      var data = sheetDonMMO.getDataRange().getValues(); var result = [];
      for(var i = 1; i < data.length; i++) { if(String(data[i][1]) === String(e.parameter.uid)) result.push({ orderId: data[i][0], productId: data[i][2], amount: data[i][3], status: data[i][4], accountData: data[i][5], time: data[i][6], productName: data[i][7], isPaid: data[i][9] === "PAID" }); }
      return output.setContent(JSON.stringify({success: true, data: result.reverse()}));
    }

    if (action === 'admin_get_all_mmo_orders') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({success: false, error: "Sai PIN"}));
      if (!sheetDonMMO) return output.setContent(JSON.stringify({success: true, data: []}));
      var data = sheetDonMMO.getDataRange().getValues(); var allOrders = [];
      for(var i = 1; i < data.length; i++) { allOrders.push({ row: i + 1, orderId: data[i][0], uid: data[i][1], productId: data[i][2], amount: data[i][3], status: data[i][4], accountData: data[i][5], time: data[i][6], productName: data[i][7], price: data[i][8], isPaid: data[i][9] === "PAID" }); }
      return output.setContent(JSON.stringify({success: true, data: allOrders.reverse()}));
    }

    if (action === 'admin_fulfill_kingmmo') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({success: false, error: "Sai PIN"}));
      var rowToUpdate = parseInt(e.parameter.row);
      try {
        var urlBuy = KINGMMO_BASE_URL + "/orders/create"; 
        var payloadData = {
          "items": [
            { "plan_id": parseInt(e.parameter.productId), "quantity": parseInt(e.parameter.amount) }
          ]
        };
        var optionsBuy = {
          "method": "POST",
          "headers": {
            "X-API-Key": KINGMMO_API_KEY,
            "X-API-Secret": KINGMMO_API_SECRET,
            "Content-Type": "application/json"
          },
          "payload": JSON.stringify(payloadData),
          "muteHttpExceptions": true 
        };
        var res = UrlFetchApp.fetch(urlBuy, optionsBuy);
        var json = JSON.parse(res.getContentText());
        if (json.success === true) {
          var accountInfo = "Tạo đơn API V1 Thành Công!\n(Trans ID: " + json.data.orders[0].trans_id + ")";
          sheetDonMMO.getRange(rowToUpdate, 5, 1, 2).setValues([["COMPLETED", accountInfo]]); 
          return output.setContent(JSON.stringify({success: true}));
        } else { return output.setContent(JSON.stringify({success: false, error: json.message || "Lỗi giao dịch API"})); }
      } catch (err) { return output.setContent(JSON.stringify({success: false, error: "Lỗi kết nối API Server: " + err.message})); }
    }

    if (action === 'verify_pin') return output.setContent(JSON.stringify({success: String(e.parameter.pin) === String(SECRET_ADMIN_PASS)}));
    if (action === 'get_admin_data') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({success: false, error: "Từ chối"}));
      return output.setContent(JSON.stringify({success: true, dataThuNgan: sheetThuNgan ? sheetThuNgan.getDataRange().getValues() : []}));
    }
    return output.setContent(JSON.stringify({error: "Lệnh GET không hợp lệ!"}));
  } catch (err) { return output.setContent(JSON.stringify({success: false, error: err.toString()})); }
}

function doPost(e) {
  var output = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  try {
    if (e.parameter && e.parameter.action) {
        if (e.parameter.action === 'admin_save_mmo_config') {
          if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({success: false, error: "Sai PIN"}));
          var lock = LockService.getScriptLock();
          try {
            lock.waitLock(10000);
            var ss = SpreadsheetApp.getActiveSpreadsheet(); 
            var sheetConfigMMO = ss.getSheetByName("ConfigMMO"); 
            if (!sheetConfigMMO) { sheetConfigMMO = ss.insertSheet("ConfigMMO"); }
            
            var configPayload = JSON.parse(e.parameter.configs); 
            sheetConfigMMO.clear(); 
            sheetConfigMMO.appendRow(["ProductId", "Price", "FakePrice", "IconUrl", "isHidden", "Name", "Category", "Stock", "Description"]);
            var newRows = [];
            for(var i=0; i<configPayload.length; i++) { 
                var c = configPayload[i]; 
                newRows.push([c.id, c.price, c.fakePrice, c.icon, c.isHidden, c.name || "", c.cat || "", c.stock, c.desc || ""]); 
            }
            if(newRows.length > 0) sheetConfigMMO.getRange(2, 1, newRows.length, 9).setValues(newRows);
            return output.setContent(JSON.stringify({success: true, message: "Đã lưu cấu hình!"}));
          } finally { lock.releaseLock(); }
        }

        if (e.parameter.action === 'admin_manual_fulfill') {
          if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({success: false, error: "Sai PIN"}));
          var ss = SpreadsheetApp.getActiveSpreadsheet(); var sheetDonMMO = ss.getSheetByName("DonMMO"); 
          var row = parseInt(e.parameter.row); var accData = e.parameter.accountData;
          sheetDonMMO.getRange(row, 5, 1, 2).setValues([["COMPLETED", accData]]);
          return output.setContent(JSON.stringify({success: true}));
        }

        if (e.parameter.action === 'admin_delete_mmo_order') {
          if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({success: false, error: "Sai PIN"}));
          var lock = LockService.getScriptLock();
          try {
            lock.waitLock(10000);
            var ss = SpreadsheetApp.getActiveSpreadsheet(); var sheetDonMMO = ss.getSheetByName("DonMMO"); 
            var row = parseInt(e.parameter.row); sheetDonMMO.deleteRow(row);
            return output.setContent(JSON.stringify({success: true}));
          } finally { lock.releaseLock(); }
        }
    }
    return output.setContent(JSON.stringify({"status": "success"}));
  } catch (err) { return output.setContent(JSON.stringify({"status": "error", "message": err.message})); }
}
